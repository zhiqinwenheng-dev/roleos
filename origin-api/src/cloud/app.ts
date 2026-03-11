import { randomUUID } from "node:crypto";
import { existsSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { nowIso } from "../utils/time.js";
import { hashPassword, signToken, verifyPassword, verifyToken } from "./auth.js";
import { FeishuChannel } from "./feishuChannel.js";
import type { AppContext } from "../bootstrap/context.js";
import {
  createRateLimiter,
  requestIdMiddleware,
  requestLogMiddleware
} from "./middleware.js";
import { computeIncrementalVariableRevenue } from "./commercial.js";
import { createCloudStore } from "./storeFactory.js";
import { verifyWebhookSignature } from "./security.js";
import { CloudMetrics } from "./metrics.js";
import { renderPortalHtml } from "./portal.js";
import { sitePageRenderers } from "./sitePages.js";
import { loadMarketCatalog } from "../market/catalog.js";

interface AuthenticatedRequest extends Request {
  auth?: {
    userId: string;
    email: string;
  };
}

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  workspaceName: z.string().min(1).max(100).default("RoleOS Workspace")
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const runSchema = z.object({
  intent: z.string().min(1),
  teamId: z.string().optional()
});

const subscriptionSchema = z.object({
  planCode: z.string().min(1)
});

const paymentWebhookSchema = z.object({
  type: z.enum(["invoice.paid", "invoice.payment_failed", "subscription.updated"]),
  workspaceId: z.string().min(1),
  planCode: z.string().min(1).optional()
});

const checkoutSchema = z.object({
  planCode: z.string().min(1),
  billingMode: z.enum(["api_token", "compute_token"]).optional(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional()
});

const personalWebhookSchema = z.object({
  orderId: z.string().min(1),
  workspaceId: z.string().min(1),
  status: z.enum(["paid", "failed"]),
  planCode: z.string().min(1).optional(),
  providerTransactionId: z.string().optional()
});

const selfHostedCheckoutSchema = z.object({
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional()
});

const selfHostedConfigSchema = z.object({
  deploymentTarget: z
    .enum(["windows", "linux", "macos", "cloud-vm"])
    .default("linux"),
  modelApiKey: z.string().min(1),
  modelBaseUrl: z.string().url().optional(),
  openClawEndpoint: z.string().url(),
  openClawApiKey: z.string().optional(),
  feishuWebhookUrl: z.string().url().optional(),
  starterKitId: z.string().min(1).default("content-starter-kit")
});

const adminListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});

const adminEntitlementSchema = z.object({
  packageCode: z.string().min(1).default("rs-standard"),
  status: z.enum(["inactive", "active", "revoked"])
});

const adminSubscriptionSchema = z
  .object({
    planCode: z.string().min(1).optional(),
    status: z.enum(["active", "past_due", "paused", "canceled"]).optional()
  })
  .refine((value) => value.planCode || value.status, {
    message: "planCode or status is required."
  });

export interface CloudAppOptions {
  jwtSecret: string;
  feishuWebhookUrl?: string;
  adminApiKey?: string;
  paymentWebhookSecret?: string;
  personalGatewayBaseUrl?: string;
  defaultPlanCode?: string;
  authRateLimitPerMinute?: number;
  runRateLimitPerMinute?: number;
  storeProvider?: "sqlite" | "supabase";
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
  allowedOrigins?: string[];
  allowLegacyWebhookSecretHeader?: boolean;
}

function monthString(date = new Date()): string {
  return date.toISOString().slice(0, 7);
}

function unauthorized(res: Response, message = "Unauthorized"): void {
  res.status(401).json({
    ok: false,
    message
  });
}

function forbidden(res: Response, message = "Forbidden"): void {
  res.status(403).json({
    ok: false,
    message
  });
}

function paymentRequired(res: Response, message: string): void {
  res.status(402).json({
    ok: false,
    message
  });
}

function readWorkspaceId(req: Request, res: Response): string | undefined {
  const value = req.params.id;
  if (typeof value !== "string" || value.length === 0) {
    res.status(400).json({
      ok: false,
      message: "Workspace id is required."
    });
    return undefined;
  }
  return value;
}

function readMonth(queryMonth: unknown): string {
  if (typeof queryMonth !== "string" || queryMonth.length === 0) {
    return monthString();
  }
  if (!/^\d{4}-\d{2}$/.test(queryMonth)) {
    throw new Error("Month must use YYYY-MM format.");
  }
  return queryMonth;
}

function adminGuard(apiKey: string | undefined, req: Request, res: Response): boolean {
  if (!apiKey) {
    forbidden(res, "Admin API key is not configured.");
    return false;
  }
  const provided = req.headers["x-roleos-admin-key"];
  if (typeof provided !== "string" || provided !== apiKey) {
    forbidden(res, "Invalid admin API key.");
    return false;
  }
  return true;
}

function readRawBody(req: Request): Buffer {
  const raw = (req as RawBodyRequest).rawBody;
  if (raw && raw.length > 0) {
    return raw;
  }
  return Buffer.from(JSON.stringify(req.body ?? {}));
}

function webhookGuard(
  secret: string | undefined,
  allowLegacyHeader: boolean,
  req: Request,
  res: Response
): boolean {
  if (!secret) {
    forbidden(res, "Webhook secret is not configured.");
    return false;
  }

  const signature = req.headers["x-roleos-signature"];
  if (verifyWebhookSignature({ secret, payload: readRawBody(req), providedSignature: signature })) {
    return true;
  }

  if (allowLegacyHeader) {
    const provided = req.headers["x-roleos-webhook-secret"];
    if (typeof provided === "string" && provided === secret) {
      return true;
    }
  }

  forbidden(res, "Invalid webhook signature.");
  return false;
}

