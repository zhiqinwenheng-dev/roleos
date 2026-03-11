import { describe, expect, it } from "vitest";
import { createCloudStore } from "../../src/cloud/storeFactory.js";

describe("store factory", () => {
  it("creates sqlite store by default", () => {
    const store = createCloudStore({
      dbPath: "F:/codex/roleosbc/.roleos/test-factory.db"
    });
    expect(store).toBeDefined();
  });

  it("throws when supabase provider missing credentials", () => {
    expect(() =>
      createCloudStore({
        provider: "supabase",
        dbPath: "unused.db"
      })
    ).toThrow();
  });
});
