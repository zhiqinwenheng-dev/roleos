import request from "supertest";
import { describe, expect, it } from "vitest";
import { createCloudApp } from "../../src/cloud/app.js";
import { computeWebhookSignature } from "../../src/cloud/security.js";
import { createTempContext } from "../helpers/tempWorkspace.js";

function signedPayload(secret: string, payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);
  const signature = computeWebhookSignature(secret, body);
  return {
    body,
    signature: `sha256=${signature}`
  };
}

describe("admin and self-hosted APIs", () => {
  it("supports account center, self-hosted entitlement, and admin operations", async () => {
    const { context } = await createTempContext();
    const { app } = createCloudApp(context, {
      jwtSecret: "test-secret",
      adminApiKey: "ops-key",
      paymentWebhookSecret: "pay-key"
    });

    const register = await request(app).post("/auth/register").send({
      email: "ops@example.com",
      password: "password123",
      workspaceName: "Ops Workspace"
    });
    expect(register.status).toBe(201);
    const token = register.body.token as string;
    const workspaceId = register.body.workspace.id as string;

    const me = await request(app).get("/auth/me").set("Authorization", `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe("ops@example.com");
    expect(Array.isArray(me.body.workspaceStatuses)).toBe(true);

    const dashboard = await request(app)
      .get(`/workspaces/${workspaceId}/dashboard`)
      .set("Authorization", `Bearer ${token}`);
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.workspace.id).toBe(workspaceId);

    const rsCheckout = await request(app)
      .post(`/workspaces/${workspaceId}/self-hosted/checkout`)
      .set("Authorization", `Bearer ${token}`)
      .send({});
    expect(rsCheckout.status).toBe(201);
    expect(rsCheckout.body.order.planCode).toBe("rs-self-hosted");

    const paidPayload = {
      orderId: rsCheckout.body.order.id,
      workspaceId,
      status: "paid",
      planCode: "rs-self-hosted"
    };
    const paidSigned = signedPayload("pay-key", paidPayload);
    const paidWebhook = await request(app)
      .post("/billing/webhooks/personal-gateway")
      .set("x-roleos-signature", paidSigned.signature)
      .set("Content-Type", "application/json")
      .send(paidSigned.body);
    expect(paidWebhook.status).toBe(200);
    expect(paidWebhook.body.selfHostedEntitlement.status).toBe("active");

    const rsEntitlement = await request(app)
      .get(`/workspaces/${workspaceId}/self-hosted/entitlement`)
      .set("Authorization", `Bearer ${token}`);
    expect(rsEntitlement.status).toBe(200);
    expect(rsEntitlement.body.entitlement.status).toBe("active");

    const rsArtifacts = await request(app)
      .get(`/workspaces/${workspaceId}/self-hosted/artifacts`)
      .set("Authorization", `Bearer ${token}`);
    expect(rsArtifacts.status).toBe(200);
    expect(Array.isArray(rsArtifacts.body.artifacts)).toBe(true);

    const adminUsers = await request(app)
      .get("/admin/users?limit=10&offset=0")
      .set("x-roleos-admin-key", "ops-key");
    expect(adminUsers.status).toBe(200);
    expect(Array.isArray(adminUsers.body.users)).toBe(true);

    const adminWorkspaces = await request(app)
      .get("/admin/workspaces")
      .set("x-roleos-admin-key", "ops-key");
    expect(adminWorkspaces.status).toBe(200);
    expect(Array.isArray(adminWorkspaces.body.workspaces)).toBe(true);

    const adminOrders = await request(app)
      .get("/admin/orders")
      .set("x-roleos-admin-key", "ops-key");
    expect(adminOrders.status).toBe(200);
    expect(Array.isArray(adminOrders.body.orders)).toBe(true);

    const adminRuns = await request(app)
      .get("/admin/runs")
      .set("x-roleos-admin-key", "ops-key");
    expect(adminRuns.status).toBe(200);
    expect(Array.isArray(adminRuns.body.runs)).toBe(true);

    const setEntitlement = await request(app)
      .put(`/admin/workspaces/${workspaceId}/self-hosted/entitlement`)
      .set("x-roleos-admin-key", "ops-key")
      .send({
        packageCode: "rs-standard",
        status: "revoked"
      });
    expect(setEntitlement.status).toBe(200);
    expect(setEntitlement.body.entitlement.status).toBe("revoked");

    const setSubscription = await request(app)
      .put(`/admin/workspaces/${workspaceId}/subscription`)
      .set("x-roleos-admin-key", "ops-key")
      .send({
        planCode: "pro",
        status: "active"
      });
    expect(setSubscription.status).toBe(200);
    expect(setSubscription.body.subscription.planCode).toBe("pro");
  });
});

