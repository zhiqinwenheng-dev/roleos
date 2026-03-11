import { cwd, env } from "node:process";
import { createAppContext } from "../bootstrap/context.js";
import { createCloudApp } from "./app.js";

async function start(): Promise<void> {
  const workspaceRoot = env.ROLEOS_ROOT ?? cwd();
  const port = Number(env.PORT ?? "3000");
  const jwtSecret = env.ROLEOS_JWT_SECRET ?? "roleos-local-dev-secret";
  const adminApiKey = env.ROLEOS_ADMIN_API_KEY ?? "roleos-admin-dev-key";
  const paymentWebhookSecret = env.ROLEOS_PAYMENT_WEBHOOK_SECRET ?? "roleos-webhook-dev-key";
  const allowLegacyWebhookSecretHeader =
    env.ROLEOS_ALLOW_LEGACY_WEBHOOK_SECRET_HEADER === "1";
  const personalGatewayBaseUrl =
    env.ROLEOS_PERSONAL_GATEWAY_BASE_URL ?? "https://payments.local/checkout";
  const feishuWebhookUrl = env.FEISHU_WEBHOOK_URL;
  const defaultPlanCode = env.ROLEOS_DEFAULT_PLAN ?? "starter";
  const storeProvider =
    (env.ROLEOS_STORE_PROVIDER as "sqlite" | "supabase" | undefined) ?? "sqlite";
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const openClawEndpoint = env.ROLEOS_OPENCLAW_ENDPOINT;
  const openClawApiKey = env.ROLEOS_OPENCLAW_API_KEY;
  const allowedOrigins = (env.ROLEOS_ALLOWED_ORIGINS ?? "*")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  const context = await createAppContext(workspaceRoot, {
    openClawEndpoint,
    openClawApiKey
  });
  const { app } = createCloudApp(context, {
    jwtSecret,
    feishuWebhookUrl,
    adminApiKey,
    paymentWebhookSecret,
    personalGatewayBaseUrl,
    defaultPlanCode,
    storeProvider,
    supabaseUrl,
    supabaseServiceRoleKey,
    allowedOrigins,
    allowLegacyWebhookSecretHeader
  });

  app.listen(port, () => {
    console.log(`RoleOS Cloud listening on http://localhost:${port}`);
  });
}

start().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed to start cloud server: ${message}`);
  process.exit(1);
});
