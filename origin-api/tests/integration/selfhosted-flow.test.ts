import { describe, expect, it } from "vitest";
import { parseArgv } from "../../src/cli/parse.js";
import { SelfHostedCommandService } from "../../src/selfhosted/commandService.js";
import { createTempContext } from "../helpers/tempWorkspace.js";

describe("self-hosted flow", () => {
  it("completes setup to first team run", async () => {
    const { context } = await createTempContext();
    const service = new SelfHostedCommandService(
      context.registryService,
      context.stateStore,
      context.installer,
      context.runner,
      context.registryRoot
    );

    const setupResponse = await service.execute(parseArgv(["/roleos", "setup", "--yes"]));
    expect(setupResponse.ok).toBe(true);

    const teamResponse = await service.execute(
      parseArgv([
        "/roleos",
        "team",
        "content-team-mvp",
        "--intent",
        "Create an initial marketing draft"
      ])
    );

    expect(teamResponse.ok).toBe(true);
    const run = teamResponse.data as { status: string; output: string };
    expect(run.status).toBe("success");
    expect(run.output).toContain("Role");
  });

  it("loads shared market catalog via CLI command", async () => {
    const { context } = await createTempContext();
    const service = new SelfHostedCommandService(
      context.registryService,
      context.stateStore,
      context.installer,
      context.runner,
      context.registryRoot
    );

    const marketResponse = await service.execute(parseArgv(["/roleos", "market"]));
    expect(marketResponse.ok).toBe(true);
    const data = marketResponse.data as { kind: string; billingModes: unknown[] };
    expect(data.kind).toBe("market-catalog");
    expect(Array.isArray(data.billingModes)).toBe(true);
  });
});
