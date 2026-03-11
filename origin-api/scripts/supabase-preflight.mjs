import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

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

loadEnvFile(resolve(process.cwd(), ".env.production"));
loadEnvFile(resolve(process.cwd(), ".env"));

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const requiredPaths = [
  "/users",
  "/workspaces",
  "/workspace_members",
  "/workspace_state",
  "/plans",
  "/workspace_subscriptions",
  "/runs",
  "/billing_charges",
  "/idempotency_keys",
  "/payment_orders",
  "/self_hosted_entitlements",
  "/audit_events"
];

const rsPlanSeed = {
  code: "rs-self-hosted",
  name: "RS Self-Hosted",
  monthly_price_usd: 199,
  monthly_run_limit: 0,
  included_cost_usd: 0,
  overage_multiplier: 1,
  is_active: false
};

async function main() {
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exitCode = 1;
    return;
  }

  const baseRest = `${supabaseUrl.replace(/\/+$/, "")}/rest/v1`;

  const specResponse = await fetch(`${baseRest}/`, {
    method: "GET",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Connection: "close"
    }
  });

  if (!specResponse.ok) {
    console.error(`Failed to read Supabase REST spec: ${specResponse.status}`);
    process.exitCode = 1;
    return;
  }

  const spec = await specResponse.json();
  const paths = spec?.paths && typeof spec.paths === "object" ? spec.paths : {};
  const missingPaths = requiredPaths.filter((path) => !(path in paths));

  if (missingPaths.length > 0) {
    console.error("Supabase schema is not ready. Missing REST paths:");
    for (const path of missingPaths) {
      console.error(`- ${path}`);
    }
    console.error(
      "Run migration SQL file in Supabase SQL Editor: supabase/migrations/20260311_roleos_init.sql"
    );
    process.exitCode = 1;
    return;
  }

  const plansResponse = await fetch(`${baseRest}/plans?select=code,name,is_active&limit=20`, {
    method: "GET",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Connection: "close"
    }
  });

  if (!plansResponse.ok) {
    const body = await plansResponse.text();
    console.error(`Plans query failed: ${plansResponse.status} ${body}`);
    process.exitCode = 1;
    return;
  }

  const plans = await plansResponse.json();
  const hasRsPlan =
    Array.isArray(plans) && plans.some((plan) => plan && plan.code === "rs-self-hosted");

  if (!hasRsPlan) {
    const upsertRes = await fetch(`${baseRest}/plans?on_conflict=code`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Connection: "close",
        "content-type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation"
      },
      body: JSON.stringify([rsPlanSeed])
    });

    if (!upsertRes.ok) {
      const body = await upsertRes.text();
      console.error(`Failed to upsert rs-self-hosted plan: ${upsertRes.status} ${body}`);
      process.exitCode = 1;
      return;
    }
  }

  console.log("Supabase preflight passed.");
  console.log(`Detected plans: ${Array.isArray(plans) ? plans.length : 0}`);
}

await main();
