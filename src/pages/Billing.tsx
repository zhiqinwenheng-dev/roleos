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
  type WorkspaceInfo,
  type WorkspaceSubscription,
  type CloudUsageSummary
} from "../lib/roleosApi";
import { useTranslation } from "../context/LanguageContext";

export default function BillingPage() {
  const { language } = useTranslation();
  const isZh = language === "zh";

  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [billingModes, setBillingModes] = useState<BillingModeInfo[]>([]);
  const [planCode, setPlanCode] = useState("trial");
  const [billingMode, setBillingMode] = useState<"api_token" | "compute_token">("api_token");

  const [subscription, setSubscription] = useState<WorkspaceSubscription | null>(null);
  const [usage, setUsage] = useState<CloudUsageSummary | null>(null);
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
      setError(err instanceof Error ? err.message : isZh ? "操作失败。" : "Operation failed.");
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

    void safeRun(async () => {
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
        throw new Error(isZh ? "未选择工作空间。" : "No workspace selected.");
      }
      await switchSubscription(wid, planCode);
      await refreshWorkspacePanels(wid);
    });
  }

  async function onCreateCloudCheckout() {
    await safeRun(async () => {
      const wid = currentWorkspaceId();
      if (!wid) {
        throw new Error(isZh ? "未选择工作空间。" : "No workspace selected.");
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
        throw new Error(isZh ? "未选择工作空间。" : "No workspace selected.");
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
        <h1 className="text-3xl font-bold">{isZh ? "计费中心" : "Billing Center"}</h1>
        <p className="text-white/60 mt-2">
          {isZh
            ? "同一账号下统一管理 RC 订阅与 RS 购买。"
            : "Manage RC cloud subscription and RS self-hosted purchase from one workspace account."}
        </p>
      </section>

      {error ? <div className="mb-4 text-sm text-red-600">{error}</div> : null}

      <section className="rounded-2xl border border-black/10 bg-white p-6 mb-6">
        <label className="text-sm font-semibold">{isZh ? "工作空间" : "Workspace"}</label>
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
          <h2 className="text-xl font-bold mb-3">{isZh ? "RC Cloud 套餐" : "RC Cloud Plan"}</h2>
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
                {isZh ? "更新套餐" : "Update Plan"}
              </button>
              <button
                disabled={busy}
                onClick={() => void onCreateCloudCheckout()}
                className="px-4 py-2 rounded-lg border border-black/20 text-sm font-semibold disabled:opacity-50"
              >
                {isZh ? "发起结算" : "Checkout"}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-6">
          <h2 className="text-xl font-bold mb-3">RS Self-Hosted</h2>
          <p className="text-sm text-black/60 mb-3">
            {isZh ? "一次性购买（¥199）后解锁下载和配置工具。" : "One-time purchase (¥199) unlocks downloads and config tools."}
          </p>
          <button
            disabled={busy}
            onClick={() => void onCreateRsCheckout()}
            className="px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold disabled:opacity-50"
          >
            {isZh ? "创建 RS 结算单" : "Create RS Checkout"}
          </button>
          <div className="mt-4 text-sm">
            <p>
              status: <span className="font-semibold">{entitlement?.status ?? "-"}</span>
            </p>
            <p>
              package: <span className="font-semibold">{entitlement?.packageCode ?? "rs-standard"}</span>
            </p>
          </div>
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-black/10 bg-white p-6">
          <h3 className="font-bold mb-2">{isZh ? "订阅与用量" : "Subscription / Usage"}</h3>
          <div className="text-sm space-y-1">
            <p>plan: {subscription?.planCode ?? "-"}</p>
            <p>status: {subscription?.status ?? "-"}</p>
            <p>runs: {usage?.totalRuns ?? 0}</p>
            <p>success: {usage?.successRuns ?? 0}</p>
            <p>failed: {usage?.failedRuns ?? 0}</p>
            <p>estimated revenue: ${usage?.totalEstimatedRevenueUsd ?? 0}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-6">
          <h3 className="font-bold mb-2">{isZh ? "订单记录" : "Orders"}</h3>
          <div className="max-h-[260px] overflow-auto text-xs">
            {[...orders, ...selfHostedOrders].map((order) => (
              <div key={order.id} className="border-b border-black/10 py-2">
                <p className="font-semibold">{order.planCode}</p>
                <p>{order.status}</p>
                <p>{order.id}</p>
              </div>
            ))}
            {orders.length === 0 && selfHostedOrders.length === 0 ? (
              <p className="text-black/50">{isZh ? "暂无订单。" : "No orders yet."}</p>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
