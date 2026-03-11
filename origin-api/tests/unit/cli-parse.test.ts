import { describe, expect, it } from "vitest";
import {
  normalizeRoleosArgv,
  parseArgv,
  parseSlashCommandLine
} from "../../src/cli/parse.js";

describe("cli parse", () => {
  it("parses slash command argv", () => {
    const parsed = parseArgv(["/roleos", "team", "content-team-mvp", "--intent", "hello"]);
    expect(parsed.name).toBe("team");
    expect(parsed.args[0]).toBe("content-team-mvp");
    expect(parsed.flags.intent).toBe("hello");
  });

  it("parses plain text slash command", () => {
    const parsed = parseSlashCommandLine('/roleos install content-starter-kit --json');
    expect(parsed.name).toBe("install");
    expect(parsed.args[0]).toBe("content-starter-kit");
    expect(parsed.flags.json).toBe(true);
  });

  it("supports doctor command", () => {
    const parsed = parseArgv(["/roleos", "doctor"]);
    expect(parsed.name).toBe("doctor");
  });

  it("supports market command", () => {
    const parsed = parseArgv(["/roleos", "market"]);
    expect(parsed.name).toBe("market");
  });

  it("normalizes argv from node script mode", () => {
    const argv = normalizeRoleosArgv([
      "node",
      "dist/src/cli/main.js",
      "/roleos",
      "setup",
      "--yes"
    ]);
    expect(argv).toEqual(["/roleos", "setup", "--yes"]);
  });

  it("normalizes argv from SEA binary mode", () => {
    const argv = normalizeRoleosArgv([
      "roleos-win32-x64.exe",
      "/roleos",
      "setup",
      "--yes"
    ]);
    expect(argv).toEqual(["/roleos", "setup", "--yes"]);
  });

  it("normalizes argv from SEA mode with duplicated executable path", () => {
    const argv = normalizeRoleosArgv([
      "C:\\release\\roleos-win32-x64.exe",
      "C:\\release\\roleos-win32-x64.exe",
      "/roleos",
      "setup",
      "--yes"
    ]);
    expect(argv).toEqual(["/roleos", "setup", "--yes"]);
  });
});
