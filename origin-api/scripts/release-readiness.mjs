import { existsSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { loadDefaultEnv, npmCommand, run, step } from "./automation-helpers.mjs";

const projectRoot = resolve(process.cwd());
const frontendRoot = resolve(projectRoot, "rolebc-test-main", "rolebc-test-main");

loadDefaultEnv(projectRoot, frontendRoot);

const npm = npmCommand();

function runStep(title, workdir, script) {
  step(title);
  run(npm, ["run", script], { cwd: workdir });
}

try {
  runStep("Supabase schema preflight", projectRoot, "supabase:preflight");
  runStep("Supabase end-to-end smoke", projectRoot, "supabase:smoke");
  runStep("Backend type check", projectRoot, "check");
  runStep("Backend tests", projectRoot, "test");
  runStep("Backend build", projectRoot, "build");

  if (existsSync(frontendRoot)) {
    runStep("Frontend type check", frontendRoot, "lint");
    runStep("Frontend build", frontendRoot, "build");
  } else {
    console.log(`[warn] Frontend project not found: ${frontendRoot}`);
  }

  if (process.env.ROLEOS_BUILD_RS_BINARY === "1") {
    runStep("RS binary packaging", projectRoot, "release:binaries");
  }

  step("Release readiness passed");
  console.log("All verification steps completed successfully.");
  console.log(`Backend dist: ${resolve(projectRoot, "dist")}`);
  if (existsSync(frontendRoot)) {
    console.log(`Frontend dist: ${resolve(frontendRoot, "dist")}`);
  }
  if (process.env.ROLEOS_BUILD_RS_BINARY === "1") {
    console.log(`RS binaries: ${resolve(projectRoot, "release")}`);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Release readiness failed: ${message}`);
  process.exit(1);
}
