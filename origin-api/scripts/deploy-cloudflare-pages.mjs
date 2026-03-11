import { existsSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import {
  loadDefaultEnv,
  npmCommand,
  npxCommand,
  requireEnv,
  run,
  step
} from "./automation-helpers.mjs";

const projectRoot = resolve(process.cwd());
const frontendRoot = resolve(projectRoot, "rolebc-test-main", "rolebc-test-main");
loadDefaultEnv(projectRoot, frontendRoot);

try {
  requireEnv(["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID"]);

  if (!existsSync(frontendRoot)) {
    throw new Error(`Frontend project not found: ${frontendRoot}`);
  }

  if (!process.env.VITE_ROLEOS_API_BASE_URL) {
    console.log(
      "[warn] VITE_ROLEOS_API_BASE_URL is missing. Frontend may point to a wrong API endpoint after deploy."
    );
  }

  const projectName = process.env.CLOUDFLARE_PAGES_PROJECT ?? "roleos-web";
  const branch = process.env.CLOUDFLARE_PAGES_BRANCH ?? "production";
  const npm = npmCommand();
  const npx = npxCommand();

  step("Build Rc web frontend");
  run(npm, ["run", "build"], {
    cwd: frontendRoot,
    env: process.env
  });

  step("Deploy frontend to Cloudflare Pages");
  run(
    npx,
    [
      "--yes",
      "wrangler",
      "pages",
      "deploy",
      "dist",
      "--project-name",
      projectName,
      "--branch",
      branch
    ],
    {
      cwd: frontendRoot,
      env: process.env
    }
  );

  step("Cloudflare Pages deployment done");
  console.log(`Project: ${projectName}`);
  console.log(`Branch: ${branch}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Cloudflare Pages deploy failed: ${message}`);
  process.exit(1);
}
