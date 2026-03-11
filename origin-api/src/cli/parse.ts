import { basename } from "node:path";
import type { ParsedCommand, RoleosCommandName } from "./types.js";

const allowedCommands: RoleosCommandName[] = [
  "setup",
  "doctor",
  "market",
  "role",
  "kit",
  "install",
  "uninstall",
  "switch-kit",
  "team",
  "help"
];

function looksLikeScriptPath(value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    normalized.endsWith(".js") ||
    normalized.endsWith(".cjs") ||
    normalized.endsWith(".mjs") ||
    normalized.endsWith(".ts") ||
    normalized.includes("\\src\\cli\\") ||
    normalized.includes("/src/cli/")
  );
}

export function normalizeRoleosArgv(processArgv: string[]): string[] {
  if (processArgv.length <= 1) {
    return [];
  }

  const first = processArgv[0] ?? "";
  const second = processArgv[1] ?? "";
  if (
    second === first ||
    (basename(second).length > 0 && basename(second) === basename(first))
  ) {
    return processArgv.slice(2);
  }
  if (looksLikeScriptPath(second)) {
    return processArgv.slice(2);
  }
  return processArgv.slice(1);
}

function tokenize(input: string): string[] {
  const tokens = input.match(/"[^"]*"|'[^']*'|\S+/g) ?? [];
  return tokens.map((token) => token.replace(/^['"]|['"]$/g, ""));
}

export function parseSlashCommandLine(line: string): ParsedCommand {
  return parseArgv(tokenize(line));
}

export function parseArgv(argv: string[]): ParsedCommand {
  const normalized = [...argv];
  if (normalized[0] === "/roleos" || normalized[0] === "roleos") {
    normalized.shift();
  }

  const first = (normalized.shift() ?? "help").toLowerCase();
  const name = (allowedCommands.includes(first as RoleosCommandName)
    ? first
    : "help") as RoleosCommandName;

  const args: string[] = [];
  const flags: Record<string, string | boolean> = {};
  while (normalized.length > 0) {
    const token = normalized.shift() as string;
    if (!token.startsWith("--")) {
      args.push(token);
      continue;
    }
    const key = token.slice(2);
    if (normalized[0] && !normalized[0].startsWith("--")) {
      flags[key] = normalized.shift() as string;
    } else {
      flags[key] = true;
    }
  }

  return {
    name,
    args,
    flags
  };
}
