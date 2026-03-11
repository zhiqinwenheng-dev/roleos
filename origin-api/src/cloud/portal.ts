export function renderPortalHtml(): string {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>RoleOS Cloud Portal</title>
    <style>
      :root {
        --bg: #f6f8fc;
        --card: #ffffff;
        --line: #d8e1ef;
        --text: #111827;
        --muted: #4b5563;
        --brand: #0b63f8;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        font-family: "Segoe UI", "PingFang SC", sans-serif;
        color: var(--text);
        background: radial-gradient(circle at top right, #eaf0ff, var(--bg) 44%);
      }
      .wrap {
        max-width: 1100px;
        margin: 24px auto;
        padding: 0 16px 24px;
      }
      .title {
        font-size: 26px;
        font-weight: 700;
      }
      .subtitle {
        margin-top: 8px;
        color: var(--muted);
        font-size: 14px;
      }
      .grid {
        display: grid;
        gap: 12px;
        margin-top: 16px;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      }
      .card {
        background: var(--card);
        border: 1px solid var(--line);
        border-radius: 14px;
        padding: 14px;
        box-shadow: 0 4px 18px rgba(16, 24, 40, 0.05);
      }
      h3 {
        margin: 0 0 10px 0;
        font-size: 16px;
      }
      label {
        display: block;
        font-size: 13px;
        color: var(--muted);
        margin-top: 6px;
      }
      input, textarea, select, button {
        width: 100%;
        margin-top: 6px;
        margin-bottom: 8px;
        border-radius: 10px;
        border: 1px solid var(--line);
        padding: 10px 12px;
        font-size: 14px;
        background: #fff;
      }
      textarea {
        min-height: 84px;
        resize: vertical;
      }
      button {
        border: 0;
        background: var(--brand);
        color: #fff;
        font-weight: 600;
        cursor: pointer;
      }
      button.secondary {
        background: #0f172a;
      }
      .inline {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .status {
        font-size: 13px;
        color: var(--muted);
      }
      pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        background: #0f172a;
        color: #d6e4ff;
        border-radius: 12px;
        padding: 12px;
        min-height: 110px;
        font-size: 12px;
      }
      .pill {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 999px;
        background: #e7efff;
        color: #0b63f8;
        font-size: 12px;
        margin-left: 8px;
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="title">RoleOS Rc Cloud 入口 <span class="pill">/portal</span></div>
      <div class="subtitle">标准流程：注册/登录 → 试用或购买 → 选择套餐模式(API Token/算力 Token) → Role/Kit/Team 运行。</div>

      <div class="grid">
        <section class="card">
          <h3>1. 注册</h3>
          <label>邮箱</label>
          <input id="registerEmail" placeholder="you@roleos.ai" />
          <label>密码（至少 8 位）</label>
          <input id="registerPassword" type="password" placeholder="********" />
          <label>Workspace 名称</label>
          <input id="registerWorkspace" placeholder="My Workspace" />
          <button id="registerBtn">注册并登录</button>
        </section>

        <section class="card">
          <h3>2. 登录</h3>
          <label>邮箱</label>
          <input id="loginEmail" placeholder="you@roleos.ai" />
          <label>密码</label>
          <input id="loginPassword" type="password" placeholder="********" />
          <button id="loginBtn">登录</button>
          <label>Workspace</label>
          <select id="workspaceSelect"></select>
        </section>

        <section class="card">
          <h3>3. 试用 / 购买</h3>
          <label>套餐</label>
          <select id="planSelect"></select>
          <label>套餐模式</label>
          <select id="billingModeSelect"></select>
          <div class="inline">
            <button id="trialBtn">开始试用(Trial)</button>
            <button id="checkoutBtn" class="secondary">创建购买订单</button>
          </div>
          <label>最近订单跳转</label>
          <input id="checkoutUrl" readonly placeholder="checkout url will appear here" />
        </section>

        <section class="card">
          <h3>4. 执行 RoleOS</h3>
          <button id="rolesBtn">获取 Roles</button>
          <label>Intent</label>
          <textarea id="intentInput" placeholder="例如：生成一版活动发布文案并附带标题建议"></textarea>
          <button id="runBtn">执行 Team Run</button>
          <div class="status" id="statusText">状态：未登录</div>
        </section>
      </div>

      <section class="card" style="margin-top:12px">
        <h3>市场与目录同步</h3>
        <div class="status" id="catalogText">加载中...</div>
      </section>

      <section class="card" style="margin-top:12px">
        <h3>响应输出</h3>
        <pre id="output">等待操作...</pre>
      </section>
    </div>

    <script>
      const output = document.getElementById("output");
      const statusText = document.getElementById("statusText");
      const catalogText = document.getElementById("catalogText");
      const workspaceSelect = document.getElementById("workspaceSelect");
      const planSelect = document.getElementById("planSelect");
      const billingModeSelect = document.getElementById("billingModeSelect");
      const checkoutUrlInput = document.getElementById("checkoutUrl");

      let token = "";
      let workspaces = [];
      let marketCatalog = null;

      function write(data) {
        output.textContent = typeof data === "string" ? data : JSON.stringify(data, null, 2);
      }

      function setStatus(text) {
        statusText.textContent = "状态：" + text;
      }

      function workspaceId() {
        return workspaceSelect.value || (workspaces[0] ? workspaces[0].id : "");
      }

      function selectedPlanCode() {
        return planSelect.value || "starter";
      }

      function selectedBillingMode() {
        return billingModeSelect.value || "api_token";
      }

      function fillWorkspaces(items) {
        workspaces = items || [];
        workspaceSelect.innerHTML = "";
        for (const item of workspaces) {
          const option = document.createElement("option");
          option.value = item.id;
          option.textContent = item.name + " (" + item.id + ")";
          workspaceSelect.appendChild(option);
        }
      }

      function fillPlans(plans) {
        planSelect.innerHTML = "";
        for (const plan of plans || []) {
          const option = document.createElement("option");
          option.value = plan.code;
          option.textContent = plan.name + " - $" + plan.monthlyPriceUsd + "/mo";
          planSelect.appendChild(option);
        }
      }

      function fillBillingModes(modes) {
        billingModeSelect.innerHTML = "";
        for (const mode of modes || []) {
          const option = document.createElement("option");
          option.value = mode.id;
          option.textContent = mode.title;
          billingModeSelect.appendChild(option);
        }
      }

      function summarizeCatalog(catalog) {
        if (!catalog) {
          return "未加载市场目录。";
        }
        const b = (catalog.bPackages || []).map(item => item.name).join(", ") || "none";
        const c = (catalog.cPlans || []).map(item => item.planCode).join(", ") || "none";
        return "RS套餐: " + b + " | Rc套餐: " + c + "（同一 market catalog 源）";
      }

      async function api(path, options = {}) {
        const headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
        if (token) {
          headers.Authorization = "Bearer " + token;
        }
        const response = await fetch(path, Object.assign({}, options, { headers }));
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.message || ("HTTP " + response.status));
        }
        return data;
      }

      async function bootstrapCatalog() {
        const market = await api("/market/catalog");
        const plans = await api("/plans");
        marketCatalog = market.catalog;
        fillPlans(plans.plans || []);
        fillBillingModes(marketCatalog.billingModes || []);
        catalogText.textContent = summarizeCatalog(marketCatalog);
      }

      async function register() {
        const email = document.getElementById("registerEmail").value.trim();
        const password = document.getElementById("registerPassword").value;
        const workspaceName = document.getElementById("registerWorkspace").value.trim() || "RoleOS Workspace";
        const data = await api("/auth/register", {
          method: "POST",
          body: JSON.stringify({ email, password, workspaceName })
        });
        token = data.token;
        fillWorkspaces([data.workspace]);
        setStatus("已注册并登录");
        write(data);
      }

      async function login() {
        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value;
        const data = await api("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password })
        });
        token = data.token;
        fillWorkspaces(data.workspaces || []);
        setStatus("已登录");
        write(data);
      }

      async function startTrial() {
        const wid = workspaceId();
        if (!wid) {
          throw new Error("请先登录并选择 workspace。");
        }
        const data = await api("/workspaces/" + wid + "/subscription", {
          method: "POST",
          body: JSON.stringify({ planCode: "trial" })
        });
        setStatus("试用已开启");
        write(data);
      }

      async function createCheckout() {
        const wid = workspaceId();
        if (!wid) {
          throw new Error("请先登录并选择 workspace。");
        }
        const data = await api("/workspaces/" + wid + "/billing/checkout", {
          method: "POST",
          body: JSON.stringify({
            planCode: selectedPlanCode(),
            billingMode: selectedBillingMode()
          })
        });
        checkoutUrlInput.value = data.order.checkoutUrl || "";
        setStatus("购买订单已创建");
        write(data);
      }

      async function loadRoles() {
        const wid = workspaceId();
        if (!wid) {
          throw new Error("请先登录并选择 workspace。");
        }
        const data = await api("/workspaces/" + wid + "/roles");
        write(data);
      }

      async function runTeam() {
        const wid = workspaceId();
        const intent = document.getElementById("intentInput").value.trim();
        if (!wid) {
          throw new Error("请先登录并选择 workspace。");
        }
        if (!intent) {
          throw new Error("请输入 intent。");
        }
        const data = await api("/workspaces/" + wid + "/team/run", {
          method: "POST",
          body: JSON.stringify({ intent })
        });
        write(data);
      }

      async function runSafe(action) {
        try {
          await action();
        } catch (error) {
          write({ ok: false, message: error instanceof Error ? error.message : String(error) });
        }
      }

      document.getElementById("registerBtn").addEventListener("click", () => runSafe(register));
      document.getElementById("loginBtn").addEventListener("click", () => runSafe(login));
      document.getElementById("trialBtn").addEventListener("click", () => runSafe(startTrial));
      document.getElementById("checkoutBtn").addEventListener("click", () => runSafe(createCheckout));
      document.getElementById("rolesBtn").addEventListener("click", () => runSafe(loadRoles));
      document.getElementById("runBtn").addEventListener("click", () => runSafe(runTeam));

      runSafe(bootstrapCatalog);
    </script>
  </body>
</html>`;
}