function buildCheckoutUrl(
  baseUrl: string,
  input: {
    orderId: string;
    workspaceId: string;
    planCode: string;
    amountUsd: number;
    successUrl?: string;
    cancelUrl?: string;
  }
): string {
  const params = new URLSearchParams({
    orderId: input.orderId,
    workspaceId: input.workspaceId,
    planCode: input.planCode,
    amountUsd: input.amountUsd.toFixed(2)
  });
  if (input.successUrl) {
    params.set("successUrl", input.successUrl);
  }
  if (input.cancelUrl) {
    params.set("cancelUrl", input.cancelUrl);
  }
  return `${baseUrl}?${params.toString()}`;
}

function applySecurityHeaders(res: Response): void {
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("x-frame-options", "DENY");
  res.setHeader("referrer-policy", "strict-origin-when-cross-origin");
  res.setHeader("strict-transport-security", "max-age=31536000; includeSubDomains; preload");
}

const SELF_HOSTED_PLAN_CODE = "rs-self-hosted";
const SELF_HOSTED_PACKAGE_CODE = "rs-standard";
const SELF_HOSTED_PRICE_USD = 199;

interface SelfHostedArtifact {
  id: string;
  name: string;
  relativePath: string;
  platform: "windows" | "linux" | "macos" | "all";
  kind: "installer" | "script" | "package";
  sizeBytes: number;
  updatedAt: string;
}

function inferArtifactPlatform(fileName: string): SelfHostedArtifact["platform"] {
  const lower = fileName.toLowerCase();
  if (lower.includes("win") || lower.endsWith(".exe") || lower.endsWith(".ps1")) {
    return "windows";
  }
  if (lower.includes("mac") || lower.includes("darwin")) {
    return "macos";
  }
  if (lower.includes("linux") || lower.endsWith(".sh")) {
    return "linux";
  }
  return "all";
}

function inferArtifactKind(fileName: string): SelfHostedArtifact["kind"] {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".sh") || lower.endsWith(".ps1")) {
    return "script";
  }
  if (lower.endsWith(".exe")) {
    return "installer";
  }
  return "package";
}

