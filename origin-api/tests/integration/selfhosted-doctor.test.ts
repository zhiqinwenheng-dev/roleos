import { describe, expect, it } from "vitest";
import { parseArgv } from "../../src/cli/parse.js";
import { SelfHostedCommandService } from "../../src/selfhosted/commandService.js";
import { createTempContext } from "../helpers/tempWorkspace.js";

describe("self-hosted doctor command", () => {
  it("reports connectivity issues with unreachable OpenClaw endpoint", async () => {
    const { context } = await createTempContext();
    const service = new SelfHostedCommandService(
      context.registryService,
      context.stateStore,
      context.installer,
      context.runner,
      context.registryRoot
    );

    const setup = await service.execute(
      parseArgv([
        "/roleos",
        "setup",
        "--yes",
        "--no-verify",
        "--openclaw-endpoint",
        "http://127.0.0.1:1"
      ])
    );
    expect(setup.ok).toBe(true);

    const doctor = await service.execute(parseArgv(["/roleos", "doctor"]));
    expect(doctor.ok).toBe(false);
    const data = doctor.data as { connectivity: { openClaw: { ok: boolean } } };
    expect(data.connectivity.openClaw.ok).toBe(false);
  });
});
