import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import request from "supertest";
import { createAppContext } from "../dist/src/bootstrap/context.js";
import { createCloudApp } from "../dist/src/cloud/app.js";

function loadEnvFile(filePath) {
  try {
    const raw = readFileSync(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const index = trimmed.indexOf("=");
      if (index <= 0) {
        continue;
      }
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // Ignore missing env file.
  }
}

function assertOk(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

loadEnvFile(resolve(process.cwd(), ".env.production"));
loadEnvFile(resolve(process.cwd(), ".env"));

async function run() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const jwtSecret = process.env.ROLEOS_JWT_SECRET;
  const adminApiKey = process.env.ROLEOS_ADMIN_API_KEY;
  const paymentWebhookSecret = process.env.ROLEOS_PAYMENT_WEBHOOK_SECRET;

  if (
    !supabaseUrl ||
    !supabaseServiceRoleKey ||
    !jwtSecret ||
    !adminApiKey ||
    !paymentWebhookSecret
  ) {
    throw new Error("Missing required env vars for supabase smoke.");
  }

  const context = await createAppContext(process.cwd(), {
    openClawEndpoint: process.env.ROLEOS_OPENCLAW_ENDPOINT,
    openClawApiKey: process.env.ROLEOS_OPENCLAW_API_KEY
  });

  const { app } = createCloudApp(context, {
    jwtSecret,
    adminApiKey,
    paymentWebhookSecret,
    storeProvider: "supabase",
    supabaseUrl,
    supabaseServiceRoleKey,
    defaultPlanCode: process.env.ROLEOS_DEFAULT_PLAN ?? "starter",
    personalGatewayBaseUrl:
      process.env.ROLEOS_PERSONAL_GATEWAY_BASE_URL ?? "https://pay.roleos.ai/checkout"
  });

  const unique = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  const email = `smoke-${unique}@roleos.ai`;
  const password = "SmokePass!123";
  const workspaceName = `RoleOS Smoke ${unique}`;

  const registerRes = await request(app).post("/auth/register").send({
    email,
    password,
    workspaceName
  });
  assertOk(registerRes.status === 201, `register failed: ${registerRes.status}`);
  const token = registerRes.body?.token;
  const workspaceId = registerRes.body?.workspace?.id;
  assertOk(typeof token === "string" && token.length > 10, "register token missing");
  assertOk(typeof workspaceId === "string" && workspaceId.length > 10, "workspace id missing");

  const meRes = await request(app)
    .get("/auth/me")
    .set("authorization", `Bearer ${token}`);
  assertOk(meRes.status === 200, `auth/me failed: ${meRes.status}`);

  const dashboardRes = await request(app)
    .get(`/workspaces/${workspaceId}/dashboard`)
    .set("authorization", `Bearer ${token}`);
  assertOk(dashboardRes.status === 200, `dashboard failed: ${dashboardRes.status}`);

  const runRes = await request(app)
    .post(`/workspaces/${workspaceId}/team/run`)
    .set("authorization", `Bearer ${token}`)
    .send({ intent: "Smoke test run from supabase provider." });
  assertOk(
    runRes.status === 200 || runRes.status === 500,
    `team run unexpected status: ${runRes.status}`
  );
  const runId = runRes.body?.run?.id;
  assertOk(typeof runId === "string" && runId.length > 8, "run id missing");

  const runGetRes = await request(app)
    .get(`/workspaces/${workspaceId}/runs/${runId}`)
    .set("authorization", `Bearer ${token}`);
  assertOk(runGetRes.status === 200, `get run failed: ${runGetRes.status}`);

  const rsCheckoutRes = await request(app)
    .post(`/workspaces/${workspaceId}/self-hosted/checkout`)
    .set("authorization", `Bearer ${token}`)
    .send({});
  assertOk(rsCheckoutRes.status === 201, `self-hosted checkout failed: ${rsCheckoutRes.status}`);

  const adminUsersRes = await request(app)
    .get("/admin/users")
    .set("x-roleos-admin-key", adminApiKey);
  assertOk(adminUsersRes.status === 200, `admin/users failed: ${adminUsersRes.status}`);

  const adminWorkspaceRes = await request(app)
    .get(`/admin/workspaces/${workspaceId}/overview`)
    .set("x-roleos-admin-key", adminApiKey);
  assertOk(
    adminWorkspaceRes.status === 200,
    `admin workspace overview failed: ${adminWorkspaceRes.status}`
  );

  console.log("Supabase smoke passed.");
  console.log(`workspaceId=${workspaceId}`);
  console.log(`runId=${runId}`);
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Supabase smoke failed: ${message}`);
  process.exit(1);
});
