import { renderCloudConsoleHtml } from "./cloudConsolePage.js";

interface PageSection {
  heading: string;
  points: string[];
}

interface PageButton {
  label: string;
  href: string;
  variant?: "primary" | "secondary";
}

interface RenderPageInput {
  pageTitle: string;
  badge?: string;
  title: string;
  subtitle: string;
  sections: PageSection[];
  buttons?: PageButton[];
}

const navItems: Array<{ href: string; label: string }> = [
  { href: "/", label: "首页" },
  { href: "/products", label: "产品" },
  { href: "/pricing", label: "定价" },
  { href: "/products/self-hosted", label: "下载 RS" },
  { href: "/products/cloud", label: "进入 Rc" },
  { href: "/docs", label: "文档" },
  { href: "https://github.com/roleos/roleos", label: "GitHub" },
  { href: "/login", label: "登录" }
];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderBase(input: RenderPageInput): string {
  const nav = navItems
    .map(
      (item) =>
        `<a href="${item.href}" ${item.href.startsWith("http") ? 'target="_blank" rel="noreferrer"' : ""}>${
          item.label
        }</a>`
    )
    .join("");

  const sections = input.sections
    .map((section) => {
      const points = section.points.map((point) => `<li>${escapeHtml(point)}</li>`).join("");
      return `<section class="card"><h3>${escapeHtml(section.heading)}</h3><ul>${points}</ul></section>`;
    })
    .join("");

  const buttons = (input.buttons ?? [])
    .map(
      (button) =>
        `<a class="btn ${button.variant === "secondary" ? "secondary" : ""}" href="${button.href}">${escapeHtml(
          button.label
        )}</a>`
    )
    .join("");

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(input.pageTitle)}</title>
    <style>
      :root {
        --bg: #f7f9fe;
        --card: #ffffff;
        --line: #dbe3f0;
        --text: #0f172a;
        --muted: #475569;
        --brand: #0b5fff;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Segoe UI", "PingFang SC", sans-serif;
        color: var(--text);
        background: radial-gradient(circle at top right, #e9f0ff, var(--bg) 40%);
      }
      header {
        position: sticky;
        top: 0;
        z-index: 10;
        background: rgba(255, 255, 255, 0.92);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid var(--line);
      }
      .nav {
        max-width: 1100px;
        margin: 0 auto;
        display: flex;
        gap: 14px;
        padding: 12px 16px;
        align-items: center;
        flex-wrap: wrap;
      }
      .nav a {
        text-decoration: none;
        color: var(--muted);
        font-size: 14px;
      }
      .hero {
        max-width: 1100px;
        margin: 26px auto 0;
        padding: 0 16px;
      }
      .badge {
        display: inline-block;
        border: 1px solid #c8dafd;
        color: var(--brand);
        background: #eef4ff;
        border-radius: 999px;
        padding: 4px 10px;
        font-size: 12px;
      }
      h1 {
        margin: 12px 0 10px;
        font-size: clamp(26px, 4vw, 42px);
      }
      .subtitle {
        max-width: 840px;
        line-height: 1.65;
        color: var(--muted);
      }
      .actions {
        margin-top: 14px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .btn {
        text-decoration: none;
        background: var(--brand);
        color: #fff;
        border-radius: 10px;
        padding: 10px 14px;
        font-size: 14px;
        font-weight: 600;
      }
      .btn.secondary {
        background: #0f172a;
      }
      .grid {
        max-width: 1100px;
        margin: 18px auto 26px;
        padding: 0 16px;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 12px;
      }
      .card {
        background: var(--card);
        border: 1px solid var(--line);
        border-radius: 14px;
        padding: 14px;
        box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
      }
      .card h3 {
        margin-top: 0;
        font-size: 16px;
      }
      .card ul {
        margin: 0;
        padding-left: 18px;
        color: var(--muted);
        line-height: 1.6;
        font-size: 14px;
      }
      footer {
        max-width: 1100px;
        margin: 0 auto 28px;
        padding: 0 16px;
        color: var(--muted);
        font-size: 12px;
      }
    </style>
  </head>
  <body>
    <header><nav class="nav">${nav}</nav></header>
    <main>
      <section class="hero">
        ${input.badge ? `<div class="badge">${escapeHtml(input.badge)}</div>` : ""}
        <h1>${escapeHtml(input.title)}</h1>
        <p class="subtitle">${escapeHtml(input.subtitle)}</p>
        ${buttons ? `<div class="actions">${buttons}</div>` : ""}
      </section>
      <section class="grid">${sections}</section>
    </main>
    <footer>RoleOS 平台：RS(Self-Hosted) 与 Rc(Cloud) 共享同一套 Role / Kit / Team 标准。</footer>
  </body>
</html>`;
}

export function renderHomePage(): string {
  return renderBase({
    pageTitle: "RoleOS | 工作对象标准平台",
    badge: "RoleOS.ai",
    title: "把 OpenClaw 从技术对象，推进到工作对象",
    subtitle:
      "RoleOS 是 OpenClaw 之上的工作标准层。通过 Role / Kit / Team，让用户无需先理解底层 runtime，也能快速部署和使用。",
    buttons: [
      { label: "Start Rc Cloud", href: "/products/cloud" },
      { label: "Deploy RS Self-Hosted", href: "/products/self-hosted", variant: "secondary" },
      { label: "View Pricing", href: "/pricing" },
      { label: "Read Docs", href: "/docs" }
    ],
    sections: [
      {
        heading: "RoleOS 是什么",
        points: ["不是新的 runtime，也不是新的协议层。", "是 OpenClaw 之上的 work-facing 标准层。", "RS/Rc 两种交付，共享同一对象语义。"]
      },
      {
        heading: "核心对象",
        points: ["Role：谁执行工作。", "Kit：如何启动工作。", "Team：如何组织协作。"]
      },
      {
        heading: "RS / Rc 双线",
        points: ["RS：一键部署到用户环境，￥199 一次性。", "Rc：注册即用，3 天试用，BYOM 免费。", "Managed Model：￥39/月。"]
      },
      {
        heading: "第一性原则",
        points: [
          "先让用户理解工作对象，再暴露技术对象。",
          "官网负责转化，App 负责使用，Docs 负责上手。",
          "GitHub 负责开源信任与标准扩散。"
        ]
      }
    ]
  });
}

export function renderProductsPage(): string {
  return renderBase({
    pageTitle: "RoleOS Products",
    title: "同一平台，两种交付方式",
    subtitle: "Self-Hosted 与 Cloud 共享 Role / Kit / Team 标准，在不同用户场景下提供不同交付体验。",
    buttons: [
      { label: "Buy RS", href: "/products/self-hosted" },
      { label: "Start Rc", href: "/products/cloud", variant: "secondary" }
    ],
    sections: [
      {
        heading: "Shared Core",
        points: [
          "Role meaning / Kit meaning / Team meaning",
          "schema 与 registry format 一致",
          "lifecycle semantics 与 adapter contract 一致"
        ]
      },
      {
        heading: "RS: Self-Hosted",
        points: ["一键部署", "用户自己的环境与数据", "商业可用，当前 ¥199 一次性"]
      },
      {
        heading: "Rc: Cloud",
        points: ["注册即用，3 天试用", "BYOM 免费，Managed Model ¥39/月", "面向快速上手与持续运营"]
      }
    ]
  });
}

export function renderSelfHostedPage(): string {
  return renderBase({
    pageTitle: "RoleOS Self-Hosted",
    title: "RoleOS Self-Hosted（RS）",
    subtitle: "Deploy RoleOS in your own environment with guided setup and full runtime control.",
    buttons: [
      { label: "Buy RS", href: "/signup?intent=buy-rs" },
      { label: "View Downloads", href: "/app/self-hosted/downloads", variant: "secondary" }
    ],
    sections: [
      {
        heading: "适合谁",
        points: ["技术团队与私有化部署场景", "受控数据环境", "OpenClaw-native 用户"]
      },
      {
        heading: "包含内容",
        points: ["one-command installer", "config generator", "starter Roles / Kits / Teams", "deployment docs"]
      },
      {
        heading: "购买后流程",
        points: ["注册账号并支付 ¥199", "进入 RS 控制台下载与生成配置", "执行 setup -> doctor -> team run"]
      }
    ]
  });
}

export function renderCloudPage(): string {
  return renderBase({
    pageTitle: "RoleOS Cloud",
    title: "RoleOS Cloud（Rc）",
    subtitle: "Use RoleOS immediately without managing OpenClaw yourself.",
    buttons: [
      { label: "Start Rc Trial", href: "/signup?intent=trial-rc" },
      { label: "Open Cloud Console", href: "/app/cloud", variant: "secondary" }
    ],
    sections: [
      {
        heading: "适合谁",
        points: ["非技术用户", "创始人与运营角色", "需要快速启动的小团队"]
      },
      {
        heading: "Cloud MVP 范围",
        points: ["one channel", "one starter Role", "one starter Kit", "one starter Team", "one model policy"]
      },
      {
        heading: "定价",
        points: ["3 天免费试用", "BYOM：免费", "Managed Model：￥39/月"]
      }
    ]
  });
}

export function renderPricingPage(): string {
  return renderBase({
    pageTitle: "RoleOS Pricing",
    title: "定价与模式",
    subtitle: "RS 是部署产品，Rc 是托管产品。RS/Rc 共享同一标准对象体系。",
    buttons: [
      { label: "Buy RS", href: "/signup?intent=buy-rs" },
      { label: "Start Rc Trial", href: "/signup?intent=trial-rc", variant: "secondary" }
    ],
    sections: [
      {
        heading: "Self-Hosted（RS）",
        points: ["¥199 一次性", "one-command installer", "starter packs + deployment docs", "commercial-ready package"]
      },
      {
        heading: "Cloud BYOM",
        points: ["3 天免费试用", "自带模型", "试用后可免费继续"]
      },
      {
        heading: "Cloud Managed Model",
        points: ["3 天免费试用", "¥39 / 月", "平台模型套餐"]
      }
    ]
  });
}

export function renderFaqPage(): string {
  return renderBase({
    pageTitle: "RoleOS FAQ",
    title: "常见问题",
    subtitle: "先回答用户认知问题，再进入部署与计费细节。",
    sections: [
      {
        heading: "基础认知",
        points: [
          "Is RoleOS a new runtime? 不是。",
          "RS 和 Rc 的区别是什么？交付方式不同，标准一致。",
          "Do I need to understand OpenClaw first? 不需要。"
        ]
      },
      {
        heading: "计费与试用",
        points: ["Self-Hosted 当前是 ¥199 一次性。", "Cloud 支持 3 天试用。", "Cloud 有 BYOM 免费与 Managed Model ¥39/月。"]
      },
      {
        heading: "部署与支持",
        points: ["RS 支持一键部署脚本与下载包。", "Cloud 入口是 /app/cloud。", "文档入口是 /docs。"]
      }
    ]
  });
}

function renderAuthPage(input: { mode: "login" | "signup" }): string {
  const isLogin = input.mode === "login";
  const title = isLogin ? "登录 RoleOS" : "注册 RoleOS";
  const submitLabel = isLogin ? "登录并进入后台" : "注册并开始";
  const endpoint = isLogin ? "/auth/login" : "/auth/register";
  const extraField = isLogin ? "" : `<label>Workspace Name</label><input id="workspace" placeholder="RoleOS Workspace" />`;

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      body { font-family: "Segoe UI","PingFang SC",sans-serif; margin:0; background:#f6f8fc; }
      .wrap { max-width: 460px; margin: 48px auto; padding: 0 16px; }
      .card { background:#fff; border:1px solid #dbe3f0; border-radius:14px; padding:16px; }
      h1 { margin-top:0; font-size:24px; }
      p { color:#475569; font-size:14px; }
      label { display:block; margin-top:8px; font-size:13px; color:#475569; }
      input, select, button { width:100%; margin-top:6px; margin-bottom:8px; padding:10px 12px; border-radius:10px; border:1px solid #dbe3f0; box-sizing:border-box; }
      button { border:0; background:#0b5fff; color:#fff; font-weight:600; cursor:pointer; }
      .alt { background:#0f172a; }
      pre { white-space:pre-wrap; font-size:12px; background:#0f172a; color:#d8e6ff; border-radius:10px; padding:10px; min-height:70px; }
      a { color:#0b5fff; text-decoration:none; font-size:13px; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <h1>${title}</h1>
        <p>账号统一适用于 RS 与 Rc。登录后可查看 Self-Hosted 与 Cloud 状态。</p>
        <label>Email</label>
        <input id="email" placeholder="you@roleos.ai" />
        <label>Password</label>
        <input id="password" type="password" placeholder="********" />
        ${extraField}
        ${
          isLogin
            ? ""
            : `<label>Start Intent</label>
        <select id="intent">
          <option value="trial-rc">Start Rc Trial</option>
          <option value="buy-rs">Buy RS Self-Hosted</option>
        </select>`
        }
        <button id="submit">${submitLabel}</button>
        <button class="alt" id="toApp">进入后台 /app</button>
        <pre id="output">等待操作...</pre>
        <a href="${isLogin ? "/signup" : "/login"}">${isLogin ? "还没有账号？去注册" : "已有账号？去登录"}</a>
      </div>
    </div>
    <script>
      const output = document.getElementById("output");
      function write(data) {
        output.textContent = typeof data === "string" ? data : JSON.stringify(data, null, 2);
      }
      async function submit() {
        try {
          const email = document.getElementById("email").value.trim();
          const password = document.getElementById("password").value;
          const payload = { email, password };
          ${isLogin ? "" : `payload.workspaceName = (document.getElementById("workspace").value || "RoleOS Workspace").trim();`}
          const response = await fetch("${endpoint}", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload)
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.message || "请求失败");
          }
          localStorage.setItem("roleosToken", data.token || "");
          localStorage.setItem("roleosWorkspaces", JSON.stringify(data.workspaces || [data.workspace].filter(Boolean)));
          write(data);
          ${
            isLogin
              ? `location.href = "/app/cloud";`
              : `const intent = document.getElementById("intent").value;
          location.href = intent === "buy-rs" ? "/app/self-hosted" : "/app/cloud/onboarding";`
          }
        } catch (error) {
          write({ ok: false, message: error instanceof Error ? error.message : String(error) });
        }
      }
      document.getElementById("submit").addEventListener("click", submit);
      document.getElementById("toApp").addEventListener("click", () => { location.href = "/app/cloud"; });
    </script>
  </body>
</html>`;
}

function renderAppShell(input: { title: string; subtitle: string; points: string[] }): string {
  const links = [
    { href: "/app", label: "App Home" },
    { href: "/app/billing", label: "Billing" },
    { href: "/app/account", label: "Account" },
    { href: "/app/support", label: "Support" },
    { href: "/app/admin", label: "Admin" },
    { href: "/app/self-hosted", label: "RS Console" },
    { href: "/app/self-hosted/downloads", label: "RS Downloads" },
    { href: "/app/self-hosted/config", label: "RS Config Generator" },
    { href: "/app/cloud", label: "Rc Console" },
    { href: "/app/cloud/onboarding", label: "Rc Onboarding" },
    { href: "/app/cloud/session", label: "Rc Session" }
  ];
  const nav = links.map((link) => `<a href="${link.href}">${link.label}</a>`).join("");
  const points = input.points.map((point) => `<li>${escapeHtml(point)}</li>`).join("");

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(input.title)}</title>
    <style>
      body { margin:0; font-family: "Segoe UI","PingFang SC",sans-serif; background:#f6f8fc; color:#0f172a; }
      .wrap { max-width:1100px; margin:24px auto; padding:0 16px; display:grid; grid-template-columns:260px 1fr; gap:12px; }
      .menu, .content { background:#fff; border:1px solid #dbe3f0; border-radius:14px; padding:14px; }
      .menu a { display:block; color:#475569; text-decoration:none; margin-bottom:8px; font-size:14px; }
      h1 { margin-top:0; font-size:24px; }
      p { color:#475569; }
      ul { margin:0; padding-left:18px; color:#475569; line-height:1.7; }
      .cta { margin-top:12px; display:flex; gap:8px; flex-wrap:wrap; }
      .btn { text-decoration:none; background:#0b5fff; color:#fff; border-radius:10px; padding:10px 12px; font-size:13px; font-weight:600; }
      .btn.secondary { background:#0f172a; }
      @media (max-width: 900px) { .wrap { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <div class="wrap">
      <aside class="menu">${nav}</aside>
      <section class="content">
        <h1>${escapeHtml(input.title)}</h1>
        <p>${escapeHtml(input.subtitle)}</p>
        <ul>${points}</ul>
        <div class="cta">
          <a class="btn" href="/app/cloud">Open Rc Console</a>
          <a class="btn secondary" href="/docs">Read Docs</a>
        </div>
      </section>
    </div>
  </body>
</html>`;
}

export function renderDocsHomePage(): string {
  return renderBase({
    pageTitle: "RoleOS Docs",
    title: "RoleOS 文档中心",
    subtitle: "Docs 负责上手，不负责售卖。围绕 RS/Rc 与 Role/Kit/Team 标准组织内容。",
    sections: [
      {
        heading: "核心文档",
        points: ["What is RoleOS", "Core Objects: Role / Kit / Team", "Self-Hosted Guide", "Cloud Guide"]
      },
      {
        heading: "运维文档",
        points: ["FAQ", "Troubleshooting", "Changelog / Release Notes"]
      }
    ],
    buttons: [
      { label: "What is RoleOS", href: "/docs/what-is-roleos" },
      { label: "Core Objects", href: "/docs/core-objects", variant: "secondary" },
      { label: "Self-Hosted Docs", href: "/docs/self-hosted" },
      { label: "Cloud Docs", href: "/docs/cloud", variant: "secondary" }
    ]
  });
}

function renderSimpleDoc(title: string, lines: string[]): string {
  return renderBase({
    pageTitle: title,
    title,
    subtitle: "RoleOS 文档页",
    sections: [{ heading: title, points: lines }],
    buttons: [{ label: "Back to Docs", href: "/docs" }]
  });
}

export const sitePageRenderers = {
  "/": renderHomePage,
  "/products": renderProductsPage,
  "/products/self-hosted": renderSelfHostedPage,
  "/products/cloud": renderCloudPage,
  "/pricing": renderPricingPage,
  "/faq": renderFaqPage,
  "/login": () => renderAuthPage({ mode: "login" }),
  "/signup": () => renderAuthPage({ mode: "signup" }),
  "/docs": renderDocsHomePage,
  "/docs/what-is-roleos": () =>
    renderSimpleDoc("What is RoleOS", [
      "RoleOS 是 OpenClaw 之上的工作标准层。",
      "RoleOS 不是新 runtime，不替代 OpenClaw。",
      "目标是让用户先用工作对象，再理解底层对象。"
    ]),
  "/docs/core-objects": () =>
    renderSimpleDoc("Core Objects", ["Role：谁执行工作。", "Kit：如何启动工作。", "Team：如何组织协作。"]),
  "/docs/self-hosted": () =>
    renderSimpleDoc("Self-Hosted Docs", ["购买 RS 套餐后进入 /app/self-hosted。", "下载 installer 与配置模板。", "执行 setup -> doctor -> team run。"]),
  "/docs/cloud": () =>
    renderSimpleDoc("Cloud Docs", ["Cloud 支持 3 天试用。", "BYOM 免费，Managed Model ￥39/月。", "入口：/app/cloud。"]),
  "/docs/faq": () =>
    renderSimpleDoc("Docs FAQ", [
      "RS 与 Rc 共享同一标准体系。",
      "同一账号可同时使用 RS 与 Rc。",
      "官网转化，App 使用，Docs 上手。"
    ]),
  "/docs/changelog": () =>
    renderSimpleDoc("Changelog", [
      "v1: 上线 RS/Rc 双路径与统一站点入口。",
      "v1: 支持门户、计费、市场目录。",
      "v1: 支持一键部署脚本与发布流水线。"
    ]),
  "/app": () =>
    renderAppShell({
      title: "RoleOS App Home",
      subtitle: "统一账号视图：Self-Hosted / Cloud / Billing / Docs。",
      points: ["显示当前产品状态：Self-Hosted / Cloud / Both。", "显示 Cloud 试用状态与订阅状态。", "进入 RS 控制台或 Rc 控制台。"]
    }),
  "/app/billing": () =>
    renderAppShell({
      title: "Billing",
      subtitle: "账单、订阅、订单、试用状态。",
      points: ["RS 订单与下载权限状态。", "Cloud 模式：BYOM / Managed Model。", "升级、续费、取消入口。"]
    }),
  "/app/account": () =>
    renderAppShell({
      title: "Account",
      subtitle: "账户信息、偏好设置、安全配置。",
      points: ["统一账号体系覆盖 RS/Rc。", "查看 workspace 与访问权限。", "更新安全配置。"]
    }),
  "/app/support": () =>
    renderAppShell({
      title: "Support",
      subtitle: "支持与帮助入口。",
      points: ["部署支持", "账单支持", "Cloud 使用支持"]
    }),
  "/app/admin": () =>
    renderAppShell({
      title: "Admin Console",
      subtitle: "Users / workspaces / orders / runs management.",
      points: [
        "View system overview and monthly metrics.",
        "Manage workspace subscriptions and RS entitlement status.",
        "Audit orders, run history, and failure recovery state."
      ]
    }),
  "/app/self-hosted": () =>
    renderAppShell({
      title: "Self-Hosted Console",
      subtitle: "RS 用户下载、配置、部署、上手入口。",
      points: ["订单状态与版本。", "下载 installer、config template、starter packs。", "部署引导与 FAQ。"]
    }),
  "/app/self-hosted/downloads": () =>
    renderAppShell({
      title: "Self-Hosted Downloads",
      subtitle: "下载区。",
      points: ["roleos installer 主包", "配置模板包", "starter packs", "部署文档链接"]
    }),
  "/app/self-hosted/config": () =>
    renderAppShell({
      title: "Self-Hosted Config Generator",
      subtitle: "生成部署配置。",
      points: ["输入模型凭证、机器人凭证、部署目标。", "选择 starter kit。", "输出 env 与安装步骤。"]
    }),
  "/app/cloud": () => renderCloudConsoleHtml("home"),
  "/app/cloud/onboarding": () => renderCloudConsoleHtml("onboarding"),
  "/app/cloud/session": () => renderCloudConsoleHtml("session")
};
