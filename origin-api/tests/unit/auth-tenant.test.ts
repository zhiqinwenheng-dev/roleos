import request from "supertest";
import { describe, expect, it } from "vitest";
import { createCloudApp } from "../../src/cloud/app.js";
import { createTempContext } from "../helpers/tempWorkspace.js";

describe("auth and tenant isolation", () => {
  it("blocks workspace access from non-member user", async () => {
    const { context } = await createTempContext();
    const { app } = createCloudApp(context, {
      jwtSecret: "test-secret"
    });

    const user1 = await request(app).post("/auth/register").send({
      email: "u1@example.com",
      password: "password123",
      workspaceName: "W1"
    });
    const user2 = await request(app).post("/auth/register").send({
      email: "u2@example.com",
      password: "password123",
      workspaceName: "W2"
    });

    const token1 = user1.body.token as string;
    const workspace2 = user2.body.workspace.id as string;

    const response = await request(app)
      .get(`/workspaces/${workspace2}/roles`)
      .set("Authorization", `Bearer ${token1}`);

    expect(response.status).toBe(403);
  });
});
