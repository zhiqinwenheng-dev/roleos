import { resolve } from "node:path";
import process from "node:process";
import { loadDefaultEnv, step } from "./automation-helpers.mjs";

const projectRoot = resolve(process.cwd());
const frontendRoot = resolve(projectRoot, "rolebc-test-main", "rolebc-test-main");
loadDefaultEnv(projectRoot, frontendRoot);

const baseUrlRaw = process.env.ROLEOS_REMOTE_BASE_URL;

if (!baseUrlRaw) {
  console.error("Missing ROLEOS_REMOTE_BASE_URL.");
  process.exit(1);
}

const baseUrl = baseUrlRaw.replace(/\/+$/, "");
const adminApiKey = process.env.ROLEOS_ADMIN_API_KEY;

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function requestJson(method, path, body, headers = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: body == null ? undefined : JSON.stringify(body)
  });

  const raw = await response.text();
  let parsed = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }

  return {
    status: response.status,
    body: parsed,
    text: raw
  };
}

async function run() {
  step("Remote smoke against deployed Rc API");
  console.log(`Target: ${baseUrl}`);

  const unique = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  const email = `remote-smoke-${unique}@roleos.ai`;
  const password = "RemoteSmoke!123";
  const workspaceName = `Rc Smoke ${unique}`;

  const registerRes = await requestJson("POST", "/auth/register", {
    email,
    password,
    workspaceName
  });
  ensure(
    registerRes.status === 201,
    `register failed: ${registerRes.status} ${registerRes.text}`
  );

  const token = registerRes.body?.token;
  const workspaceId = registerRes.body?.workspace?.id;
  ensure(typeof token === "string" && token.length > 10, "register token missing");
  ensure(typeof workspaceId === "string" && workspaceId.length > 10, "workspace id missing");

  const authHeaders = {
    authorization: `Bearer ${token}`
  };

  const meRes = await requestJson("GET", "/auth/me", undefined, authHeaders);
  ensure(meRes.status === 200, `auth/me failed: ${meRes.status}`);

  const dashboardRes = await requestJson(
    "GET",
    `/workspaces/${workspaceId}/dashboard`,
    undefined,
    authHeaders
  );
  ensure(dashboardRes.status === 200, `dashboard failed: ${dashboardRes.status}`);

  const runRes = await requestJson(
    "POST",
    `/workspaces/${workspaceId}/team/run`,
    {
      intent: "Remote smoke run"
    },
    authHeaders
  );
  ensure(
    runRes.status === 200 || runRes.status === 500,
    `team run unexpected status: ${runRes.status}`
  );
  const runId = runRes.body?.run?.id;
  ensure(typeof runId === "string" && runId.length > 8, "run id missing");

  const runGetRes = await requestJson(
    "GET",
    `/workspaces/${workspaceId}/runs/${runId}`,
    undefined,
    authHeaders
  );
  ensure(runGetRes.status === 200, `get run failed: ${runGetRes.status}`);

  const rsCheckoutRes = await requestJson(
    "POST",
    `/workspaces/${workspaceId}/self-hosted/checkout`,
    {},
    authHeaders
  );
  ensure(
    rsCheckoutRes.status === 201,
    `self-hosted checkout failed: ${rsCheckoutRes.status}`
  );

  if (adminApiKey) {
    const adminOverviewRes = await requestJson(
      "GET",
      `/admin/workspaces/${workspaceId}/overview`,
      undefined,
      {
        "x-roleos-admin-key": adminApiKey
      }
    );
    ensure(
      adminOverviewRes.status === 200,
      `admin workspace overview failed: ${adminOverviewRes.status}`
    );
  } else {
    console.log("[warn] ROLEOS_ADMIN_API_KEY is missing. Skipped admin endpoint smoke.");
  }

  step("Remote smoke passed");
  console.log(`workspaceId=${workspaceId}`);
  console.log(`runId=${runId}`);
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Remote smoke failed: ${message}`);
  process.exit(1);
});
