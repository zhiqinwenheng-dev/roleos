import request from "supertest";
import { describe, expect, it } from "vitest";
import { createCloudApp } from "../../src/cloud/app.js";
import { computeWebhookSignature } from "../../src/cloud/security.js";
import { createTempContext } from "../helpers/tempWorkspace.js";

describe("commercialization and operations flow", () => {
  function signedPayload(secret: string, payload: Record<string, unknown>) {
    const body = JSON.stringify(payload);
    const signature = computeWebhookSignature(secret, body);
    return {
      body,
      signature: `sha256=${signature}`
    };
  }

  it("supports subscription, billing usage, idempotency and admin ops metrics", async () => {
    const { context } = await createTempContext();
    const { app } = createCloudApp(context, {
      jwtSecret: "test-secret",
      adminApiKey: "ops-key",
      paymentWebhookSecret: "pay-key",
      defaultPlanCode: "starter"
    });

    const register = await request(app).post("/auth/register").send({
      email: "biz@example.com",
      password: "password123",
      workspaceName: "Biz Workspace"
    });
    expect(register.status).toBe(201);
    const token = register.body.token as string;
    const workspaceId = register.body.workspace.id as string;
    expect(register.body.subscription.planCode).toBe("starter");

    const firstRun = await request(app)
      .post(`/workspaces/${workspaceId}/team/run`)
      .set("Authorization", `Bearer ${token}`)
      .set("Idempotency-Key", "run-1")
      .send({
        intent: "Create a launch outline"
      });
    expect([200, 500]).toContain(firstRun.status);
    const runId = firstRun.body.run.id as string;
    expect(runId).toBeTruthy();

    const secondRun = await request(app)
      .post(`/workspaces/${workspaceId}/team/run`)
      .set("Authorization", `Bearer ${token}`)
      .set("Idempotency-Key", "run-1")
      .send({
        intent: "Create a launch outline"
      });
    expect(secondRun.status).toBe(200);
    expect(secondRun.body.repeated).toBe(true);
    expect(secondRun.body.run.id).toBe(runId);

    const usageResponse = await request(app)
      .get(`/workspaces/${workspaceId}/billing/usage`)
      .set("Authorization", `Bearer ${token}`);
    expect(usageResponse.status).toBe(200);
    expect(usageResponse.body.usage.totalRuns).toBe(1);
    expect(usageResponse.body.usage.mrrUsd).toBeGreaterThan(0);

    const changePlan = await request(app)
      .post(`/workspaces/${workspaceId}/subscription`)
      .set("Authorization", `Bearer ${token}`)
      .send({ planCode: "pro" });
    expect(changePlan.status).toBe(200);
    expect(changePlan.body.subscription.planCode).toBe("pro");

    const checkout = await request(app)
      .post(`/workspaces/${workspaceId}/billing/checkout`)
      .set("Authorization", `Bearer ${token}`)
      .send({ planCode: "business" });
    expect(checkout.status).toBe(201);
    expect(checkout.body.order.id).toBeTruthy();
    expect(checkout.body.order.checkoutUrl).toContain("planCode=business");

    const personalWebhookPayload = {
      orderId: checkout.body.order.id,
      workspaceId,
      status: "paid",
      planCode: "business",
      providerTransactionId: "txn_123"
    } as const;
    const personalWebhookSigned = signedPayload("pay-key", personalWebhookPayload);
    const personalWebhook = await request(app)
      .post("/billing/webhooks/personal-gateway")
      .set("x-roleos-signature", personalWebhookSigned.signature)
      .set("Content-Type", "application/json")
      .send(personalWebhookSigned.body);
    expect(personalWebhook.status).toBe(200);
    expect(personalWebhook.body.subscription.planCode).toBe("business");
    expect(personalWebhook.body.subscription.status).toBe("active");

    const webhookPayload = {
      type: "invoice.payment_failed",
      workspaceId
    } as const;
    const webhookSigned = signedPayload("pay-key", webhookPayload);
    const webhookResult = await request(app)
      .post("/billing/webhooks/payments")
      .set("x-roleos-signature", webhookSigned.signature)
      .set("Content-Type", "application/json")
      .send(webhookSigned.body);
    expect(webhookResult.status).toBe(200);
    expect(webhookResult.body.subscription.status).toBe("past_due");

    const adminOverview = await request(app)
      .get("/admin/ops/overview")
      .set("x-roleos-admin-key", "ops-key");
    expect(adminOverview.status).toBe(200);
    expect(adminOverview.body.overview.users).toBeGreaterThanOrEqual(1);
    expect(adminOverview.body.overview.workspaces).toBeGreaterThanOrEqual(1);

    const metricsResponse = await request(app)
      .get("/metrics")
      .set("x-roleos-admin-key", "ops-key");
    expect(metricsResponse.status).toBe(200);
    expect(metricsResponse.text).toContain("roleos_http_requests_total");
    expect(metricsResponse.text).toContain("roleos_team_runs_total");
  });

  it("rejects webhook payload with invalid signature", async () => {
    const { context } = await createTempContext();
    const { app } = createCloudApp(context, {
      jwtSecret: "test-secret",
      paymentWebhookSecret: "pay-key"
    });

    const badPayload = {
      type: "invoice.paid",
      workspaceId: "unknown-workspace"
    };
    const response = await request(app)
      .post("/billing/webhooks/payments")
      .set("x-roleos-signature", "sha256=bad-signature")
      .set("Content-Type", "application/json")
      .send(JSON.stringify(badPayload));

    expect(response.status).toBe(403);
    expect(response.body.ok).toBe(false);
  });

  it("enforces trial plan run limit", async () => {
    const { context } = await createTempContext();
    const { app } = createCloudApp(context, {
      jwtSecret: "test-secret",
      defaultPlanCode: "trial"
    });

    const register = await request(app).post("/auth/register").send({
      email: "trial@example.com",
      password: "password123",
      workspaceName: "Trial Workspace"
    });
    expect(register.status).toBe(201);
    const token = register.body.token as string;
    const workspaceId = register.body.workspace.id as string;

    for (let i = 0; i < 3; i += 1) {
      const runResponse = await request(app)
        .post(`/workspaces/${workspaceId}/team/run`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          intent: `Trial run ${i + 1}`
        });
      expect([200, 500]).toContain(runResponse.status);
    }

    const blockedRun = await request(app)
      .post(`/workspaces/${workspaceId}/team/run`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        intent: "Trial run over limit"
      });
    expect(blockedRun.status).toBe(402);
  });
});
