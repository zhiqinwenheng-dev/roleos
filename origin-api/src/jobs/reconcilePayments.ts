import { cwd, env } from "node:process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { createAppContext } from "../bootstrap/context.js";
import { createCloudStore } from "../cloud/storeFactory.js";
import type { CloudStoreLike, PaymentOrderRow } from "../cloud/storeTypes.js";
import { nowIso } from "../utils/time.js";

interface GatewayStatusResponse {
  status: "pending" | "paid" | "failed";
  planCode?: string;
  providerTransactionId?: string;
}

export interface ReconcileOptions {
  staleMinutes: number;
  expireMinutes: number;
  limit: number;
  gatewayStatusUrl?: string;
  gatewayApiKey?: string;
}

export interface ReconcileSummary {
  scanned: number;
  paid: number;
  failed: number;
  expired: number;
  unchanged: number;
  errors: number;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function minutesAgoIso(minutes: number): string {
  const date = new Date(Date.now() - minutes * 60_000);
  return date.toISOString();
}

function toTimestamp(iso: string): number {
  return new Date(iso).getTime();
}

function shouldExpire(order: PaymentOrderRow, expireBeforeIso: string): boolean {
  return toTimestamp(order.createdAt) <= toTimestamp(expireBeforeIso);
}

async function fetchGatewayStatus(
  url: string,
  order: PaymentOrderRow,
  apiKey?: string
): Promise<GatewayStatusResponse | undefined> {
  const endpoint = new URL(url);
  endpoint.searchParams.set("orderId", order.id);
  endpoint.searchParams.set("providerOrderId", order.providerOrderId);
  endpoint.searchParams.set("workspaceId", order.workspaceId);

  const response = await fetch(endpoint, {
    headers: {
      accept: "application/json",
      ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {})
    }
  });
  if (!response.ok) {
    throw new Error(`Gateway status request failed with ${response.status}`);
  }

  const raw = (await response.json()) as Partial<GatewayStatusResponse>;
  if (raw.status !== "pending" && raw.status !== "paid" && raw.status !== "failed") {
    return undefined;
  }
  return {
    status: raw.status,
    planCode: raw.planCode,
    providerTransactionId: raw.providerTransactionId
  };
}

async function handlePaidOrder(
  store: CloudStoreLike,
  order: PaymentOrderRow,
  status: GatewayStatusResponse
): Promise<void> {
  const metadata: Record<string, string> = {
    reconciledAt: nowIso(),
    source: "reconcile-job"
  };
  if (status.providerTransactionId) {
    metadata.providerTransactionId = status.providerTransactionId;
  }

  await store.updatePaymentOrderStatus(order.id, "paid", metadata);
  await store.setWorkspaceSubscriptionPlanAndStatus(
    order.workspaceId,
    status.planCode ?? order.planCode,
    "active"
  );
  await store.addAuditEvent(order.workspaceId, "payment_reconciled_paid", `Order ${order.id}`, {
    planCode: status.planCode ?? order.planCode
  });
}

async function handleFailedOrder(
  store: CloudStoreLike,
  order: PaymentOrderRow,
  status: GatewayStatusResponse
): Promise<void> {
  const metadata: Record<string, string> = {
    reconciledAt: nowIso(),
    source: "reconcile-job"
  };
  if (status.providerTransactionId) {
    metadata.providerTransactionId = status.providerTransactionId;
  }

  await store.updatePaymentOrderStatus(order.id, "failed", metadata);
  await store.setWorkspaceSubscriptionStatus(order.workspaceId, "past_due");
  await store.addAuditEvent(
    order.workspaceId,
    "payment_reconciled_failed",
    `Order ${order.id}`,
    {}
  );
}

async function handleExpiredOrder(store: CloudStoreLike, order: PaymentOrderRow): Promise<void> {
  await store.updatePaymentOrderStatus(order.id, "expired", {
    reconciledAt: nowIso(),
    source: "reconcile-job",
    reason: "stale_pending_expired"
  });
  await store.addAuditEvent(order.workspaceId, "payment_reconciled_expired", `Order ${order.id}`, {
    planCode: order.planCode
  });
}

export async function reconcilePendingPayments(
  store: CloudStoreLike,
  options: ReconcileOptions
): Promise<ReconcileSummary> {
  const staleBefore = minutesAgoIso(options.staleMinutes);
  const expireBefore = minutesAgoIso(options.expireMinutes);
  const pendingOrders = await store.listPendingPaymentOrders(staleBefore, options.limit);

  const summary: ReconcileSummary = {
    scanned: pendingOrders.length,
    paid: 0,
    failed: 0,
    expired: 0,
    unchanged: 0,
    errors: 0
  };

  for (const order of pendingOrders) {
    try {
      let status: GatewayStatusResponse | undefined;
      if (options.gatewayStatusUrl) {
        status = await fetchGatewayStatus(
          options.gatewayStatusUrl,
          order,
          options.gatewayApiKey
        );
      }

      if (status?.status === "paid") {
        await handlePaidOrder(store, order, status);
        summary.paid += 1;
        continue;
      }
      if (status?.status === "failed") {
        await handleFailedOrder(store, order, status);
        summary.failed += 1;
        continue;
      }
      if (shouldExpire(order, expireBefore)) {
        await handleExpiredOrder(store, order);
        summary.expired += 1;
        continue;
      }

      summary.unchanged += 1;
    } catch {
      summary.errors += 1;
    }
  }

  return summary;
}

async function main(): Promise<void> {
  const workspaceRoot = env.ROLEOS_ROOT ?? cwd();
  const storeProvider =
    (env.ROLEOS_STORE_PROVIDER as "sqlite" | "supabase" | undefined) ?? "sqlite";
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  const staleMinutes = parsePositiveInt(env.ROLEOS_RECONCILE_STALE_MINUTES, 30);
  const expireMinutes = parsePositiveInt(env.ROLEOS_RECONCILE_EXPIRE_MINUTES, 24 * 60);
  const limit = parsePositiveInt(env.ROLEOS_RECONCILE_LIMIT, 200);
  const gatewayStatusUrl = env.ROLEOS_PERSONAL_GATEWAY_STATUS_URL;
  const gatewayApiKey = env.ROLEOS_PERSONAL_GATEWAY_API_KEY;

  const context = await createAppContext(workspaceRoot);
  const store = createCloudStore({
    provider: storeProvider,
    dbPath: context.dbPath,
    supabaseUrl,
    supabaseServiceRoleKey
  });

  const summary = await reconcilePendingPayments(store, {
    staleMinutes,
    expireMinutes,
    limit,
    gatewayStatusUrl,
    gatewayApiKey
  });

  console.log(
    JSON.stringify({
      ok: true,
      timestamp: nowIso(),
      summary
    })
  );
}

const isMain = process.argv[1]
  ? resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isMain) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      JSON.stringify({
        ok: false,
        timestamp: nowIso(),
        error: message
      })
    );
    process.exit(1);
  });
}

