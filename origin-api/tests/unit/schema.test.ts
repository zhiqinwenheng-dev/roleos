import { describe, expect, it } from "vitest";
import { parseRegistryObject } from "../../src/core/schema.js";

describe("schema validation", () => {
  it("accepts valid role spec", () => {
    const role = parseRegistryObject({
      id: "r1",
      kind: "role",
      specVersion: "v1",
      lifecycle: "active",
      title: "Role",
      description: "desc",
      updatedAt: "2026-03-11T00:00:00.000Z",
      purpose: "do work",
      inputs: ["i"],
      outputs: ["o"],
      constraints: ["c"]
    });
    expect(role.kind).toBe("role");
  });

  it("rejects invalid spec version", () => {
    expect(() =>
      parseRegistryObject({
        id: "r1",
        kind: "role",
        specVersion: "v2",
        lifecycle: "active",
        title: "Role",
        description: "desc",
        updatedAt: "2026-03-11T00:00:00.000Z",
        purpose: "do work",
        inputs: ["i"],
        outputs: ["o"],
        constraints: ["c"]
      })
    ).toThrow();
  });
});
