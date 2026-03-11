import request from "supertest";
import { describe, expect, it } from "vitest";
import { createCloudApp } from "../../src/cloud/app.js";
import { createTempContext } from "../helpers/tempWorkspace.js";

describe("cloud flow", () => {
  it("completes register -> activate kit -> run -> fetch run", async () => {
    const { context } = await createTempContext();
    const { app } = createCloudApp(context, {
      jwtSecret: "test-secret"
    });

    const registerResponse = await request(app).post("/auth/register").send({
      email: "cloud@example.com",
      password: "password123",
      workspaceName: "Cloud Workspace"
    });
    expect(registerResponse.status).toBe(201);
    const token = registerResponse.body.token as string;
    const workspaceId = registerResponse.body.workspace.id as string;

    const rolesResponse = await request(app)
      .get(`/workspaces/${workspaceId}/roles`)
      .set("Authorization", `Bearer ${token}`);
    expect(rolesResponse.status).toBe(200);
    expect(rolesResponse.body.roles.length).toBe(1);

    const kitId = "content-starter-kit";
    const activateResponse = await request(app)
      .post(`/workspaces/${workspaceId}/kits/${kitId}/activate`)
      .set("Authorization", `Bearer ${token}`);
    expect(activateResponse.status).toBe(200);

    const runResponse = await request(app)
      .post(`/workspaces/${workspaceId}/team/run`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        intent: "Prepare a concise launch announcement"
      });
    expect([200, 500]).toContain(runResponse.status);
    expect(runResponse.body.run).toBeDefined();

    const runId = runResponse.body.run.id as string;
    const getRunResponse = await request(app)
      .get(`/workspaces/${workspaceId}/runs/${runId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(getRunResponse.status).toBe(200);
    expect(getRunResponse.body.run.id).toBe(runId);
  });
});
