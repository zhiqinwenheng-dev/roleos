import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { randomBytes, timingSafeEqual } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("community.db");
db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");
db.pragma("temp_store = MEMORY");

// Initialize database
// Includes indexes for faster reads under traffic.
db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT NOT NULL,
    category TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    status TEXT DEFAULT 'open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    author TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts (id)
  );

  CREATE TABLE IF NOT EXISTS site_content (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    content_json TEXT NOT NULL DEFAULT '{}',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS page_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL,
    ip TEXT,
    user_agent TEXT,
    referrer TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS download_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    item_id TEXT NOT NULL,
    source_path TEXT,
    ip TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_comments_post_id_created_at ON comments(post_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(path);
  CREATE INDEX IF NOT EXISTS idx_download_events_created_at ON download_events(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_download_events_kind_item ON download_events(kind, item_id);
`);

db.exec(`
  INSERT INTO site_content (id, content_json)
  SELECT 1, '{}'
  WHERE NOT EXISTS (SELECT 1 FROM site_content WHERE id = 1);
`);

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "roleos-admin";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24;
const adminSessions = new Map<string, number>();

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const translationCache = new Map<string, string>();

const ALLOWED_POST_CATEGORIES = new Set(["general", "qa", "custom"]);
const ALLOWED_POST_STATUS = new Set(["open", "in_progress", "resolved"]);

type RateLimitConfig = {
  id: string;
  windowMs: number;
  max: number;
  keyFn?: (req: express.Request) => string;
};

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

const createRateLimiter = (config: RateLimitConfig): express.RequestHandler => {
  return (req, res, next) => {
    const now = Date.now();
    const keyPart = config.keyFn ? config.keyFn(req) : getClientIp(req);
    const bucketKey = `${config.id}:${keyPart}`;
    const existing = rateBuckets.get(bucketKey);

    if (!existing || existing.resetAt <= now) {
      rateBuckets.set(bucketKey, { count: 1, resetAt: now + config.windowMs });
      next();
      return;
    }

    existing.count += 1;
    if (existing.count > config.max) {
      res.status(429).json({
        error: "Too many requests. Please try again later.",
      });
      return;
    }

    next();
  };
};

const getClientIp = (req: express.Request) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0];
  }
  return req.socket.remoteAddress || "";
};

const safeParseJson = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

const parseCookie = (cookieHeader: string | undefined) => {
  if (!cookieHeader) {
    return {};
  }
  return cookieHeader.split(";").reduce<Record<string, string>>((acc, pair) => {
    const [rawKey, ...rest] = pair.trim().split("=");
    if (!rawKey) {
      return acc;
    }
    acc[rawKey] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
};

const isPasswordMatch = (input: string) => {
  const inputBuffer = Buffer.from(input);
  const passwordBuffer = Buffer.from(ADMIN_PASSWORD);
  if (inputBuffer.length !== passwordBuffer.length) {
    return false;
  }
  return timingSafeEqual(inputBuffer, passwordBuffer);
};

const normalizeSingleLine = (value: unknown, maxLen: number) => {
  if (typeof value !== "string") {
    return "";
  }
  return value.replace(/\s+/g, " ").trim().slice(0, maxLen);
};

const normalizeMultiLine = (value: unknown, maxLen: number) => {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, maxLen);
};

const parsePositiveInt = (value: string) => {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    return null;
  }
  return num;
};

const isSameOriginRequest = (req: express.Request) => {
  const origin = req.headers.origin;
  if (!origin) {
    return true;
  }
  const host = req.headers.host;
  if (!host) {
    return false;
  }
  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
};

const requireSameOrigin: express.RequestHandler = (req, res, next) => {
  if (!isSameOriginRequest(req)) {
    res.status(403).json({ error: "Forbidden origin" });
    return;
  }
  next();
};

const fetchWithTimeout = async (url: string, init: RequestInit, timeoutMs = 15000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

const translateWithDeepSeek = async (
  text: string,
  sourceLang: string,
  targetLang: string,
  context: string,
) => {
  const payload = {
    model: DEEPSEEK_MODEL,
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "You are a professional website localization editor. Keep brand terms unchanged: RoleOS, OpenClaw, Role Kit, Role Team. Return translation only, no quotes and no explanations.",
      },
      {
        role: "user",
        content: `Translate from ${sourceLang} to ${targetLang}. Context: ${context}\n\nText:\n${text}`,
      },
    ],
  };

  const response = await fetchWithTimeout(`${DEEPSEEK_BASE_URL.replace(/\/+$/, "")}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (data && (data.error?.message || data.error || data.message)) ||
      `DeepSeek request failed with status ${response.status}`;
    throw new Error(String(message));
  }

  const translatedText = String(data?.choices?.[0]?.message?.content || "").trim();
  if (!translatedText) {
    throw new Error("Empty translation result from DeepSeek");
  }
  return translatedText;
};

const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [token, expireAt] of adminSessions.entries()) {
    if (expireAt <= now) {
      adminSessions.delete(token);
    }
  }
  for (const [key, bucket] of rateBuckets.entries()) {
    if (bucket.resetAt <= now) {
      rateBuckets.delete(key);
    }
  }
}, 60_000);
cleanupInterval.unref();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer });

  app.disable("x-powered-by");
  app.set("trust proxy", true);

  app.use(express.json({ limit: "256kb" }));

  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; connect-src 'self' ws: wss: https://api.deepseek.com; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; font-src 'self' data:; frame-ancestors 'none';",
    );
    next();
  });

  app.use("/api", (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  const broadcast = (data: unknown) => {
    const payload = JSON.stringify(data);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  };

  const requireAdminAuth: express.RequestHandler = (req, res, next) => {
    const cookies = parseCookie(req.headers.cookie);
    const token = cookies.roleos_admin_token;
    if (!token) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const expireAt = adminSessions.get(token);
    if (!expireAt || expireAt < Date.now()) {
      adminSessions.delete(token);
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    adminSessions.set(token, Date.now() + SESSION_TTL_MS);
    next();
  };

  const loginLimiter = createRateLimiter({ id: "admin-login", windowMs: 60_000, max: 10 });
  const translateLimiter = createRateLimiter({ id: "admin-translate", windowMs: 60_000, max: 40 });
  const communityWriteLimiter = createRateLimiter({ id: "community-write", windowMs: 60_000, max: 20 });
  const likeLimiter = createRateLimiter({ id: "community-like", windowMs: 30_000, max: 50 });
  const trackLimiter = createRateLimiter({ id: "tracking", windowMs: 60_000, max: 240 });

  const selectPostWithCounts = db.prepare(`
    SELECT
      p.id,
      p.title,
      p.content,
      p.author,
      p.category,
      p.likes,
      p.status,
      p.created_at,
      COUNT(c.id) AS comment_count
    FROM posts p
    LEFT JOIN comments c ON c.post_id = p.id
    WHERE p.id = ?
    GROUP BY p.id
  `);

  // Admin auth routes
  app.post("/api/admin/login", requireSameOrigin, loginLimiter, (req, res) => {
    const password = normalizeSingleLine(req.body?.password, 256);
    if (!password || !isPasswordMatch(password)) {
      res.status(401).json({ error: "Invalid password" });
      return;
    }

    const token = randomBytes(24).toString("hex");
    adminSessions.set(token, Date.now() + SESSION_TTL_MS);
    const isSecure = req.secure || req.headers["x-forwarded-proto"] === "https";
    res.setHeader(
      "Set-Cookie",
      `roleos_admin_token=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${Math.floor(
        SESSION_TTL_MS / 1000,
      )}${isSecure ? "; Secure" : ""}`,
    );

    res.json({ ok: true });
  });

  app.get("/api/admin/session", (req, res) => {
    const cookies = parseCookie(req.headers.cookie);
    const token = cookies.roleos_admin_token;
    const expireAt = token ? adminSessions.get(token) : 0;
    const authenticated = Boolean(expireAt && expireAt > Date.now());
    res.json({ authenticated });
  });

  app.post("/api/admin/logout", requireSameOrigin, (req, res) => {
    const cookies = parseCookie(req.headers.cookie);
    const token = cookies.roleos_admin_token;
    if (token) {
      adminSessions.delete(token);
    }

    const isSecure = req.secure || req.headers["x-forwarded-proto"] === "https";
    res.setHeader(
      "Set-Cookie",
      `roleos_admin_token=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0${isSecure ? "; Secure" : ""}`,
    );
    res.json({ ok: true });
  });

  // Community routes
  app.get("/api/posts", (req, res) => {
    const limit = Math.max(1, Math.min(500, Number(req.query.limit) || 200));
    const posts = db
      .prepare(
        `
      SELECT
        p.id,
        p.title,
        p.content,
        p.author,
        p.category,
        p.likes,
        p.status,
        p.created_at,
        COUNT(c.id) AS comment_count
      FROM posts p
      LEFT JOIN comments c ON c.post_id = p.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT ?
    `,
      )
      .all(limit);
    res.json(posts);
  });

  app.post("/api/posts", requireSameOrigin, communityWriteLimiter, (req, res) => {
    const title = normalizeSingleLine(req.body?.title, 120);
    const content = normalizeMultiLine(req.body?.content, 5000);
    const author = normalizeSingleLine(req.body?.author, 60);
    const category = normalizeSingleLine(req.body?.category, 20).toLowerCase() || "general";

    if (!title || !content || !author) {
      res.status(400).json({ error: "title, content, author are required" });
      return;
    }
    if (!ALLOWED_POST_CATEGORIES.has(category)) {
      res.status(400).json({ error: "Invalid category" });
      return;
    }

    const info = db
      .prepare("INSERT INTO posts (title, content, author, category) VALUES (?, ?, ?, ?)")
      .run(title, content, author, category);

    const newPost = selectPostWithCounts.get(info.lastInsertRowid);
    broadcast({ type: "NEW_POST", post: newPost });
    res.status(201).json(newPost);
  });

  app.post("/api/posts/:id/like", requireSameOrigin, likeLimiter, (req, res) => {
    const postId = parsePositiveInt(req.params.id);
    if (!postId) {
      res.status(400).json({ error: "Invalid post id" });
      return;
    }

    const update = db.prepare("UPDATE posts SET likes = likes + 1 WHERE id = ?").run(postId);
    if (update.changes === 0) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    const post = selectPostWithCounts.get(postId);
    broadcast({ type: "POST_UPDATED", post });
    res.json(post);
  });

  app.post("/api/posts/:id/status", requireSameOrigin, communityWriteLimiter, (req, res) => {
    const postId = parsePositiveInt(req.params.id);
    const status = normalizeSingleLine(req.body?.status, 20).toLowerCase();

    if (!postId) {
      res.status(400).json({ error: "Invalid post id" });
      return;
    }
    if (!ALLOWED_POST_STATUS.has(status)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }

    const update = db.prepare("UPDATE posts SET status = ? WHERE id = ?").run(status, postId);
    if (update.changes === 0) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    const post = selectPostWithCounts.get(postId);
    broadcast({ type: "POST_UPDATED", post });
    res.json(post);
  });

  app.get("/api/posts/:id/comments", (req, res) => {
    const postId = parsePositiveInt(req.params.id);
    if (!postId) {
      res.status(400).json({ error: "Invalid post id" });
      return;
    }

    const comments = db
      .prepare("SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC")
      .all(postId);
    res.json(comments);
  });

  app.post("/api/posts/:id/comments", requireSameOrigin, communityWriteLimiter, (req, res) => {
    const postId = parsePositiveInt(req.params.id);
    const content = normalizeMultiLine(req.body?.content, 2000);
    const author = normalizeSingleLine(req.body?.author, 60);

    if (!postId) {
      res.status(400).json({ error: "Invalid post id" });
      return;
    }
    if (!content || !author) {
      res.status(400).json({ error: "content and author are required" });
      return;
    }

    const postExists = db.prepare("SELECT 1 FROM posts WHERE id = ?").get(postId);
    if (!postExists) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    db.prepare("INSERT INTO comments (post_id, content, author) VALUES (?, ?, ?)").run(postId, content, author);

    const comments = db
      .prepare("SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC")
      .all(postId);

    const updatedPost = selectPostWithCounts.get(postId);
    broadcast({ type: "NEW_COMMENT", postId, comments });
    broadcast({ type: "POST_UPDATED", post: updatedPost });

    res.status(201).json(comments);
  });

  // Tracking routes
  app.post("/api/track/pageview", trackLimiter, (req, res) => {
    const pagePath = normalizeSingleLine(req.body?.path, 512);
    if (!pagePath) {
      res.status(400).json({ error: "Invalid path" });
      return;
    }

    db.prepare("INSERT INTO page_views (path, ip, user_agent, referrer) VALUES (?, ?, ?, ?)").run(
      pagePath,
      getClientIp(req),
      normalizeSingleLine(req.headers["user-agent"], 512),
      normalizeSingleLine(req.headers.referer, 512),
    );

    res.json({ ok: true });
  });

  app.post("/api/track/download", trackLimiter, (req, res) => {
    const kind = normalizeSingleLine(req.body?.kind, 50);
    const itemId = normalizeSingleLine(req.body?.itemId, 120);
    const sourcePath = normalizeSingleLine(req.body?.sourcePath, 512);

    if (!kind || !itemId) {
      res.status(400).json({ error: "Invalid download payload" });
      return;
    }

    db.prepare(
      "INSERT INTO download_events (kind, item_id, source_path, ip, user_agent) VALUES (?, ?, ?, ?, ?)",
    ).run(kind, itemId, sourcePath, getClientIp(req), normalizeSingleLine(req.headers["user-agent"], 512));

    res.json({ ok: true });
  });

  // Content routes
  app.get("/api/content", (req, res) => {
    const row = db.prepare("SELECT content_json, updated_at FROM site_content WHERE id = 1").get() as
      | { content_json: string; updated_at: string }
      | undefined;

    res.json({
      overrides: safeParseJson(row?.content_json || "{}"),
      updatedAt: row?.updated_at || null,
    });
  });

  app.get("/api/admin/content", requireAdminAuth, (req, res) => {
    const row = db.prepare("SELECT content_json, updated_at FROM site_content WHERE id = 1").get() as
      | { content_json: string; updated_at: string }
      | undefined;

    res.json({
      overrides: safeParseJson(row?.content_json || "{}"),
      updatedAt: row?.updated_at || null,
    });
  });

  app.put("/api/admin/content", requireSameOrigin, requireAdminAuth, (req, res) => {
    const { overrides } = req.body || {};
    if (typeof overrides !== "object" || overrides === null || Array.isArray(overrides)) {
      res.status(400).json({ error: "overrides must be an object" });
      return;
    }

    db.prepare("UPDATE site_content SET content_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1").run(
      JSON.stringify(overrides),
    );

    res.json({ ok: true });
  });

  app.post("/api/admin/translate", requireSameOrigin, requireAdminAuth, translateLimiter, async (req, res) => {
    const sourceLang = normalizeSingleLine(req.body?.sourceLang || "zh", 10) || "zh";
    const targetLang = normalizeSingleLine(req.body?.targetLang || "en", 10) || "en";
    const context = normalizeSingleLine(req.body?.context || "RoleOS website UI copy", 200);
    const text = normalizeMultiLine(req.body?.text, 5000);

    if (!text) {
      res.json({ translatedText: "" });
      return;
    }

    if (!DEEPSEEK_API_KEY) {
      res.status(503).json({
        error: "Translation service is not configured. Set DEEPSEEK_API_KEY in deployment environment.",
      });
      return;
    }

    const cacheKey = `${sourceLang}=>${targetLang}::${text}`;
    const cachedValue = translationCache.get(cacheKey);
    if (cachedValue) {
      res.json({ translatedText: cachedValue, cached: true });
      return;
    }

    try {
      const translatedText = await translateWithDeepSeek(text, sourceLang, targetLang, context);
      translationCache.set(cacheKey, translatedText);
      res.json({ translatedText, cached: false });
    } catch (error) {
      console.error("DeepSeek translation failed:", error);
      res.status(500).json({ error: "Translation request failed" });
    }
  });

  // Admin analytics
  app.get("/api/admin/overview", requireAdminAuth, (req, res) => {
    const visitStats = db
      .prepare(`
      SELECT
        COUNT(*) AS totalVisits,
        COUNT(DISTINCT ip) AS uniqueIps,
        COALESCE(SUM(CASE WHEN date(created_at, 'localtime') = date('now', 'localtime') THEN 1 ELSE 0 END), 0) AS todayVisits
      FROM page_views
    `)
      .get() as { totalVisits: number; uniqueIps: number; todayVisits: number };

    const downloadStats = db
      .prepare(`
      SELECT
        COUNT(*) AS totalDownloads,
        COALESCE(SUM(CASE WHEN kind = 'kit' THEN 1 ELSE 0 END), 0) AS kitDownloads,
        COALESCE(SUM(CASE WHEN kind = 'team' THEN 1 ELSE 0 END), 0) AS teamDownloads
      FROM download_events
    `)
      .get() as { totalDownloads: number; kitDownloads: number; teamDownloads: number };

    const communityStats = db
      .prepare(`
      SELECT
        (SELECT COUNT(*) FROM posts) AS totalPosts,
        (SELECT COUNT(*) FROM comments) AS totalComments
    `)
      .get() as { totalPosts: number; totalComments: number };

    const topPaths = db
      .prepare(
        `
      SELECT path, COUNT(*) AS count
      FROM page_views
      GROUP BY path
      ORDER BY count DESC
      LIMIT 10
    `,
      )
      .all();

    const topDownloads = db
      .prepare(
        `
      SELECT kind, item_id, COUNT(*) AS count
      FROM download_events
      GROUP BY kind, item_id
      ORDER BY count DESC
      LIMIT 10
    `,
      )
      .all();

    res.json({
      overview: {
        totalVisits: visitStats?.totalVisits || 0,
        uniqueIps: visitStats?.uniqueIps || 0,
        todayVisits: visitStats?.todayVisits || 0,
        totalDownloads: downloadStats?.totalDownloads || 0,
        kitDownloads: downloadStats?.kitDownloads || 0,
        teamDownloads: downloadStats?.teamDownloads || 0,
        totalPosts: communityStats?.totalPosts || 0,
        totalComments: communityStats?.totalComments || 0,
        topPaths,
        topDownloads,
      },
    });
  });

  app.get("/api/admin/visits", requireAdminAuth, (req, res) => {
    const limit = Math.max(1, Math.min(500, Number(req.query.limit) || 100));
    const visits = db
      .prepare(
        `
      SELECT id, path, ip, user_agent, referrer, created_at
      FROM page_views
      ORDER BY created_at DESC
      LIMIT ?
    `,
      )
      .all(limit);

    res.json({ visits });
  });

  app.get("/api/admin/downloads", requireAdminAuth, (req, res) => {
    const limit = Math.max(1, Math.min(500, Number(req.query.limit) || 100));
    const downloads = db
      .prepare(
        `
      SELECT id, kind, item_id, source_path, ip, user_agent, created_at
      FROM download_events
      ORDER BY created_at DESC
      LIMIT ?
    `,
      )
      .all(limit);

    res.json({ downloads });
  });

  app.get("/api/admin/community", requireAdminAuth, (req, res) => {
    const limit = Math.max(1, Math.min(500, Number(req.query.limit) || 100));
    const posts = db
      .prepare(
        `
      SELECT
        p.id,
        p.title,
        p.author,
        p.category,
        p.likes,
        p.status,
        p.created_at,
        COUNT(c.id) AS comment_count
      FROM posts p
      LEFT JOIN comments c ON c.post_id = p.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT ?
    `,
      )
      .all(limit);

    res.json({ posts });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(
      express.static(path.join(__dirname, "dist"), {
        etag: true,
        maxAge: "1y",
        setHeaders: (res, filePath) => {
          if (filePath.endsWith("index.html")) {
            res.setHeader("Cache-Control", "no-cache");
            return;
          }
          if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
            return;
          }
          res.setHeader("Cache-Control", "public, max-age=3600");
        },
      }),
    );

    app.get("*", (req, res) => {
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
