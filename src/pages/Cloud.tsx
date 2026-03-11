import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Link, useLocation } from "react-router-dom";
import {
  activateKit,
  createCheckout,
  fetchMarketCatalog,
  fetchPlans,
  fetchRun,
  fetchWorkspaceDashboard,
  fetchWorkspaceRoles,
  readSession,
  runTeam,
  switchSubscription,
  type BillingModeInfo,
  type MarketCatalog,
  type PlanInfo,
  type WorkspaceDashboard,
  type WorkspaceInfo
} from "../lib/roleosApi";

function asJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export default function CloudPage() {
  const location = useLocation();
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");

  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [billingModes, setBillingModes] = useState<BillingModeInfo[]>([]);
  const [catalog, setCatalog] = useState<MarketCatalog | null>(null);
  const [dashboard, setDashboard] = useState<WorkspaceDashboard | null>(null);

  const [planCode, setPlanCode] = useState("trial");
  const [billingMode, setBillingMode] = useState<"api_token" | "compute_token">("api_token");
  const [checkoutUrl, setCheckoutUrl] = useState("");

  const [rolesOutput, setRolesOutput] = useState("Ready");
  const [kitOutput, setKitOutput] = useState("Ready");
  const [runOutput, setRunOutput] = useState("Ready");
  const [intent, setIntent] = useState("Generate a first deliverable output with next-step recommendations.");
  const [kitId, setKitId] = useState("content-starter-kit");
  const [runId, setRunId] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorText, setErrorText] = useState("");

  const isAuthed = token.length > 0;
  const currentWorkspaceId = workspaceId || workspaces[0]?.id || "";
  const isOnboarding = location.pathname === "/app/cloud/onboarding";
  const isSessionPage = location.pathname === "/app/cloud/session";

  const pageTitle = useMemo(() => {
    if (isOnboarding) {
      return "Rc Cloud Onboarding";
    }
    if (isSessionPage) {
      return "Rc Cloud Session";
    }
    return "RoleOS Rc Cloud";
  }, [isOnboarding, isSessionPage]);

  async function safeRun(fn: () => Promise<void>) {
    setBusy(true);
    setErrorText("");
    try {
      await fn();
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Operation failed");
    } finally {
      setBusy(false);
    }
  }

  function ensureWorkspace(): string {
    if (!currentWorkspaceId) {
      throw new Error("No workspace selected.");
    }
    return currentWorkspaceId;
  }

  async function bootstrapPlansAndCatalog() {
    const [plansRes, catalogRes] = await Promise.all([fetchPlans(), fetchMarketCatalog()]);
    setPlans(plansRes.plans);
    if (plansRes.plans[0]?.code) {
      setPlanCode(plansRes.plans[0].code);
    }
    setCatalog(catalogRes.catalog);
    setBillingModes(catalogRes.catalog.billingModes);
    if (catalogRes.catalog.billingModes[0]?.id) {
      setBillingMode(catalogRes.catalog.billingModes[0].id);
    }
  }

  async function refreshDashboard(targetWorkspaceId?: string) {
    const wid = targetWorkspaceId || ensureWorkspace();
    const data = await fetchWorkspaceDashboard(wid);
    setDashboard(data);
  }

  useEffect(() => {
    const session = readSession();
    setToken(session.token);
    setEmail(session.email);
    setWorkspaces(session.workspaces);
    if (session.workspaces[0]?.id) {
      setWorkspaceId(session.workspaces[0].id);
    }

    safeRun(async () => {
      await bootstrapPlansAndCatalog();
      if (session.token && session.workspaces[0]?.id) {
        await refreshDashboard(session.workspaces[0].id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onRefresh() {
    await safeRun(async () => {
      await bootstrapPlansAndCatalog();
      if (isAuthed && currentWorkspaceId) {
        await refreshDashboard();
      }
    });
  }

  async function onLoadRoles() {
    await safeRun(async () => {
      const result = await fetchWorkspaceRoles(ensureWorkspace());
      setRolesOutput(asJson(result));
    });
  }

  async function onActivateKit() {
    await safeRun(async () => {
      const result = await activateKit(ensureWorkspace(), kitId.trim());
      setKitOutput(asJson(result));
      await refreshDashboard();
    });
  }

  async function onRunTeam() {
    await safeRun(async () => {
      const result = await runTeam(ensureWorkspace(), intent.trim());
      setRunOutput(asJson(result));
      if (result.run?.id) {
        setRunId(result.run.id);
      }
      await refreshDashboard();
    });
  }

  async function onFetchRun() {
    await safeRun(async () => {
      if (!runId.trim()) {
        throw new Error("Please provide runId.");
      }
      const result = await fetchRun(ensureWorkspace(), runId.trim());
      setRunOutput(asJson(result));
    });
  }

  async function onSwitchPlan() {
    await safeRun(async () => {
      await switchSubscription(ensureWorkspace(), planCode);
      await refreshDashboard();
    });
  }

  async function onSwitchTrial() {
    await safeRun(async () => {
      await switchSubscription(ensureWorkspace(), "trial");
      await refreshDashboard();
    });
  }

  async function onCreateCheckout() {
    await safeRun(async () => {
      const result = await createCheckout(ensureWorkspace(), planCode, billingMode);
      setCheckoutUrl(result.order.checkoutUrl);
      if (result.order.checkoutUrl) {
        window.open(result.order.checkoutUrl, "_blank", "noopener,noreferrer");
      }
      await refreshDashboard();
    });
  }

  if (!isAuthed) {
    return (
      <div className="pt-32 pb-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2.5rem] bg-black text-white p-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Login to open Rc Cloud</h1>
          <p className="text-white/60 text-lg leading-relaxed max-w-2xl">
            The Rc console is now connected to real backend APIs for role loading, kit activation,
            team runs, and billing flow.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/login" className="px-7 py-3 bg-white text-black rounded-full font-bold">
              Login
            </Link>
            <Link
              to="/signup"
              className="px-7 py-3 border border-white/20 rounded-full font-bold hover:bg-white/10"
            >
              Signup
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] bg-gradient-to-r from-black via-zinc-900 to-zinc-700 text-white p-8 mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">{pageTitle}</h1>
            <p className="text-white/60 mt-2">
              Account: {email || "-"} | Workspace: {currentWorkspaceId || "-"}
            </p>
            <p className="text-white/60 mt-1">
              MVP scope: one Role + one Kit + one Team + one channel(Feishu)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/app/cloud" className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm">
              Console
            </Link>
            <Link to="/app/cloud/onboarding" className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm">
              Onboarding
            </Link>
            <Link to="/app/cloud/session" className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm">
              Session
            </Link>
          </div>
        </div>
      </section>

      {errorText && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorText}
        </div>
      )}

      <section className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold mb-3">Tenant</h3>
          <label className="text-xs font-bold uppercase tracking-wider text-black/40">Workspace</label>
          <select
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
            className="mt-2 w-full border border-black/10 rounded-xl px-3 py-2 text-sm"
          >
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name} ({workspace.id})
              </option>
            ))}
          </select>
          <button
            onClick={onRefresh}
            disabled={busy}
            className="mt-3 w-full px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-sm font-bold disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold mb-3">Billing</h3>
          <select
            value={planCode}
            onChange={(e) => setPlanCode(e.target.value)}
            className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm"
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
            className="mt-2 w-full border border-black/10 rounded-xl px-3 py-2 text-sm"
          >
            {billingModes.map((mode) => (
              <option key={mode.id} value={mode.id}>
                {mode.title}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <button onClick={onSwitchTrial} disabled={busy} className="px-2 py-2 rounded-xl bg-emerald-100 text-emerald-900 text-xs font-bold">
              Trial
            </button>
            <button onClick={onSwitchPlan} disabled={busy} className="px-2 py-2 rounded-xl bg-zinc-900 text-white text-xs font-bold">
              Apply
            </button>
            <button onClick={onCreateCheckout} disabled={busy} className="px-2 py-2 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold">
              Checkout
            </button>
          </div>
          <input
            value={checkoutUrl}
            readOnly
            placeholder="checkout url"
            className="mt-3 w-full border border-black/10 rounded-xl px-3 py-2 text-xs font-mono"
          />
        </div>

        <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold mb-3">Run Query</h3>
          <input
            value={runId}
            onChange={(e) => setRunId(e.target.value)}
            placeholder="run id"
            className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm"
          />
          <button
            onClick={onFetchRun}
            disabled={busy}
            className="mt-3 w-full px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-sm font-bold disabled:opacity-50"
          >
            Fetch Run
          </button>
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold mb-3">Workspace Dashboard</h3>
          <pre className="p-4 bg-zinc-950 text-zinc-100 rounded-xl text-xs overflow-auto min-h-[220px]">
            {dashboard ? asJson(dashboard) : "No data"}
          </pre>
        </div>
        <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold mb-3">Shared Market Catalog (RS + Rc)</h3>
          <pre className="p-4 bg-zinc-950 text-zinc-100 rounded-xl text-xs overflow-auto min-h-[220px]">
            {catalog ? asJson(catalog) : "No data"}
          </pre>
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold mb-3">Role / Kit</h3>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button onClick={onLoadRoles} disabled={busy} className="px-3 py-2 rounded-xl bg-zinc-900 text-white text-sm font-bold">
              Load Roles
            </button>
            <button onClick={onActivateKit} disabled={busy} className="px-3 py-2 rounded-xl bg-zinc-100 text-black text-sm font-bold">
              Activate Kit
            </button>
          </div>
          <input
            value={kitId}
            onChange={(e) => setKitId(e.target.value)}
            placeholder="kit id"
            className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm mb-3"
          />
          <pre className="p-3 bg-zinc-950 text-zinc-100 rounded-xl text-xs overflow-auto min-h-[120px]">{rolesOutput}</pre>
          <pre className="p-3 mt-3 bg-zinc-950 text-zinc-100 rounded-xl text-xs overflow-auto min-h-[120px]">{kitOutput}</pre>
        </div>

        <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold mb-3">Team Run</h3>
          <textarea
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm min-h-[120px]"
          />
          <button
            onClick={onRunTeam}
            disabled={busy}
            className="mt-3 px-5 py-2 rounded-xl bg-black text-white text-sm font-bold disabled:opacity-50"
          >
            Start Team Run
          </button>
          <pre className="mt-3 p-3 bg-zinc-950 text-zinc-100 rounded-xl text-xs overflow-auto min-h-[220px]">{runOutput}</pre>
        </div>
      </section>
    </div>
  );
}

