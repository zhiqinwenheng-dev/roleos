export type CloudConsoleView = "home" | "onboarding" | "session";

interface CloudViewMeta {
  title: string;
  subtitle: string;
  viewLabel: string;
}

const cloudViewMeta: Record<CloudConsoleView, CloudViewMeta> = {
  home: {
    title: "RoleOS Cloud 控制台测试版",
    subtitle:
      "注册或登录后直接进入 Rc 工作台，完成订阅、Role/Kit/Team 执行和运行结果回查。",
    viewLabel: "Cloud Console"
  },
  onboarding: {
    title: "Cloud Onboarding Flow",
    subtitle:
      "按步骤完成模型模式、Starter Role/Kit 以及首个 Team Run，确保 5 分钟内跑通首个有效输出。",
    viewLabel: "Cloud Onboarding"
  },
  session: {
    title: "Cloud Session Workspace",
    subtitle:
      "围绕当前 Role/Kit/Team 进入持续会话执行，支持按 runId 回查结果与状态。",
    viewLabel: "Cloud Session"
  }
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderCloudConsoleHtml(view: CloudConsoleView): string {
  const meta = cloudViewMeta[view];
  const isHome = view === "home";
  const isOnboarding = view === "onboarding";
  const isSession = view === "session";

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(meta.title)}</title>
    <style>
      :root {
        --bg: #f5f8ff;
        --ink: #10203c;
        --muted: #4d5b78;
        --panel: #ffffff;
        --line: #d8e1f3;
        --blue: #0b5fff;
        --deep: #0d1f42;
        --mint: #12b981;
        --amber: #f59e0b;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        color: var(--ink);
        font-family: "Manrope", "PingFang SC", "Microsoft YaHei", sans-serif;
        background:
          radial-gradient(circle at 15% 0%, #dce9ff 0%, transparent 42%),
          radial-gradient(circle at 95% 10%, #d9fff2 0%, transparent 32%),
          var(--bg);
      }
      .top {
        position: sticky;
        top: 0;
        z-index: 20;
        backdrop-filter: blur(10px);
        background: rgba(255, 255, 255, 0.92);
        border-bottom: 1px solid var(--line);
      }
      .top-inner {
        max-width: 1240px;
        margin: 0 auto;
        padding: 10px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }
      .brand {
        font-size: 15px;
        font-weight: 800;
        letter-spacing: 0.3px;
      }
      .brand small {
        display: inline-block;
        margin-left: 6px;
        color: var(--muted);
        font-weight: 600;
      }
      .top-nav {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .top-nav a {
        text-decoration: none;
        color: var(--muted);
        border: 1px solid var(--line);
        border-radius: 999px;
        padding: 6px 10px;
        font-size: 12px;
        font-weight: 700;
        background: #fff;
      }
      .top-nav a.active {
        color: #fff;
        border-color: var(--deep);
        background: var(--deep);
      }
      .page {
        max-width: 1240px;
        margin: 22px auto;
        padding: 0 16px 24px;
      }
      .hero {
        background: linear-gradient(135deg, #0c1f47, #0b5fff 58%, #13bfa3);
        border-radius: 20px;
        color: #fff;
        padding: 20px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 18px 36px rgba(11, 95, 255, 0.24);
      }
      .hero h1 {
        margin: 0;
        font-size: clamp(24px, 4vw, 34px);
      }
      .hero p {
        margin: 8px 0 0;
        color: rgba(255, 255, 255, 0.92);
        line-height: 1.65;
      }
      .chips {
        margin-top: 12px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .chip {
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.35);
        background: rgba(255, 255, 255, 0.15);
        padding: 5px 10px;
        font-size: 12px;
        font-weight: 700;
      }
      .layout {
        margin-top: 12px;
        display: grid;
        grid-template-columns: 310px 1fr;
        gap: 12px;
      }
      .panel {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 16px;
        padding: 14px;
        box-shadow: 0 8px 24px rgba(16, 32, 60, 0.05);
      }
      .panel h3 {
        margin: 0 0 10px;
        font-size: 15px;
      }
      .stack {
        display: grid;
        gap: 10px;
      }
      .main-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(240px, 1fr));
        gap: 12px;
      }
      label {
        display: block;
        margin: 6px 0 4px;
        font-size: 12px;
        color: var(--muted);
        font-weight: 700;
      }
      input, textarea, select, button {
        width: 100%;
        border: 1px solid var(--line);
        border-radius: 11px;
        font-size: 13px;
        padding: 10px 11px;
        background: #fff;
        color: var(--ink);
      }
      textarea {
        min-height: 96px;
        resize: vertical;
      }
      button {
        border: none;
        font-weight: 800;
        cursor: pointer;
        background: var(--blue);
        color: #fff;
        transition: transform 0.14s ease, box-shadow 0.14s ease;
      }
      button:hover {
        transform: translateY(-1px);
        box-shadow: 0 8px 14px rgba(11, 95, 255, 0.25);
      }
      button.secondary {
        background: var(--deep);
      }
      button.neutral {
        background: #64748b;
      }
      button.good {
        background: var(--mint);
      }
      button.warn {
        background: var(--amber);
        color: #111827;
      }
      .inline-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .inline-3 {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
      }
      .status-box {
        border: 1px dashed var(--line);
        border-radius: 10px;
        padding: 10px;
        background: #f8fbff;
        font-size: 12px;
        color: var(--muted);
        line-height: 1.65;
      }
      pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        min-height: 80px;
        max-height: 260px;
        overflow: auto;
        border-radius: 12px;
        padding: 10px;
        border: 1px solid #d3dcef;
        background: #0f172a;
        color: #d8e7ff;
        font-size: 12px;
        line-height: 1.55;
      }
      .muted {
        color: var(--muted);
        font-size: 12px;
      }
      .mono {
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      }
      @media (max-width: 1080px) {
        .layout {
          grid-template-columns: 1fr;
        }
        .main-grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <header class="top">
      <div class="top-inner">
        <div class="brand">RoleOS Cloud <small>${escapeHtml(meta.viewLabel)}</small></div>
        <nav class="top-nav">
          <a href="/app/cloud" ${isHome ? 'class="active"' : ""}>控制台</a>
          <a href="/app/cloud/onboarding" ${isOnboarding ? 'class="active"' : ""}>Onboarding</a>
          <a href="/app/cloud/session" ${isSession ? 'class="active"' : ""}>Session</a>
          <a href="/app/billing">Billing</a>
          <a href="/docs/cloud">Docs</a>
        </nav>
      </div>
    </header>

    <main class="page">
      <section class="hero">
        <h1>${escapeHtml(meta.title)}</h1>
        <p>${escapeHtml(meta.subtitle)}</p>
        <div class="chips">
          <span class="chip">同核双形态：Role / Kit / Team</span>
          <span class="chip">One Role + One Kit + One Team MVP</span>
          <span class="chip">Feishu 首通道</span>
        </div>
      </section>

      <section class="layout">
        <aside class="stack">
          <section class="panel">
            <h3>账号与租户</h3>
            <div class="status-box">
              <div>登录状态：<span id="authStatus">未登录</span></div>
              <div>当前账号：<span id="userEmail">-</span></div>
            </div>
            <label>Workspace</label>
            <select id="workspaceSelect"></select>
            <div class="inline-2">
              <button class="neutral" id="refreshStateBtn">刷新状态</button>
              <button class="secondary" id="logoutBtn">退出登录</button>
            </div>
            <div class="muted">未登录请先前往 <a href="/login">/login</a>。</div>
          </section>

          <section class="panel">
            <h3>订阅与模式</h3>
            <label>套餐计划</label>
            <select id="planSelect"></select>
            <label>计费模式</label>
            <select id="billingModeSelect"></select>
            <div class="inline-3">
              <button class="good" id="trialBtn">开通 Trial</button>
              <button id="switchPlanBtn">切换计划</button>
              <button class="warn" id="checkoutBtn">创建订单</button>
            </div>
            <label>订单跳转 URL</label>
            <input id="checkoutUrl" readonly class="mono" placeholder="checkout url" />
          </section>

          <section class="panel">
            <h3>订阅快照</h3>
            <pre id="subscriptionOutput">等待加载...</pre>
          </section>
        </aside>

        <section class="stack">
          <div class="main-grid">
            <section class="panel">
              <h3>${isOnboarding ? "Step 1: 读取 Role" : "读取 Role"}</h3>
              <button id="loadRolesBtn">Get Workspace Roles</button>
              <pre id="rolesOutput">等待操作...</pre>
            </section>

            <section class="panel">
              <h3>${isOnboarding ? "Step 2: 启用 Starter Kit" : "启用 Kit"}</h3>
              <label>Kit ID</label>
              <input id="kitIdInput" value="content-starter-kit" />
              <button id="activateKitBtn">Activate Kit</button>
              <pre id="kitOutput">等待操作...</pre>
            </section>
          </div>

          <section class="panel">
            <h3>${isSession ? "Session Run" : isOnboarding ? "Step 3: 执行 Team Run" : "执行 Team Run"}</h3>
            <label>Intent</label>
            <textarea id="intentInput" placeholder="例如：生成一版活动发布文案并附 3 个标题建议。">${
              isOnboarding
                ? "请基于 starter role 与 starter kit 生成首个可交付草稿，并给出下一步建议。"
                : ""
            }</textarea>
            <div class="inline-2">
              <button id="runTeamBtn">Start Team Run</button>
              <button class="secondary" id="refreshUsageBtn">刷新 Usage</button>
            </div>
            <label>Run ID（用于回查）</label>
            <input id="runIdInput" placeholder="run-id" />
            <div class="inline-2">
              <button class="neutral" id="fetchRunBtn">Fetch Run By ID</button>
              <button class="neutral" id="loadCatalogBtn">刷新 Market Catalog</button>
            </div>
          </section>

          <div class="main-grid">
            <section class="panel">
              <h3>Usage / Metrics</h3>
              <pre id="usageOutput">等待加载...</pre>
            </section>
            <section class="panel">
              <h3>Market Catalog</h3>
              <pre id="catalogOutput">等待加载...</pre>
            </section>
          </div>

          <section class="panel">
            <h3>运行输出</h3>
            <pre id="runOutput">等待执行...</pre>
          </section>
        </section>
      </section>
    </main>

    <script>
      const VIEW = "${view}";
      const STORAGE_TOKEN_KEY = "roleosToken";
      const STORAGE_WORKSPACES_KEY = "roleosWorkspaces";
      const STORAGE_LAST_RUN_KEY = "roleosLastRunId";

      const authStatus = document.getElementById("authStatus");
      const userEmail = document.getElementById("userEmail");
      const workspaceSelect = document.getElementById("workspaceSelect");
      const planSelect = document.getElementById("planSelect");
      const billingModeSelect = document.getElementById("billingModeSelect");
      const checkoutUrl = document.getElementById("checkoutUrl");

      const subscriptionOutput = document.getElementById("subscriptionOutput");
      const usageOutput = document.getElementById("usageOutput");
      const rolesOutput = document.getElementById("rolesOutput");
      const kitOutput = document.getElementById("kitOutput");
      const catalogOutput = document.getElementById("catalogOutput");
      const runOutput = document.getElementById("runOutput");

      const intentInput = document.getElementById("intentInput");
      const kitIdInput = document.getElementById("kitIdInput");
      const runIdInput = document.getElementById("runIdInput");

      let token = "";
      let workspaces = [];

      function write(el, data) {
        el.textContent = typeof data === "string" ? data : JSON.stringify(data, null, 2);
      }

      function decodeTokenEmail(rawToken) {
        if (!rawToken || rawToken.split(".").length < 2) {
          return "";
        }
        try {
          const payload = JSON.parse(atob(rawToken.split(".")[1]));
          return typeof payload.email === "string" ? payload.email : "";
        } catch {
          return "";
        }
      }

      function currentWorkspaceId() {
        return workspaceSelect.value || (workspaces[0] ? workspaces[0].id : "");
      }

      function selectedPlanCode() {
        return planSelect.value || "trial";
      }

      function selectedBillingMode() {
        return billingModeSelect.value || "api_token";
      }

      function ensureLoggedIn() {
        if (!token) {
          throw new Error("请先登录后再进行 Cloud 操作。");
        }
      }

      function ensureWorkspaceSelected() {
        const wid = currentWorkspaceId();
        if (!wid) {
          throw new Error("未找到 workspace，请重新登录或刷新页面。");
        }
        return wid;
      }

      function restoreLocalSession() {
        token = localStorage.getItem(STORAGE_TOKEN_KEY) || "";
        const rawWorkspaces = localStorage.getItem(STORAGE_WORKSPACES_KEY) || "[]";
        try {
          workspaces = JSON.parse(rawWorkspaces);
        } catch {
          workspaces = [];
        }
        workspaceSelect.innerHTML = "";
        for (const item of workspaces) {
          if (!item || typeof item.id !== "string") {
            continue;
          }
          const option = document.createElement("option");
          option.value = item.id;
          option.textContent = (item.name || "Workspace") + " (" + item.id + ")";
          workspaceSelect.appendChild(option);
        }
        if (token) {
          authStatus.textContent = "已登录";
          userEmail.textContent = decodeTokenEmail(token) || "已登录用户";
        } else {
          authStatus.textContent = "未登录";
          userEmail.textContent = "-";
        }
        const lastRunId = localStorage.getItem(STORAGE_LAST_RUN_KEY);
        if (lastRunId) {
          runIdInput.value = lastRunId;
        }
      }

      async function api(path, options = {}) {
        const headers = Object.assign({ "content-type": "application/json" }, options.headers || {});
        if (token) {
          headers.authorization = "Bearer " + token;
        }
        const response = await fetch(path, Object.assign({}, options, { headers }));
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.message || ("HTTP " + response.status));
        }
        return data;
      }

      async function loadPlansAndCatalog() {
        const [plansRes, catalogRes] = await Promise.all([
          api("/plans"),
          api("/market/catalog")
        ]);
        planSelect.innerHTML = "";
        for (const plan of plansRes.plans || []) {
          const option = document.createElement("option");
          option.value = plan.code;
          option.textContent = plan.name + " ($" + plan.monthlyPriceUsd + "/mo)";
          planSelect.appendChild(option);
        }
        billingModeSelect.innerHTML = "";
        for (const mode of catalogRes.catalog?.billingModes || []) {
          const option = document.createElement("option");
          option.value = mode.id;
          option.textContent = mode.title;
          billingModeSelect.appendChild(option);
        }
        write(catalogOutput, catalogRes.catalog || { message: "catalog empty" });
      }

      async function refreshSubscriptionAndUsage() {
        ensureLoggedIn();
        const workspaceId = ensureWorkspaceSelected();
        const [subscriptionRes, usageRes] = await Promise.all([
          api("/workspaces/" + workspaceId + "/subscription"),
          api("/workspaces/" + workspaceId + "/billing/usage")
        ]);
        write(subscriptionOutput, subscriptionRes);
        write(usageOutput, usageRes);
      }

      async function startTrial() {
        ensureLoggedIn();
        const workspaceId = ensureWorkspaceSelected();
        const result = await api("/workspaces/" + workspaceId + "/subscription", {
          method: "POST",
          body: JSON.stringify({ planCode: "trial" })
        });
        write(subscriptionOutput, result);
        await refreshSubscriptionAndUsage();
      }

      async function switchPlan() {
        ensureLoggedIn();
        const workspaceId = ensureWorkspaceSelected();
        const result = await api("/workspaces/" + workspaceId + "/subscription", {
          method: "POST",
          body: JSON.stringify({ planCode: selectedPlanCode() })
        });
        write(subscriptionOutput, result);
        await refreshSubscriptionAndUsage();
      }

      async function createCheckout() {
        ensureLoggedIn();
        const workspaceId = ensureWorkspaceSelected();
        const result = await api("/workspaces/" + workspaceId + "/billing/checkout", {
          method: "POST",
          body: JSON.stringify({
            planCode: selectedPlanCode(),
            billingMode: selectedBillingMode()
          })
        });
        checkoutUrl.value = result.order?.checkoutUrl || "";
        write(subscriptionOutput, result);
      }

      async function loadRoles() {
        ensureLoggedIn();
        const workspaceId = ensureWorkspaceSelected();
        const result = await api("/workspaces/" + workspaceId + "/roles");
        write(rolesOutput, result);
      }

      async function activateKit() {
        ensureLoggedIn();
        const workspaceId = ensureWorkspaceSelected();
        const kitId = (kitIdInput.value || "").trim();
        if (!kitId) {
          throw new Error("请填写 kitId。");
        }
        const result = await api("/workspaces/" + workspaceId + "/kits/" + encodeURIComponent(kitId) + "/activate", {
          method: "POST"
        });
        write(kitOutput, result);
      }

      async function runTeam() {
        ensureLoggedIn();
        const workspaceId = ensureWorkspaceSelected();
        const intent = (intentInput.value || "").trim();
        if (!intent) {
          throw new Error("请输入 intent。");
        }
        const result = await api("/workspaces/" + workspaceId + "/team/run", {
          method: "POST",
          body: JSON.stringify({ intent })
        });
        const runId = result.run?.id;
        if (runId) {
          runIdInput.value = runId;
          localStorage.setItem(STORAGE_LAST_RUN_KEY, runId);
        }
        write(runOutput, result);
        await refreshSubscriptionAndUsage();
      }

      async function fetchRun() {
        ensureLoggedIn();
        const workspaceId = ensureWorkspaceSelected();
        const runId = (runIdInput.value || "").trim();
        if (!runId) {
          throw new Error("请输入 runId。");
        }
        const result = await api("/workspaces/" + workspaceId + "/runs/" + encodeURIComponent(runId));
        write(runOutput, result);
      }

      function logout() {
        localStorage.removeItem(STORAGE_TOKEN_KEY);
        localStorage.removeItem(STORAGE_WORKSPACES_KEY);
        localStorage.removeItem(STORAGE_LAST_RUN_KEY);
        location.href = "/login";
      }

      async function safe(action, fallbackOutput) {
        try {
          await action();
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          write(fallbackOutput || runOutput, { ok: false, message, view: VIEW });
        }
      }

      document.getElementById("loadCatalogBtn").addEventListener("click", () => safe(loadPlansAndCatalog, catalogOutput));
      document.getElementById("refreshStateBtn").addEventListener("click", () => safe(refreshSubscriptionAndUsage, subscriptionOutput));
      document.getElementById("refreshUsageBtn").addEventListener("click", () => safe(refreshSubscriptionAndUsage, usageOutput));
      document.getElementById("trialBtn").addEventListener("click", () => safe(startTrial, subscriptionOutput));
      document.getElementById("switchPlanBtn").addEventListener("click", () => safe(switchPlan, subscriptionOutput));
      document.getElementById("checkoutBtn").addEventListener("click", () => safe(createCheckout, subscriptionOutput));
      document.getElementById("loadRolesBtn").addEventListener("click", () => safe(loadRoles, rolesOutput));
      document.getElementById("activateKitBtn").addEventListener("click", () => safe(activateKit, kitOutput));
      document.getElementById("runTeamBtn").addEventListener("click", () => safe(runTeam, runOutput));
      document.getElementById("fetchRunBtn").addEventListener("click", () => safe(fetchRun, runOutput));
      document.getElementById("logoutBtn").addEventListener("click", logout);

      (async function bootstrap() {
        restoreLocalSession();
        await safe(loadPlansAndCatalog, catalogOutput);
        if (token && currentWorkspaceId()) {
          await safe(refreshSubscriptionAndUsage, subscriptionOutput);
          if (VIEW === "onboarding") {
            await safe(loadRoles, rolesOutput);
          }
        } else {
          write(subscriptionOutput, { ok: false, message: "请先登录，登录后即可进入完整 Rc 平台流程。" });
          write(usageOutput, { ok: false, message: "缺少 token 或 workspace。" });
        }
      })();
    </script>
  </body>
</html>`;
}
