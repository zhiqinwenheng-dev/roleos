import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { build as esbuild } from "esbuild";

const SEA_FUSE = "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2";
const SEA_RESOURCE_KEY = "NODE_SEA_BLOB";

function run(command, args, options = {}) {
  execFileSync(command, args, {
    stdio: "inherit",
    ...options
  });
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");
const cliEntry = join(projectRoot, "src", "cli", "main.ts");
if (!existsSync(cliEntry)) {
  throw new Error(`CLI entry not found: ${cliEntry}.`);
}

const tempDir = join(projectRoot, ".roleos", "sea");
mkdirSync(tempDir, { recursive: true });
const blobPath = join(tempDir, "roleos.blob");
const configPath = join(tempDir, "sea-config.json");
const bundledEntry = join(tempDir, "cli-bundle.cjs");

await esbuild({
  entryPoints: [cliEntry],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  outfile: bundledEntry,
  sourcemap: false,
  legalComments: "none"
});

const seaConfig = {
  main: bundledEntry,
  output: blobPath,
  disableExperimentalSEAWarning: true
};
writeFileSync(configPath, `${JSON.stringify(seaConfig, null, 2)}\n`, "utf8");

run(process.execPath, ["--experimental-sea-config", configPath], {
  cwd: projectRoot
});

const releaseDir = join(projectRoot, "release");
mkdirSync(releaseDir, { recursive: true });
const extension = process.platform === "win32" ? ".exe" : "";
const outputPath = join(
  releaseDir,
  `roleos-${process.platform}-${process.arch}${extension}`
);
if (existsSync(outputPath)) {
  rmSync(outputPath);
}
copyFileSync(process.execPath, outputPath);

if (process.platform === "darwin") {
  try {
    run("codesign", ["--remove-signature", outputPath]);
  } catch {
    // Keep going; some environments may not require this.
  }
}

const require = createRequire(import.meta.url);
const postjectCli = require.resolve("postject/dist/cli.js");
run(process.execPath, [
  postjectCli,
  outputPath,
  SEA_RESOURCE_KEY,
  blobPath,
  "--sentinel-fuse",
  SEA_FUSE
]);

if (process.platform === "darwin") {
  try {
    run("codesign", ["--sign", "-", outputPath]);
  } catch {
    // Keep unsigned if ad-hoc signing is unavailable.
  }
}

console.log(`SEA binary created: ${outputPath}`);
