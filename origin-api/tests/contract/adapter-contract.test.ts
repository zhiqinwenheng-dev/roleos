import { describe, expect, it } from "vitest";
import { DeterministicOpenClawAdapter } from "../../src/adapter/openclawAdapter.js";
import { createTempContext } from "../helpers/tempWorkspace.js";

describe("adapter contract parity", () => {
  it("produces identical runtime mapping for self-hosted and cloud", async () => {
    const { context } = await createTempContext();
    await context.registryService.sync();

    const [role, kit, team] = await Promise.all([
      context.registryService.getDefaultRole(),
      context.registryService.getDefaultKit(),
      context.registryService.getDefaultTeam()
    ]);

    const adapter = new DeterministicOpenClawAdapter();
    const selfHostedMapping = adapter.mapToRuntime({
      workspaceId: "w1",
      source: "self-hosted",
      intent: "Draft a launch post",
      role,
      kit,
      team
    });
    const cloudMapping = adapter.mapToRuntime({
      workspaceId: "w1",
      source: "cloud",
      intent: "Draft a launch post",
      role,
      kit,
      team
    });

    expect(selfHostedMapping.actions).toEqual(cloudMapping.actions);
    expect(selfHostedMapping.roleId).toBe(cloudMapping.roleId);
    expect(selfHostedMapping.kitId).toBe(cloudMapping.kitId);
    expect(selfHostedMapping.teamId).toBe(cloudMapping.teamId);
  });
});
