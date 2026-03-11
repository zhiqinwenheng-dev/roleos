import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

export function loadEnvFile(filePath) {
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
    // Ignore missing env files.
  }
}

export function loadDefaultEnv(projectRoot, frontendRoot) {
  loadEnvFile(resolve(projectRoot, ".env.production"));
  loadEnvFile(resolve(projectRoot, ".env"));
  if (frontendRoot) {
    loadEnvFile(resolve(frontendRoot, ".env.production"));
    loadEnvFile(resolve(frontendRoot, ".env"));
  }
}

export function requireEnv(keys) {
  const missing = keys.filter((key) => {
    const value = process.env[key];
    return typeof value !== "string" || value.trim().length === 0;
  });
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
}

export function step(title) {
  console.log(`\n=== ${title} ===`);
}

export function run(command, args, options = {}) {
  const printable = [command, ...args].join(" ");
  console.log(`\n[run] ${printable}`);
  const commandLine = [command, ...args.map((item) => quoteArg(String(item)))].join(" ");
  execSync(commandLine, {
    stdio: "inherit",
    ...options
  });
}

export function npmCommand() {
  return "npm";
}

export function npxCommand() {
  return "npx";
}

function quoteArg(value) {
  if (value.length === 0) {
    return process.platform === "win32" ? "\"\"" : "''";
  }
  if (/^[A-Za-z0-9_./:=+,\-]+$/.test(value)) {
    return value;
  }
  if (process.platform === "win32") {
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
