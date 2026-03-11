import { useEffect, useState } from "react";
import {
  createCheckout,
  createSelfHostedCheckout,
  fetchMarketCatalog,
  fetchPaymentOrders,
  fetchPlans,
  fetchSelfHostedEntitlement,
  fetchSelfHostedOrders,
  fetchSubscription,
  fetchUsage,
  readSession,
  switchSubscription,
  type BillingModeInfo,
  type PaymentOrder,
  type PlanInfo,
  type SelfHostedEntitlement,
  type WorkspaceInfo
} from "../lib/roleosApi";

export default function BillingPage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [billingModes, setBillingModes] = useState<BillingModeInfo[]>([]);
  const [planCode, setPlanCode] = useState("trial");
  const [billingMode, setBillingMode] = useState<"api_token" | "compute_token">("api_token");

  const [subscription, setSubscription] = useState<unknown>(null);
  const [usage, setUsage] = useState<unknown>(null);
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [selfHostedOrders, setSelfHostedOrders] = useState<PaymentOrder[]>([]);
  const [entitlement, setEntitlement] = useState<SelfHostedEntitlement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function currentWorkspaceId(): string {
    return workspaceId || workspaces[0]?.id || "";
  }

  async function refreshWorkspacePanels(targetWorkspaceId?: string) {
    const wid = targetWorkspaceId || currentWorkspaceId();
    if (!wid) {
      return;
    }
    const [subRes, usageRes, orderRes, entitlementRes, rsOrdersRes] = await Promise.all([
      fetchSubscription(wid),
      fetchUsage(wid),
      fetchPaymentOrders(wid),
      fetchSelfHostedEntitlement(wid),
      fetchSelfHostedOrders(wid)
    ]);
    setSubscription(subRes.subscription);
    setUsage(usageRes.usage);
    setOrders(orderRes.orders);
    setEntitlement(entitlementRes.entitlement);
    setSelfHostedOrders(rsOrdersRes.orders);
  }

  async function safeRun(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const session = readSession();
    setWorkspaces(session.workspaces);
    if (session.workspaces[0]?.id) {
      setWorkspaceId(session.workspaces[0].id);
    }

    safeRun(async () => {
      const [plansRes, marketRes] = await Promise.all([fetchPlans(), fetchMarketCatalog()]);
      setPlans(plansRes.plans);
      if (plansRes.plans[0]?.code) {
        setPlanCode(plansRes.plans[0].code);
      }
      setBillingModes(marketRes.catalog.billingModes);
      if (marketRes.catalog.billingModes[0]?.id) {
        setBillingMode(marketRes.catalog.billingModes[0].id);
      }
      if (session.workspaces[0]?.id) {
        await refreshWorkspacePanels(session.workspaces[0].id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onWorkspaceChange(nextWorkspaceId: string) {
    setWorkspaceId(nextWorkspaceId);
    await safeRun(async () => {
      await refreshWorkspacePanels(nextWorkspaceId);
    });
  }

  async function onSwitchPlan() {
    await safeRun(async () => {
      const wid = currentWorkspaceId();
      if (!wid) {
        throw new Error("No workspace selected.");
      }
      await switchSubscription(wid, planCode);
      await refreshWorkspacePanels(wid);
    });
  }

  async function onCreateCloudCheckout() {
    await safeRun(async () => {
      const wid = currentWorkspaceId();
      if (!wid) {
        throw new Error("No workspace selected.");
      }
      const result = await createCheckout(wid, planCode, billingMode);
      if (result.order.checkoutUrl) {
        window.open(result.order.checkoutUrl, "_blank", "noopener,noreferrer");
      }
      await refreshWorkspacePanels(wid);
    });
  }

  async function onCreateRsCheckout() {
    await safeRun(async () => {
      const wid = currentWorkspaceId();
      if (!wid) {
        throw new Error("No workspace selected.");
      }
      const result = await createSelfHostedCheckout(wid);
      if (result.order.checkoutUrl) {
        window.open(result.order.checkoutUrl, "_blank", "noopener,noreferrer");
      }
      await refreshWorkspacePanels(wid);
    });
  }

  return (
    <div className="pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <section className="rounded-3xl bg-black text-white p-8 mb-6">
        <h1 className="text-3xl font-bold">Billing Center</h1>
        <p className="text-white/60 mt-2">
          Manage Rc cloud subscription and RS self-hosted purchase from one workspace account.
        </p>
      </section>

      {error ? <div className="mb-4 text-sm text-red-600">{error}</div> : null}

      <section className="rounded-2xl border border-black/10 bg-white p-6 mb-6">
        <label className="text-sm font-semibold">Workspace</label>
        <select
          value={workspaceId}
          onChange={(e) => void onWorkspaceChange(e.target.value)}
          className="mt-2 w-full max-w-2xl border border-black/15 rounded-lg px-3 py-2 text-sm"
        >
          {workspaces.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name} ({workspace.id})
            </option>
          ))}
        </select>
      </section>

      <section className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="rounded-2xl border border-black/10 bg-white p-6">
          <h2 className="text-xl font-bold mb-3">Rc Cloud Plan</h2>
          <div className="space-y-2">
            <select
              value={planCode}
              onChange={(e) => setPlanCode(e.target.value)}
              className="w-full border border-black/15 rounded-lg px-3 py-2 text-sm"
            >
              {plans.map((plan) => (
                <option key={plan.code} value={plan.code}>
                  {plan.name} (${plan.monthlyPriceUsd}/mo)
                </option>
              ))}
            </select>
            <select
              value={billingMode}
              onChange={(e) => setBillingMode(e.target.value as "api_token" | "compute_token")}
              className="w-full border border-black/15 rounded-lg px-3 py-2 text-sm"
            >
              {billingModes.map((mode) => (
                <option key={mode.id} value={mode.id}>
                  {mode.title}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                disabled={busy}
                onClick={() => void onSwitchPlan()}
                className="px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold disabled:opacity-50"
              >
                Update Plan
              </button>
              <button
                disabled={busy}
                onClick={() => void onCreateCloudCheckout()}
                className="px-4 py-2 rounded-lg border border-black/20 text-sm font-semibold disabled:opacity-50"
              >
                Checkout
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-6">
          <h2 className="text-xl font-bold mb-3">RS Self-Hosted</h2>
          <p className="text-sm text-black/60 mb-3">One-time purchase (CNY 199) unlocks download and config tools.</p>
          <button
            disabled={busy}
            onClick={() => void onCreateRsCheckout()}
            className="px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold disabled:opacity-50"
          >
            Create RS Checkout
          </button>
          <pre className="mt-4 p-3 bg-zinc-950 text-zinc-100 rounded-lg text-xs overflow-auto min-h-[120px]">
            {JSON.stringify(entitlement, null, 2)}
          </pre>
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-black/10 bg-white p-6">
          <h3 className="font-bold mb-2">Subscription / Usage</h3>
          <pre className="p-3 bg-zinc-950 text-zinc-100 rounded-lg text-xs overflow-auto min-h-[220px]">
            {JSON.stringify({ subscription, usage }, null, 2)}
          </pre>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-6">
          <h3 className="font-bold mb-2">Orders</h3>
          <pre className="p-3 bg-zinc-950 text-zinc-100 rounded-lg text-xs overflow-auto min-h-[220px]">
            {JSON.stringify({ cloudOrders: orders, rsOrders: selfHostedOrders }, null, 2)}
          </pre>
        </div>
      </section>
    </div>
  );
}

