import { resolve } from "node:path";
import process from "node:process";
import { loadDefaultEnv, npmCommand, run, step } from "./automation-helpers.mjs";

const projectRoot = resolve(process.cwd());
const frontendRoot = resolve(projectRoot, "rolebc-test-main", "rolebc-test-main");
loadDefaultEnv(projectRoot, frontendRoot);

const npm = npmCommand();

function hasEnv(name) {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0;
}

function shouldAutodeployCloudflare() {
  if (process.env.ROLEOS_AUTODEPLOY_CLOUDFLARE === "0") {
    return false;
  }
  return hasEnv("CLOUDFLARE_API_TOKEN") && hasEnv("CLOUDFLARE_ACCOUNT_ID");
}

try {
  step("Go-live autopilot started");
  run(npm, ["run", "go-live:verify"], { cwd: projectRoot, env: process.env });

  if (shouldAutodeployCloudflare()) {
    if (hasEnv("ORIGIN_API_URL")) {
      run(npm, ["run", "deploy:cloudflare:edge"], {
        cwd: projectRoot,
        env: process.env
      });
    } else {
      console.log("[warn] ORIGIN_API_URL missing. Skipped Cloudflare Edge deploy.");
    }

    run(npm, ["run", "deploy:cloudflare:pages"], {
      cwd: projectRoot,
      env: process.env
    });
  } else {
    console.log(
      "[warn] Cloudflare credentials missing or autodeploy disabled. Skipped Cloudflare deployment."
    );
  }

  const shouldRunRemoteSmoke =
    process.env.ROLEOS_RUN_REMOTE_SMOKE === "1" || hasEnv("ROLEOS_REMOTE_BASE_URL");

  if (shouldRunRemoteSmoke) {
    if (!hasEnv("ROLEOS_REMOTE_BASE_URL") && hasEnv("ORIGIN_API_URL")) {
      process.env.ROLEOS_REMOTE_BASE_URL = process.env.ORIGIN_API_URL;
    }

    if (hasEnv("ROLEOS_REMOTE_BASE_URL")) {
      run(npm, ["run", "go-live:remote-smoke"], {
        cwd: projectRoot,
        env: process.env
      });
    } else {
      console.log(
        "[warn] ROLEOS_RUN_REMOTE_SMOKE=1 but ROLEOS_REMOTE_BASE_URL/ORIGIN_API_URL missing. Skipped remote smoke."
      );
    }
  } else {
    console.log(
      "[info] Remote smoke skipped. Set ROLEOS_REMOTE_BASE_URL or ROLEOS_RUN_REMOTE_SMOKE=1 to enable."
    );
  }

  step("Go-live autopilot completed");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Go-live autopilot failed: ${message}`);
  process.exit(1);
}
