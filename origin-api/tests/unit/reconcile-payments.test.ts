import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createCloudApp } from "../../src/cloud/app.js";
import { reconcilePendingPayments } from "../../src/jobs/reconcilePayments.js";
import { createTempContext } from "../helpers/tempWorkspace.js";

describe("payment reconciliation job", () => {
  it("expires stale pending orders", async () => {
    const { context } = await createTempContext();
    const { app, store } = createCloudApp(context, {
      jwtSecret: "test-secret",
      paymentWebhookSecret: "pay-key"
    });

    const register = await request(app).post("/auth/register").send({
      email: "reconcile-expire@example.com",
      password: "password123",
      workspaceName: "Reconcile Expire"
    });
    expect(register.status).toBe(201);

    const token = register.body.token as string;
    const workspaceId = register.body.workspace.id as string;

    const checkout = await request(app)
      .post(`/workspaces/${workspaceId}/billing/checkout`)
      .set("Authorization", `Bearer ${token}`)
      .send({ planCode: "pro" });
    expect(checkout.status).toBe(201);

    const orderId = checkout.body.order.id as string;
    const summary = await reconcilePendingPayments(store, {
      staleMinutes: 0,
      expireMinutes: 0,
      limit: 50
    });
    expect(summary.scanned).toBeGreaterThanOrEqual(1);
    expect(summary.expired).toBeGreaterThanOrEqual(1);

    const order = await store.getPaymentOrder(orderId);
    expect(order?.status).toBe("expired");
  });

  it("marks order paid from gateway status and upgrades subscription", async () => {
    const { context } = await createTempContext();
    const { app, store } = createCloudApp(context, {
      jwtSecret: "test-secret",
      paymentWebhookSecret: "pay-key"
    });

    const register = await request(app).post("/auth/register").send({
      email: "reconcile-paid@example.com",
      password: "password123",
      workspaceName: "Reconcile Paid"
    });
    expect(register.status).toBe(201);

    const token = register.body.token as string;
    const workspaceId = register.body.workspace.id as string;

    const checkout = await request(app)
      .post(`/workspaces/${workspaceId}/billing/checkout`)
      .set("Authorization", `Bearer ${token}`)
      .send({ planCode: "business" });
    expect(checkout.status).toBe(201);

    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          status: "paid",
          planCode: "business",
          providerTransactionId: "txn_reconciled"
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" }
        }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    try {
      const summary = await reconcilePendingPayments(store, {
        staleMinutes: 0,
        expireMinutes: 24 * 60,
        limit: 50,
        gatewayStatusUrl: "https://gateway.example/status"
      });
      expect(summary.scanned).toBeGreaterThanOrEqual(1);
      expect(summary.paid).toBeGreaterThanOrEqual(1);

      const subscription = await store.getWorkspaceSubscription(workspaceId);
      expect(subscription?.planCode).toBe("business");
      expect(subscription?.status).toBe("active");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

