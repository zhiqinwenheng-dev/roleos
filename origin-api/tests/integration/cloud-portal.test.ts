import request from "supertest";
import { describe, expect, it } from "vitest";
import { createCloudApp } from "../../src/cloud/app.js";
import { createTempContext } from "../helpers/tempWorkspace.js";

describe("cloud portal entry", () => {
  it("serves marketing pages and portal page", async () => {
    const { context } = await createTempContext();
    const { app } = createCloudApp(context, {
      jwtSecret: "test-secret"
    });

    const root = await request(app).get("/");
    expect(root.status).toBe(200);
    expect(root.text).toContain("RoleOS.ai");
    expect(root.text).toContain("Start Rc Cloud");

    const pricing = await request(app).get("/pricing");
    expect(pricing.status).toBe(200);
    expect(pricing.text).toContain("¥199");

    const portal = await request(app).get("/portal");
    expect(portal.status).toBe(200);
    expect(portal.text).toContain("RoleOS Rc Cloud");
    expect(portal.text).toContain("注册并登录");
  });

  it("exposes shared market catalog", async () => {
    const { context } = await createTempContext();
    const { app } = createCloudApp(context, {
      jwtSecret: "test-secret"
    });

    const catalog = await request(app).get("/market/catalog");
    expect(catalog.status).toBe(200);
    expect(catalog.body.catalog.kind).toBe("market-catalog");
    expect(Array.isArray(catalog.body.catalog.billingModes)).toBe(true);
  });
});
