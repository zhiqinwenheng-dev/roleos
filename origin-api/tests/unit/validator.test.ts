import { describe, expect, it } from "vitest";
import { validateRegistryBundle } from "../../src/core/validator.js";

describe("registry dependency validation", () => {
  it("detects unknown role refs in kit", () => {
    const report = validateRegistryBundle({
      records: [
        {
          object: {
            id: "kit-a",
            kind: "kit",
            specVersion: "v1",
            lifecycle: "active",
            title: "Kit A",
            description: "desc",
            updatedAt: "2026-03-11T00:00:00.000Z",
            requiredAssets: [],
            installTarget: "workspace",
            modelPolicy: {
              name: "default",
              temperature: 0.4,
              maxTokens: 1024
            },
            docs: "docs",
            checks: [],
            version: "1.0.0",
            roleRefs: ["missing-role"]
          },
          filePath: "/tmp/kit.json",
          hash: "h",
          raw: "{}"
        }
      ]
    });

    expect(report.valid).toBe(false);
    expect(report.issues.some((issue) => issue.code === "unknown_reference")).toBe(true);
  });
});
