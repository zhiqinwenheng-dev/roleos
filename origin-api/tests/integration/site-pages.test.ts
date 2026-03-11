import request from "supertest";
import { describe, expect, it } from "vitest";
import { createCloudApp } from "../../src/cloud/app.js";
import { createTempContext } from "../helpers/tempWorkspace.js";

describe("site pages", () => {
  it("serves all website, docs and app entry routes", async () => {
    const { context } = await createTempContext();
    const { app } = createCloudApp(context, {
      jwtSecret: "test-secret"
    });

    const routes = [
      "/",
      "/products",
      "/products/self-hosted",
      "/products/cloud",
      "/pricing",
      "/faq",
      "/login",
      "/signup",
      "/docs",
      "/docs/what-is-roleos",
      "/docs/core-objects",
      "/docs/self-hosted",
      "/docs/cloud",
      "/docs/faq",
      "/docs/changelog",
      "/app",
      "/app/billing",
      "/app/account",
      "/app/support",
      "/app/admin",
      "/app/self-hosted",
      "/app/self-hosted/downloads",
      "/app/self-hosted/config",
      "/app/cloud",
      "/app/cloud/onboarding",
      "/app/cloud/session"
    ] as const;

    for (const route of routes) {
      const response = await request(app).get(route);
      expect(response.status, route).toBe(200);
      expect(response.headers["content-type"], route).toContain("text/html");
    }
  });
});
