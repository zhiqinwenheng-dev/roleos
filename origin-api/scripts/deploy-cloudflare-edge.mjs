import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";
import {
  loadDefaultEnv,
  npxCommand,
  requireEnv,
  run,
  step
} from "./automation-helpers.mjs";

const projectRoot = resolve(process.cwd());
const frontendRoot = resolve(projectRoot, "rolebc-test-main", "rolebc-test-main");
loadDefaultEnv(projectRoot, frontendRoot);

try {
  requireEnv(["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID", "ORIGIN_API_URL"]);
  const edgeSecret = process.env.EDGE_SHARED_SECRET;
  const workerConfig = process.env.ROLEOS_WRANGLER_CONFIG ?? "wrangler.toml";
  const originApiUrl = process.env.ORIGIN_API_URL;
  const wranglerEnv = process.env.CLOUDFLARE_WORKER_ENV;
  const npx = npxCommand();

  const commandArgs = [
    "--yes",
    "wrangler",
    "deploy",
    "--config",
    workerConfig,
    "--var",
    `ORIGIN_API_URL:${originApiUrl}`
  ];
  if (wranglerEnv) {
    commandArgs.push("--env", wranglerEnv);
  }

  step("Deploy Cloudflare Worker");
  run(npx, commandArgs, {
    cwd: projectRoot,
    env: process.env
  });

  if (edgeSecret && edgeSecret.trim().length > 0) {
    step("Sync EDGE_SHARED_SECRET to Cloudflare Worker");
    const secretArgs = [
      "--yes",
      "wrangler",
      "secret",
      "put",
      "EDGE_SHARED_SECRET",
      "--config",
      workerConfig
    ];
    if (wranglerEnv) {
      secretArgs.push("--env", wranglerEnv);
    }

    execFileSync(npx, secretArgs, {
      cwd: projectRoot,
      env: process.env,
      input: `${edgeSecret}\n`,
      stdio: ["pipe", "inherit", "inherit"],
      shell: true
    });
  } else {
    console.log(
      "[warn] EDGE_SHARED_SECRET is empty. Worker deploy succeeded without admin/webhook edge secret enforcement."
    );
  }

  step("Cloudflare Worker deployment done");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Cloudflare Worker deploy failed: ${message}`);
  process.exit(1);
}
