import request from "supertest";
import { describe, expect, it } from "vitest";
import { createCloudApp } from "../../src/cloud/app.js";
import { createTempContext } from "../helpers/tempWorkspace.js";

describe("cloud console ui", () => {
  it("serves interactive cloud console pages", async () => {
    const { context } = await createTempContext();
    const { app } = createCloudApp(context, {
      jwtSecret: "test-secret"
    });

    const home = await request(app).get("/app/cloud");
    expect(home.status).toBe(200);
    expect(home.text).toContain("RoleOS Cloud 控制台测试版");
    expect(home.text).toContain("Start Team Run");

    const onboarding = await request(app).get("/app/cloud/onboarding");
    expect(onboarding.status).toBe(200);
    expect(onboarding.text).toContain("Cloud Onboarding Flow");
    expect(onboarding.text).toContain("Step 3: 执行 Team Run");

    const session = await request(app).get("/app/cloud/session");
    expect(session.status).toBe(200);
    expect(session.text).toContain("Cloud Session Workspace");
    expect(session.text).toContain("Fetch Run By ID");
  });

  it("redirects login success to cloud console", async () => {
    const { context } = await createTempContext();
    const { app } = createCloudApp(context, {
      jwtSecret: "test-secret"
    });

    const login = await request(app).get("/login");
    expect(login.status).toBe(200);
    expect(login.text).toContain('location.href = "/app/cloud";');
  });
});