function buildSelfHostedArtifacts(workspaceRoot: string): SelfHostedArtifact[] {
  const candidates = [
    "release/roleos-win32-x64.exe",
    "release/roleos-win32-arm64.exe",
    "release/roleos-linux-x64",
    "release/roleos-linux-arm64",
    "release/roleos-darwin-arm64",
    "release/roleos-darwin-x64",
    "scripts/one-click-deploy.ps1",
    "scripts/one-click-deploy.sh"
  ];
  const results: SelfHostedArtifact[] = [];

  for (const relativePath of candidates) {
    const absolutePath = join(workspaceRoot, relativePath);
    if (!existsSync(absolutePath)) {
      continue;
    }
    const stat = statSync(absolutePath);
    if (!stat.isFile()) {
      continue;
    }
    const name = basename(relativePath);
    results.push({
      id: Buffer.from(relativePath, "utf8").toString("base64url"),
      name,
      relativePath,
      platform: inferArtifactPlatform(name),
      kind: inferArtifactKind(name),
      sizeBytes: stat.size,
      updatedAt: stat.mtime.toISOString()
    });
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}

function readPagination(query: unknown): { limit: number; offset: number } {
  const parsed = adminListQuerySchema.parse(query);
  return {
    limit: parsed.limit,
    offset: parsed.offset
  };
}

export function createCloudApp(context: AppContext, options: CloudAppOptions) {
  const app = express();
  app.disable("x-powered-by");
  app.use(
    express.json({
      limit: "256kb",
      verify: (req, _res, buffer) => {
        (req as RawBodyRequest).rawBody = Buffer.from(buffer);
      }
    })
  );
  app.use(requestIdMiddleware);
  app.use(requestLogMiddleware);
  const metrics = new CloudMetrics();
  const allowedOrigins = options.allowedOrigins ?? ["*"];
  app.use((req, res, next) => {
    applySecurityHeaders(res);
    const origin = req.headers.origin;
    if (allowedOrigins.includes("*")) {
      res.setHeader("access-control-allow-origin", "*");
    } else if (origin && allowedOrigins.includes(origin)) {
      res.setHeader("access-control-allow-origin", origin);
      res.setHeader("vary", "Origin");
    }
    res.setHeader("access-control-allow-methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader(
      "access-control-allow-headers",
      "Content-Type,Authorization,Idempotency-Key,x-roleos-admin-key,x-roleos-webhook-secret,x-roleos-signature"
    );
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });
  app.use((req, res, next) => {
    const startedAt = process.hrtime.bigint();
    res.on("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      metrics.recordHttpRequest(req.method, req.path, res.statusCode, durationMs);
    });
    next();
  });

  const store = createCloudStore({
    provider: options.storeProvider ?? "sqlite",
    dbPath: context.dbPath,
    supabaseUrl: options.supabaseUrl,
    supabaseServiceRoleKey: options.supabaseServiceRoleKey
  });
  const feishu = new FeishuChannel(options.feishuWebhookUrl);

  const authLimiter = createRateLimiter({
    windowMs: 60_000,
    maxRequests: options.authRateLimitPerMinute ?? 60
  });
  const runLimiter = createRateLimiter({
    windowMs: 60_000,
    maxRequests: options.runRateLimitPerMinute ?? 180
  });
  const defaultPlanCode = options.defaultPlanCode ?? "starter";
  const personalGatewayBaseUrl =
    options.personalGatewayBaseUrl ?? "https://payments.local/checkout";
  const selfHostedArtifacts = () => buildSelfHostedArtifacts(context.workspaceRoot);

  async function ensureRegistryReady(): Promise<void> {
    const syncResult = await context.registryService.sync();
    if (!syncResult.report.valid) {
      throw new Error(
        `Registry invalid: ${syncResult.report.issues
          .map((issue) => issue.message)
          .join("; ")}`
      );
    }
  }

  async function resolveWorkspaceAssets(workspaceId: string) {
    const state = await store.getWorkspaceState(workspaceId);
    if (!state) {
      throw new Error("Workspace state not found.");
    }

    const role = await context.registryService.getRole(state.defaultRoleId);
    const kit = await context.registryService.getKit(state.activeKitId);
    const team = await context.registryService.getTeam(state.defaultTeamId);
    if (!role || !kit || !team) {
      throw new Error("Workspace object mapping is invalid.");
    }
    return { state, role, kit, team };
  }

  function withAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      unauthorized(res);
      return;
    }
    const token = header.slice("Bearer ".length);
    try {
      const claims = verifyToken(token, options.jwtSecret);
      req.auth = {
        userId: claims.sub,
        email: claims.email
      };
      next();
    } catch {
      unauthorized(res, "Token is invalid or expired.");
    }
  }

  async function requireWorkspaceMembership(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const workspaceId = readWorkspaceId(req, res);
    if (!workspaceId) {
      return;
    }
    if (!req.auth) {
      unauthorized(res);
      return;
    }
    if (!(await store.isWorkspaceMember(workspaceId, req.auth.userId))) {
      forbidden(res, "Workspace access denied.");
      return;
    }
    next();
  }

  app.get("/healthz", (_req, res) => {
    res.json({
      ok: true,
      service: "roleos-cloud",
      timestamp: nowIso(),
      status: "ready"
    });
  });

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "roleos-cloud",
      timestamp: nowIso(),
      status: "ready"
    });
  });

  for (const [path, render] of Object.entries(sitePageRenderers)) {
    app.get(path, (_req, res) => {
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.send(render());
    });
  }

  app.get("/portal", (_req, res) => {
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.send(renderPortalHtml());
  });

  app.get("/market/catalog", async (_req, res) => {
    try {
      const catalog = await loadMarketCatalog(context.registryRoot);
      res.json({
        ok: true,
        catalog
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        message: error instanceof Error ? error.message : "Failed to load market catalog"
      });
    }
  });

  app.get("/metrics", (req, res) => {
    if (!adminGuard(options.adminApiKey, req, res)) {
      return;
    }
    res.setHeader("content-type", "text/plain; version=0.0.4; charset=utf-8");
    res.send(metrics.renderPrometheus());
  });

  app.get("/plans", async (_req, res) => {
    const plans = await store.listPlans();
    res.json({
      ok: true,
      plans: plans.filter((plan) => plan.isActive)
    });
  });

  app.post("/auth/register", authLimiter, async (req, res) => {
    try {
      await ensureRegistryReady();
      const payload = registerSchema.parse(req.body);
      if (await store.getUserByEmail(payload.email)) {
        res.status(409).json({
          ok: false,
          message: "User already exists."
        });
        return;
      }

      const user = await store.createUser(payload.email, hashPassword(payload.password));
      const workspace = await store.createWorkspace(payload.workspaceName);
      await store.addWorkspaceMember(workspace.id, user.id, "owner");

      const [role, kit, team] = await Promise.all([
        context.registryService.getDefaultRole(),
        context.registryService.getDefaultKit(),
        context.registryService.getDefaultTeam()
      ]);
      await store.setWorkspaceDefaults(workspace.id, {
        roleId: role.id,
        kitId: kit.id,
        teamId: team.id,
        modelPolicyName: kit.modelPolicy.name
      });
      const subscription = await store.ensureWorkspaceSubscription(
        workspace.id,
        defaultPlanCode
      );
      await store.addAuditEvent(workspace.id, "register", "Workspace created.");

      const token = signToken(
        {
          sub: user.id,
          email: user.email
        },
        options.jwtSecret
      );

      res.status(201).json({
        ok: true,
        token,
        user: {
          id: user.id,
          email: user.email
        },
        workspace,
        subscription
      });
    } catch (error) {
      res.status(400).json({
        ok: false,
        message: error instanceof Error ? error.message : "Invalid request"
      });
    }
  });

  app.post("/auth/login", authLimiter, async (req, res) => {
    try {
      const payload = loginSchema.parse(req.body);
      const user = await store.getUserByEmail(payload.email);
      if (!user || !verifyPassword(payload.password, user.passwordHash)) {
        res.status(401).json({
          ok: false,
          message: "Invalid email/password."
        });
        return;
      }
      const workspaces = await store.listWorkspacesForUser(user.id);
      const token = signToken(
        {
          sub: user.id,
          email: user.email
        },
        options.jwtSecret
      );
      res.json({
        ok: true,
        token,
        user: {
          id: user.id,
          email: user.email
        },
        workspaces
      });
    } catch (error) {
      res.status(400).json({
        ok: false,
        message: error instanceof Error ? error.message : "Invalid request"
      });
    }
  });

  app.get("/auth/me", withAuth, async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.auth) {
      unauthorized(res);
      return;
    }
    const user = await store.getUserById(authReq.auth.userId);
    if (!user) {
      unauthorized(res, "User not found.");
      return;
    }
    const workspaces = await store.listWorkspacesForUser(user.id);
    const workspaceStatuses = await Promise.all(
      workspaces.map(async (workspace) => {
        const [subscription, entitlement] = await Promise.all([
          store.getWorkspaceSubscription(workspace.id),
          store.getSelfHostedEntitlement(workspace.id)
        ]);
        return {
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          subscription: subscription
            ? {
                planCode: subscription.planCode,
                status: subscription.status
              }
            : null,
          selfHosted: entitlement
            ? {
                status: entitlement.status,
                packageCode: entitlement.packageCode
              }
            : null
        };
      })
    );

    res.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt
      },
      workspaces,
      workspaceStatuses
    });
  });

  app.get(
    "/workspaces/:id/roles",
    withAuth,
    requireWorkspaceMembership,
    async (req, res) => {
      try {
        const workspaceId = readWorkspaceId(req, res);
        if (!workspaceId) {
          return;
        }
        const state = await store.getWorkspaceState(workspaceId);
        if (!state) {
          res.status(404).json({
            ok: false,
            message: "Workspace state not found."
          });
          return;
        }

        const role = await context.registryService.getRole(state.defaultRoleId);
        if (!role) {
          res.status(404).json({
            ok: false,
            message: "Role not found in registry."
          });
          return;
        }

        res.json({
          ok: true,
          roles: [role]
        });
      } catch (error) {
        res.status(500).json({
          ok: false,
          message: error instanceof Error ? error.message : "Failed to load roles"
        });
      }
    }
  );

  app.get(
    "/workspaces/:id/dashboard",
    withAuth,
    requireWorkspaceMembership,
    async (req, res) => {
      try {
        const workspaceId = readWorkspaceId(req, res);
        if (!workspaceId) {
          return;
        }
        const month = readMonth(req.query.month);
        const workspace = await store.getWorkspace(workspaceId);
        if (!workspace) {
          res.status(404).json({
            ok: false,
            message: "Workspace not found."
          });
          return;
        }

        const [
          state,
          subscription,
          usage,
          entitlement,
          recentRuns,
          recentOrders,
          auditEvents
        ] = await Promise.all([
          store.getWorkspaceState(workspaceId),
          store.getWorkspaceSubscription(workspaceId),
          store.getMonthlyUsage(workspaceId, month),
          store.getSelfHostedEntitlement(workspaceId),
          store.listRunsForWorkspace(workspaceId, 20),
          store.listPaymentOrdersForWorkspace(workspaceId, 20),
          store.listAuditEvents(workspaceId, 30)
        ]);

        res.json({
          ok: true,
          workspace,
          state,
          subscription,
          usage,
          selfHostedEntitlement: entitlement ?? null,
          recentRuns,
          recentOrders,
          auditEvents
        });
      } catch (error) {
        res.status(400).json({
          ok: false,
          message: error instanceof Error ? error.message : "Failed to load dashboard"
        });
      }
    }
  );

  app.get(
    "/workspaces/:id/subscription",
    withAuth,
    requireWorkspaceMembership,
    async (req, res) => {
      const workspaceId = readWorkspaceId(req, res);
      if (!workspaceId) {
        return;
      }
      const subscription = await store.getWorkspaceSubscription(workspaceId);
      if (!subscription) {
        res.status(404).json({
          ok: false,
          message: "Subscription not found."
        });
        return;
      }
      res.json({
        ok: true,
        subscription
      });
    }
  );

  app.post(
    "/workspaces/:id/subscription",
    withAuth,
    requireWorkspaceMembership,
    async (req, res) => {
      try {
        const workspaceId = readWorkspaceId(req, res);
        if (!workspaceId) {
          return;
        }
        const payload = subscriptionSchema.parse(req.body);
        const subscription = await store.setWorkspaceSubscriptionPlan(
          workspaceId,
          payload.planCode
        );
        await store.addAuditEvent(
          workspaceId,
          "subscription_change",
          `Plan changed to ${payload.planCode}`
        );
        res.json({
          ok: true,
          subscription
        });
      } catch (error) {
        res.status(400).json({
          ok: false,
          message: error instanceof Error ? error.message : "Invalid request"
        });
      }
    }
  );

  app.get(
    "/workspaces/:id/billing/usage",
    withAuth,
    requireWorkspaceMembership,
    async (req, res) => {
      try {
        const workspaceId = readWorkspaceId(req, res);
        if (!workspaceId) {
          return;
        }
        const month = readMonth(req.query.month);
        const usage = await store.getMonthlyUsage(workspaceId, month);
        const subscription = await store.getWorkspaceSubscription(workspaceId);
        res.json({
          ok: true,
          usage,
          subscription
        });
      } catch (error) {
        res.status(400).json({
          ok: false,
          message: error instanceof Error ? error.message : "Invalid month"
        });
      }
    }
  );

  app.get(
    "/workspaces/:id/metrics/overview",
    withAuth,
    requireWorkspaceMembership,
    async (req, res) => {
      try {
        const workspaceId = readWorkspaceId(req, res);
        if (!workspaceId) {
          return;
        }
        const month = readMonth(req.query.month);
        const usage = await store.getMonthlyUsage(workspaceId, month);
        const successRate =
          usage.totalRuns === 0
            ? 0
            : Number(((usage.successRuns / usage.totalRuns) * 100).toFixed(2));
        res.json({
          ok: true,
          month,
          successRate,
          usage
        });
      } catch (error) {
        res.status(400).json({
          ok: false,
          message: error instanceof Error ? error.message : "Invalid month"
        });
      }
    }
  );

  app.post(
    "/workspaces/:id/billing/checkout",
    withAuth,
    requireWorkspaceMembership,
    async (req, res) => {
      try {
        const workspaceId = readWorkspaceId(req, res);
        if (!workspaceId) {
          return;
        }
        const payload = checkoutSchema.parse(req.body);
        const plan = await store.getPlan(payload.planCode);
        if (!plan || !plan.isActive) {
          res.status(400).json({
            ok: false,
            message: "Requested plan is unavailable."
          });
          return;
        }

        const providerOrderId = randomUUID();
        const previewOrderId = randomUUID();
        const checkoutUrl = buildCheckoutUrl(personalGatewayBaseUrl, {
          orderId: previewOrderId,
          workspaceId,
          planCode: plan.code,
          amountUsd: plan.monthlyPriceUsd,
          successUrl: payload.successUrl,
          cancelUrl: payload.cancelUrl
        });
        const order = await store.createPaymentOrder({
          workspaceId,
          planCode: plan.code,
          provider: "personal-gateway",
          providerOrderId,
          amountUsd: plan.monthlyPriceUsd,
          checkoutUrl,
          metadata: {
            requestedBy: (req as AuthenticatedRequest).auth?.userId ?? "unknown",
            ...(payload.billingMode ? { billingMode: payload.billingMode } : {})
          }
        });
        await store.addAuditEvent(workspaceId, "payment_checkout_created", `Order ${order.id}`, {
          planCode: plan.code
        });

        res.status(201).json({
          ok: true,
          order
        });
      } catch (error) {
        res.status(400).json({
          ok: false,
          message: error instanceof Error ? error.message : "Invalid checkout request"
        });
      }
    }
  );

  app.get(
    "/workspaces/:id/self-hosted/entitlement",
    withAuth,
    requireWorkspaceMembership,
    async (req, res) => {
      const workspaceId = readWorkspaceId(req, res);
      if (!workspaceId) {
        return;
      }
      const entitlement = await store.getSelfHostedEntitlement(workspaceId);
      res.json({
        ok: true,
        entitlement: entitlement ?? null
      });
    }
  );

  app.get(
    "/workspaces/:id/self-hosted/orders",
    withAuth,
    requireWorkspaceMembership,
    async (req, res) => {
      const workspaceId = readWorkspaceId(req, res);
      if (!workspaceId) {
        return;
      }
      const orders = await store.listPaymentOrdersForWorkspace(workspaceId, 50);
      res.json({
        ok: true,
        orders: orders.filter((item) => item.planCode === SELF_HOSTED_PLAN_CODE)
      });
    }
  );

  app.get(
    "/workspaces/:id/payment-orders",
    withAuth,
    requireWorkspaceMembership,
    async (req, res) => {
      const workspaceId = readWorkspaceId(req, res);
      if (!workspaceId) {
        return;
      }
      const orders = await store.listPaymentOrdersForWorkspace(workspaceId, 100);
      res.json({
        ok: true,
        orders
      });
    }
  );

  app.post(
    "/workspaces/:id/self-hosted/checkout",
    withAuth,
    requireWorkspaceMembership,
    async (req, res) => {
      try {
        const workspaceId = readWorkspaceId(req, res);
        if (!workspaceId) {
          return;
        }
        const payload = selfHostedCheckoutSchema.parse(req.body ?? {});

        const providerOrderId = randomUUID();
        const previewOrderId = randomUUID();
        const checkoutUrl = buildCheckoutUrl(personalGatewayBaseUrl, {
          orderId: previewOrderId,
          workspaceId,
          planCode: SELF_HOSTED_PLAN_CODE,
          amountUsd: SELF_HOSTED_PRICE_USD,
          successUrl: payload.successUrl,
          cancelUrl: payload.cancelUrl
        });

        const order = await store.createPaymentOrder({
          workspaceId,
          planCode: SELF_HOSTED_PLAN_CODE,
          provider: "personal-gateway",
          providerOrderId,
          amountUsd: SELF_HOSTED_PRICE_USD,
          checkoutUrl,
          metadata: {
            packageCode: SELF_HOSTED_PACKAGE_CODE,
            requestedBy: (req as AuthenticatedRequest).auth?.userId ?? "unknown"
          }
        });
        await store.addAuditEvent(
          workspaceId,
          "self_hosted_checkout_created",
          `Order ${order.id}`
        );

        res.status(201).json({
          ok: true,
          order
        });
      } catch (error) {
        res.status(400).json({
          ok: false,
          message: error instanceof Error ? error.message : "Invalid self-hosted checkout request"
        });
      }
    }
  );

  app.get(
    "/workspaces/:id/self-hosted/artifacts",
    withAuth,
    requireWorkspaceMembership,
    async (req, res) => {
      const workspaceId = readWorkspaceId(req, res);
      if (!workspaceId) {
        return;
      }

      const entitlement = await store.getSelfHostedEntitlement(workspaceId);
      if (!entitlement || entitlement.status !== "active") {
        paymentRequired(
          res,
          "Self-Hosted entitlement is not active. Please complete RS checkout first."
        );
        return;
      }

      const artifacts = selfHostedArtifacts();
      res.json({
        ok: true,
        entitlement,
        artifacts: artifacts.map((artifact) => ({
          ...artifact,
          downloadUrl: `/workspaces/${workspaceId}/self-hosted/artifacts/${artifact.id}/download`
        }))
      });
    }
  );

  app.get(
    "/workspaces/:id/self-hosted/artifacts/:artifactId/download",
    withAuth,
    requireWorkspaceMembership,
    async (req, res) => {
      const workspaceId = readWorkspaceId(req, res);
      if (!workspaceId) {
        return;
      }
      const entitlement = await store.getSelfHostedEntitlement(workspaceId);
      if (!entitlement || entitlement.status !== "active") {
        paymentRequired(
          res,
          "Self-Hosted entitlement is not active. Please complete RS checkout first."
        );
        return;
      }

      const artifactId = req.params.artifactId;
      const artifact = selfHostedArtifacts().find((item) => item.id === artifactId);
      if (!artifact) {
        res.status(404).json({
          ok: false,
          message: "Artifact not found."
        });
        return;
      }
      const absolutePath = join(context.workspaceRoot, artifact.relativePath);
      if (!existsSync(absolutePath)) {
        res.status(404).json({
          ok: false,
          message: "Artifact file does not exist."
        });
        return;
      }

      res.download(absolutePath, artifact.name);
    }
  );

  app.post(
    "/workspaces/:id/self-hosted/config-template",
    withAuth,
    requireWorkspaceMembership,
    async (req, res) => {
      try {
        const workspaceId = readWorkspaceId(req, res);
        if (!workspaceId) {
          return;
        }
        const entitlement = await store.getSelfHostedEntitlement(workspaceId);
        if (!entitlement || entitlement.status !== "active") {
          paymentRequired(
            res,
            "Self-Hosted entitlement is not active. Please complete RS checkout first."
          );
          return;
        }
        const payload = selfHostedConfigSchema.parse(req.body ?? {});
        const configTemplate = {
          ROLEOS_WORKSPACE_ID: workspaceId,
          ROLEOS_STARTER_KIT_ID: payload.starterKitId,
          ROLEOS_OPENCLAW_ENDPOINT: payload.openClawEndpoint,
          ROLEOS_OPENCLAW_API_KEY: payload.openClawApiKey ?? "",
          ROLEOS_MODEL_API_KEY: payload.modelApiKey,
          ROLEOS_MODEL_BASE_URL: payload.modelBaseUrl ?? "",
          FEISHU_WEBHOOK_URL: payload.feishuWebhookUrl ?? "",
          ROLEOS_DEPLOYMENT_TARGET: payload.deploymentTarget
        };
        const envText = Object.entries(configTemplate)
          .map(([key, value]) => `${key}=${value}`)
          .join("\n");
        const installCommand =
          payload.deploymentTarget === "windows"
            ? "powershell -ExecutionPolicy Bypass -File scripts/one-click-deploy.ps1"
            : "bash scripts/one-click-deploy.sh";

        res.json({
          ok: true,
          configTemplate,
          envText,
          installCommand
        });
      } catch (error) {
        res.status(400).json({
          ok: false,
          message: error instanceof Error ? error.message : "Invalid self-hosted config payload"
        });
      }
    }
  );

  app.post(
    "/workspaces/:id/kits/:kitId/activate",
    withAuth,
    requireWorkspaceMembership,
    async (req, res) => {
      try {
        const workspaceId = readWorkspaceId(req, res);
        if (!workspaceId) {
          return;
        }
        const state = await store.getWorkspaceState(workspaceId);
        if (!state) {
          res.status(404).json({
            ok: false,
            message: "Workspace state not found."
          });
          return;
        }
        const requestedKitId = req.params.kitId;
        if (typeof requestedKitId !== "string" || requestedKitId.length === 0) {
          res.status(400).json({
            ok: false,
            message: "kitId is required."
          });
          return;
        }
        if (requestedKitId !== state.defaultKitId) {
          res.status(400).json({
            ok: false,
            message: "Cloud MVP currently supports one approved kit."
          });
          return;
        }
        const kit = await context.registryService.getKit(requestedKitId);
        if (!kit) {
          res.status(404).json({
            ok: false,
            message: "Kit not found."
          });
          return;
        }

        const nextState = await store.activateKit(workspaceId, requestedKitId);
        await store.addAuditEvent(workspaceId, "activate_kit", `Activated kit ${kit.id}`);

        res.json({
          ok: true,
          state: nextState,
          kit
        });
      } catch (error) {
        res.status(500).json({
          ok: false,
          message: error instanceof Error ? error.message : "Failed to activate kit"
        });
      }
    }
  );

  app.post(
    "/workspaces/:id/team/run",
    withAuth,
    requireWorkspaceMembership,
    runLimiter,
    async (req, res) => {
      try {
        await ensureRegistryReady();
        const payload = runSchema.parse(req.body);
        const workspaceId = readWorkspaceId(req, res);
        if (!workspaceId) {
          return;
        }

        const subscription = await store.getWorkspaceSubscription(workspaceId);
        if (!subscription) {
          paymentRequired(res, "No active subscription. Please select a plan first.");
          return;
        }
        if (subscription.status !== "active") {
          paymentRequired(res, `Subscription status is ${subscription.status}.`);
          return;
        }

        const month = monthString();
        const usageBefore = await store.getMonthlyUsage(workspaceId, month);
        if (usageBefore.totalRuns >= subscription.plan.monthlyRunLimit) {
          paymentRequired(
            res,
            `Monthly run limit reached for plan ${subscription.plan.code}. Please upgrade plan.`
          );
          return;
        }

        const idempotencyKeyHeader = req.headers["idempotency-key"];
        const idempotencyKey =
          typeof idempotencyKeyHeader === "string" ? idempotencyKeyHeader : undefined;
        if (idempotencyKey) {
          const existingRunId = await store.findRunIdByIdempotencyKey(
            workspaceId,
            idempotencyKey
          );
          if (existingRunId) {
            const existingRun = await store.getRun(workspaceId, existingRunId);
            if (existingRun) {
              res.json({
                ok: existingRun.status === "success",
                run: existingRun,
                repeated: true
              });
              return;
            }
          }
        }

        const { state, role, kit, team } = await resolveWorkspaceAssets(workspaceId);
        if (payload.teamId && payload.teamId !== state.defaultTeamId) {
          res.status(400).json({
            ok: false,
            message: "Cloud MVP currently supports one approved team."
          });
          return;
        }

        let run = await context.runner.execute({
          workspaceId,
          source: "cloud",
          role,
          kit,
          team,
          intent: payload.intent
        });

        if (run.status === "failed") {
          const retryRun = await context.runner.execute({
            workspaceId,
            source: "cloud",
            role,
            kit,
            team,
            intent: payload.intent
          });
          retryRun.retryCount = 1;
          run = retryRun;
        }

        await store.insertRun(run);
        if (idempotencyKey) {
          await store.saveIdempotencyKey(workspaceId, idempotencyKey, run.id);
        }

        const revenue = computeIncrementalVariableRevenue({
          plan: subscription.plan,
          usageCostBeforeUsd: usageBefore.totalUsageCostUsd,
          currentRunCostUsd: run.cost
        });
        await store.recordRunCharge(workspaceId, run.id, run.cost, revenue.variableRevenueUsd);
        metrics.recordRun(run.status, run.cost, revenue.variableRevenueUsd);

        const usageAfter = await store.getMonthlyUsage(workspaceId, month);
        await store.addAuditEvent(workspaceId, "team_run", `Run ${run.id} (${run.status})`, {
          roleId: role.id,
          kitId: kit.id,
          teamId: team.id,
          planCode: subscription.plan.code
        });
        const delivery = await feishu.publishRunResult(run);

        res.status(run.status === "success" ? 200 : 500).json({
          ok: run.status === "success",
          run,
          delivery,
          billing: {
            planCode: subscription.plan.code,
            variableRevenueUsd: revenue.variableRevenueUsd,
            includedBudgetRemainingUsd: revenue.includedBudgetRemainingUsd,
            monthUsage: usageAfter
          }
        });
      } catch (error) {
        res.status(400).json({
          ok: false,
          message: error instanceof Error ? error.message : "Failed to execute team run"
        });
      }
    }
  );

  app.get(
    "/workspaces/:id/runs/:runId",
    withAuth,
    requireWorkspaceMembership,
    async (req, res) => {
      const workspaceId = readWorkspaceId(req, res);
      if (!workspaceId) {
        return;
      }
      const runId = req.params.runId;
      if (typeof runId !== "string" || runId.length === 0) {
        res.status(400).json({
          ok: false,
          message: "runId is required."
        });
        return;
      }
      const run = await store.getRun(workspaceId, runId);
      if (!run) {
        res.status(404).json({
          ok: false,
          message: "Run not found."
        });
        return;
      }
      res.json({
        ok: true,
        run
      });
    }
  );

  app.get(
    "/workspaces/:id/runs",
    withAuth,
    requireWorkspaceMembership,
    async (req, res) => {
      const workspaceId = readWorkspaceId(req, res);
      if (!workspaceId) {
        return;
      }
      const rawLimit = Number(req.query.limit ?? 20);
      const limit = Number.isFinite(rawLimit)
        ? Math.max(1, Math.min(Math.floor(rawLimit), 200))
        : 20;
      const runs = await store.listRunsForWorkspace(workspaceId, limit);
      res.json({
        ok: true,
        runs
      });
    }
  );

  app.get("/admin/ops/overview", async (req, res) => {
    if (!adminGuard(options.adminApiKey, req, res)) {
      return;
    }
    try {
      const month = readMonth(req.query.month);
      const overview = await store.getOpsOverview(month);
      res.json({
        ok: true,
        overview
      });
    } catch (error) {
      res.status(400).json({
        ok: false,
        message: error instanceof Error ? error.message : "Invalid month"
      });
    }
  });

  app.get("/admin/users", async (req, res) => {
    if (!adminGuard(options.adminApiKey, req, res)) {
      return;
    }
    try {
      const { limit, offset } = readPagination(req.query);
      const users = await store.listUsers(limit, offset);
      res.json({
        ok: true,
        users: users.map((user) => ({
          id: user.id,
          email: user.email,
          createdAt: user.createdAt
        })),
        pagination: { limit, offset }
      });
    } catch (error) {
      res.status(400).json({
        ok: false,
        message: error instanceof Error ? error.message : "Invalid admin users query"
      });
    }
  });

  app.get("/admin/workspaces", async (req, res) => {
    if (!adminGuard(options.adminApiKey, req, res)) {
      return;
    }
    try {
      const { limit, offset } = readPagination(req.query);
      const workspaces = await store.listWorkspaces(limit, offset);
      const detailed = await Promise.all(
        workspaces.map(async (workspace) => {
          const [subscription, entitlement] = await Promise.all([
            store.getWorkspaceSubscription(workspace.id),
            store.getSelfHostedEntitlement(workspace.id)
          ]);
          return {
            ...workspace,
            subscription: subscription
              ? {
                  planCode: subscription.planCode,
                  status: subscription.status
                }
              : null,
            selfHostedEntitlement: entitlement
              ? {
                  packageCode: entitlement.packageCode,
                  status: entitlement.status
                }
              : null
          };
        })
      );
      res.json({
        ok: true,
        workspaces: detailed,
        pagination: { limit, offset }
      });
    } catch (error) {
      res.status(400).json({
        ok: false,
        message: error instanceof Error ? error.message : "Invalid admin workspaces query"
      });
    }
  });

  app.get("/admin/orders", async (req, res) => {
    if (!adminGuard(options.adminApiKey, req, res)) {
      return;
    }
    try {
      const { limit, offset } = readPagination(req.query);
      const workspaceIdFilter =
        typeof req.query.workspaceId === "string" ? req.query.workspaceId : undefined;
      const statusFilter = typeof req.query.status === "string" ? req.query.status : undefined;
      const orders = await store.listPaymentOrders(limit, offset);
      const filtered = orders.filter((order) => {
        if (workspaceIdFilter && order.workspaceId !== workspaceIdFilter) {
          return false;
        }
        if (statusFilter && order.status !== statusFilter) {
          return false;
        }
        return true;
      });
      res.json({
        ok: true,
        orders: filtered,
        pagination: { limit, offset }
      });
    } catch (error) {
      res.status(400).json({
        ok: false,
        message: error instanceof Error ? error.message : "Invalid admin orders query"
      });
    }
  });

  app.get("/admin/runs", async (req, res) => {
    if (!adminGuard(options.adminApiKey, req, res)) {
      return;
    }
    try {
      const { limit, offset } = readPagination(req.query);
      const workspaceIdFilter =
        typeof req.query.workspaceId === "string" ? req.query.workspaceId : undefined;
      const runs = await store.listRuns(limit, offset, workspaceIdFilter);
      res.json({
        ok: true,
        runs,
        pagination: { limit, offset }
      });
    } catch (error) {
      res.status(400).json({
        ok: false,
        message: error instanceof Error ? error.message : "Invalid admin runs query"
      });
    }
  });

  app.get("/admin/workspaces/:id/overview", async (req, res) => {
    if (!adminGuard(options.adminApiKey, req, res)) {
      return;
    }
    const workspaceId = readWorkspaceId(req, res);
    if (!workspaceId) {
      return;
    }
    try {
      const month = readMonth(req.query.month);
      const workspace = await store.getWorkspace(workspaceId);
      if (!workspace) {
        res.status(404).json({
          ok: false,
          message: "Workspace not found."
        });
        return;
      }
      const [state, subscription, usage, entitlement, runs, orders, audits] =
        await Promise.all([
          store.getWorkspaceState(workspaceId),
          store.getWorkspaceSubscription(workspaceId),
          store.getMonthlyUsage(workspaceId, month),
          store.getSelfHostedEntitlement(workspaceId),
          store.listRunsForWorkspace(workspaceId, 50),
          store.listPaymentOrdersForWorkspace(workspaceId, 50),
          store.listAuditEvents(workspaceId, 50)
        ]);
      res.json({
        ok: true,
        workspace,
        state,
        subscription,
        usage,
        selfHostedEntitlement: entitlement ?? null,
        runs,
        orders,
        audits
      });
    } catch (error) {
      res.status(400).json({
        ok: false,
        message: error instanceof Error ? error.message : "Invalid admin workspace query"
      });
    }
  });

  app.put("/admin/workspaces/:id/self-hosted/entitlement", async (req, res) => {
    if (!adminGuard(options.adminApiKey, req, res)) {
      return;
    }
    const workspaceId = readWorkspaceId(req, res);
    if (!workspaceId) {
      return;
    }
    try {
      const payload = adminEntitlementSchema.parse(req.body);
      const entitlement = await store.upsertSelfHostedEntitlement({
        workspaceId,
        packageCode: payload.packageCode,
        status: payload.status
      });
      await store.addAuditEvent(
        workspaceId,
        "admin_self_hosted_entitlement_update",
        `Status -> ${payload.status}`,
        {
          packageCode: payload.packageCode
        }
      );
      res.json({
        ok: true,
        entitlement
      });
    } catch (error) {
      res.status(400).json({
        ok: false,
        message: error instanceof Error ? error.message : "Invalid entitlement update"
      });
    }
  });

  app.put("/admin/workspaces/:id/subscription", async (req, res) => {
    if (!adminGuard(options.adminApiKey, req, res)) {
      return;
    }
    const workspaceId = readWorkspaceId(req, res);
    if (!workspaceId) {
      return;
    }
    try {
      const payload = adminSubscriptionSchema.parse(req.body ?? {});
      let subscription = await store.getWorkspaceSubscription(workspaceId);
      if (!subscription) {
        res.status(404).json({
          ok: false,
          message: "Subscription not found."
        });
        return;
      }

      if (payload.planCode && payload.status) {
        subscription = await store.setWorkspaceSubscriptionPlanAndStatus(
          workspaceId,
          payload.planCode,
          payload.status
        );
      } else if (payload.planCode) {
        subscription = await store.setWorkspaceSubscriptionPlan(workspaceId, payload.planCode);
      } else if (payload.status) {
        subscription = await store.setWorkspaceSubscriptionStatus(workspaceId, payload.status);
      }

      await store.addAuditEvent(
        workspaceId,
        "admin_subscription_update",
        "Subscription updated by admin",
        {
          planCode: subscription.planCode,
          status: subscription.status
        }
      );

      res.json({
        ok: true,
        subscription
      });
    } catch (error) {
      res.status(400).json({
        ok: false,
        message: error instanceof Error ? error.message : "Invalid subscription update"
      });
    }
  });

  app.post("/billing/webhooks/payments", async (req, res) => {
    if (
      !webhookGuard(
        options.paymentWebhookSecret,
        options.allowLegacyWebhookSecretHeader ?? false,
        req,
        res
      )
    ) {
      return;
    }
    try {
      const payload = paymentWebhookSchema.parse(req.body);
      const current = await store.getWorkspaceSubscription(payload.workspaceId);
      if (!current) {
        res.status(404).json({
          ok: false,
          message: "Workspace subscription not found."
        });
        return;
      }

      let next = current;
      if (payload.type === "invoice.paid") {
        next = await store.setWorkspaceSubscriptionStatus(payload.workspaceId, "active");
      } else if (payload.type === "invoice.payment_failed") {
        next = await store.setWorkspaceSubscriptionStatus(payload.workspaceId, "past_due");
      } else if (payload.type === "subscription.updated") {
        if (!payload.planCode) {
          res.status(400).json({
            ok: false,
            message: "planCode is required for subscription.updated"
          });
          return;
        }
        next = await store.setWorkspaceSubscriptionPlanAndStatus(
          payload.workspaceId,
          payload.planCode,
          "active"
        );
      }

      await store.addAuditEvent(payload.workspaceId, "payment_webhook", payload.type, {
        planCode: next.planCode
      });

      res.json({
        ok: true,
        subscription: next
      });
    } catch (error) {
      res.status(400).json({
        ok: false,
        message: error instanceof Error ? error.message : "Invalid webhook payload"
      });
    }
  });

  app.post("/billing/webhooks/personal-gateway", async (req, res) => {
    if (
      !webhookGuard(
        options.paymentWebhookSecret,
        options.allowLegacyWebhookSecretHeader ?? false,
        req,
        res
      )
    ) {
      return;
    }
    try {
      const payload = personalWebhookSchema.parse(req.body);
      const order = await store.getPaymentOrder(payload.orderId);
      if (!order) {
        res.status(404).json({
          ok: false,
          message: "Payment order not found."
        });
        return;
      }
      if (order.workspaceId !== payload.workspaceId) {
        res.status(400).json({
          ok: false,
          message: "workspaceId does not match payment order."
        });
        return;
      }

      const metadata: Record<string, string> = {};
      if (payload.providerTransactionId) {
        metadata.providerTransactionId = payload.providerTransactionId;
      }

      let subscription:
        | Awaited<ReturnType<typeof store.getWorkspaceSubscription>>
        | Awaited<ReturnType<typeof store.setWorkspaceSubscriptionStatus>>
        | undefined;
      let selfHostedEntitlement:
        | Awaited<ReturnType<typeof store.getSelfHostedEntitlement>>
        | Awaited<ReturnType<typeof store.upsertSelfHostedEntitlement>>
        | undefined;
      if (payload.status === "paid") {
        const planCode = payload.planCode ?? order.planCode;
        await store.updatePaymentOrderStatus(order.id, "paid", metadata);
        if (planCode === SELF_HOSTED_PLAN_CODE) {
          selfHostedEntitlement = await store.upsertSelfHostedEntitlement({
            workspaceId: payload.workspaceId,
            packageCode: SELF_HOSTED_PACKAGE_CODE,
            status: "active",
            orderId: order.id
          });
        } else {
          subscription = await store.setWorkspaceSubscriptionPlanAndStatus(
            payload.workspaceId,
            planCode,
            "active"
          );
        }
      } else {
        await store.updatePaymentOrderStatus(order.id, "failed", metadata);
        if (order.planCode === SELF_HOSTED_PLAN_CODE) {
          selfHostedEntitlement = await store.getSelfHostedEntitlement(payload.workspaceId);
        } else {
          subscription = await store.setWorkspaceSubscriptionStatus(
            payload.workspaceId,
            "past_due"
          );
        }
      }

      await store.addAuditEvent(payload.workspaceId, "personal_payment_webhook", payload.status, {
        orderId: payload.orderId,
        planCode: order.planCode
      });

      res.json({
        ok: true,
        orderId: payload.orderId,
        subscription: subscription ?? null,
        selfHostedEntitlement: selfHostedEntitlement ?? null
      });
    } catch (error) {
      res.status(400).json({
        ok: false,
        message: error instanceof Error ? error.message : "Invalid personal payment webhook"
      });
    }
  });

  return { app, store };
}
