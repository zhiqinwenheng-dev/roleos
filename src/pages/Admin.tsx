import { useEffect, useState } from "react";
import {
  fetchAdminOrders,
  fetchAdminOverview,
  fetchAdminRuns,
  fetchAdminUsers,
  fetchAdminWorkspaceOverview,
  fetchAdminWorkspaces,
  updateAdminSelfHostedEntitlement,
  updateAdminSubscription
} from "../lib/roleosApi";

const STORAGE_ADMIN_KEY = "roleosAdminKey";

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [planCode, setPlanCode] = useState("starter");
  const [planStatus, setPlanStatus] = useState<"active" | "past_due" | "paused" | "canceled">("active");
  const [entitlementStatus, setEntitlementStatus] = useState<"inactive" | "active" | "revoked">("active");

  const [overview, setOverview] = useState<unknown>(null);
  const [users, setUsers] = useState<unknown>(null);
  const [workspaces, setWorkspaces] = useState<unknown>(null);
  const [orders, setOrders] = useState<unknown>(null);
  const [runs, setRuns] = useState<unknown>(null);
  const [workspaceOverview, setWorkspaceOverview] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_ADMIN_KEY) ?? "";
    setAdminKey(saved);
  }, []);

  async function safeRun(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      localStorage.setItem(STORAGE_ADMIN_KEY, adminKey);
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setBusy(false);
    }
  }

  async function loadAll() {
    await safeRun(async () => {
      if (!adminKey.trim()) {
        throw new Error("Please enter admin API key.");
      }
      const [ov, u, w, o, r] = await Promise.all([
        fetchAdminOverview(adminKey),
        fetchAdminUsers(adminKey),
        fetchAdminWorkspaces(adminKey),
        fetchAdminOrders(adminKey, { limit: 100 }),
        fetchAdminRuns(adminKey, { limit: 100 })
      ]);
      setOverview(ov);
      setUsers(u);
      setWorkspaces(w);
      setOrders(o);
      setRuns(r);
    });
  }

  async function loadWorkspaceOverview() {
    await safeRun(async () => {
      if (!adminKey.trim()) {
        throw new Error("Please enter admin API key.");
      }
      if (!workspaceId.trim()) {
        throw new Error("Please enter workspace id.");
      }
      const detail = await fetchAdminWorkspaceOverview(adminKey, workspaceId.trim());
      setWorkspaceOverview(detail);
    });
  }

  async function applySubscriptionUpdate() {
    await safeRun(async () => {
      if (!workspaceId.trim()) {
        throw new Error("Please enter workspace id.");
      }
      await updateAdminSubscription(adminKey, workspaceId.trim(), {
        planCode: planCode.trim(),
        status: planStatus
      });
      await loadWorkspaceOverview();
    });
  }

  async function applyEntitlementUpdate() {
    await safeRun(async () => {
      if (!workspaceId.trim()) {
        throw new Error("Please enter workspace id.");
      }
      await updateAdminSelfHostedEntitlement(adminKey, workspaceId.trim(), {
        packageCode: "rs-standard",
        status: entitlementStatus
      });
      await loadWorkspaceOverview();
    });
  }

  return (
    <div className="pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <section className="rounded-3xl bg-black text-white p-8 mb-6">
        <h1 className="text-3xl font-bold">Admin Console</h1>
        <p className="text-white/60 mt-2">
          Manage users, workspaces, orders, runs, and RS/Rc commercial operations.
        </p>
      </section>

      {error ? <div className="mb-4 text-sm text-red-600">{error}</div> : null}

      <section className="rounded-2xl border border-black/10 bg-white p-6 mb-6">
        <div className="grid lg:grid-cols-2 gap-3">
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="x-roleos-admin-key"
            className="border border-black/15 rounded-lg px-3 py-2 text-sm"
          />
          <button
            disabled={busy}
            onClick={() => void loadAll()}
            className="px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold disabled:opacity-50"
          >
            Load Admin Data
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-black/10 bg-white p-6 mb-6">
        <h2 className="font-bold mb-3">Workspace Operations</h2>
        <div className="grid lg:grid-cols-3 gap-3 mb-3">
          <input
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
            placeholder="workspace id"
            className="border border-black/15 rounded-lg px-3 py-2 text-sm"
          />
          <button
            disabled={busy}
            onClick={() => void loadWorkspaceOverview()}
            className="px-4 py-2 rounded-lg border border-black/20 text-sm font-semibold disabled:opacity-50"
          >
            Load Workspace Overview
          </button>
        </div>
        <div className="grid lg:grid-cols-3 gap-3 mb-3">
          <input
            value={planCode}
            onChange={(e) => setPlanCode(e.target.value)}
            placeholder="plan code"
            className="border border-black/15 rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={planStatus}
            onChange={(e) => setPlanStatus(e.target.value as typeof planStatus)}
            className="border border-black/15 rounded-lg px-3 py-2 text-sm"
          >
            <option value="active">active</option>
            <option value="past_due">past_due</option>
            <option value="paused">paused</option>
            <option value="canceled">canceled</option>
          </select>
          <button
            disabled={busy}
            onClick={() => void applySubscriptionUpdate()}
            className="px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold disabled:opacity-50"
          >
            Update Subscription
          </button>
        </div>
        <div className="grid lg:grid-cols-3 gap-3">
          <select
            value={entitlementStatus}
            onChange={(e) => setEntitlementStatus(e.target.value as typeof entitlementStatus)}
            className="border border-black/15 rounded-lg px-3 py-2 text-sm"
          >
            <option value="inactive">inactive</option>
            <option value="active">active</option>
            <option value="revoked">revoked</option>
          </select>
          <button
            disabled={busy}
            onClick={() => void applyEntitlementUpdate()}
            className="px-4 py-2 rounded-lg border border-black/20 text-sm font-semibold disabled:opacity-50"
          >
            Update RS Entitlement
          </button>
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-black/10 bg-white p-5">
          <h3 className="font-bold mb-2">Overview</h3>
          <pre className="p-3 bg-zinc-950 text-zinc-100 rounded-lg text-xs overflow-auto min-h-[170px]">
            {JSON.stringify(overview, null, 2)}
          </pre>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-5">
          <h3 className="font-bold mb-2">Workspace Overview</h3>
          <pre className="p-3 bg-zinc-950 text-zinc-100 rounded-lg text-xs overflow-auto min-h-[170px]">
            {JSON.stringify(workspaceOverview, null, 2)}
          </pre>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-5">
          <h3 className="font-bold mb-2">Users / Workspaces</h3>
          <pre className="p-3 bg-zinc-950 text-zinc-100 rounded-lg text-xs overflow-auto min-h-[220px]">
            {JSON.stringify({ users, workspaces }, null, 2)}
          </pre>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-5">
          <h3 className="font-bold mb-2">Orders / Runs</h3>
          <pre className="p-3 bg-zinc-950 text-zinc-100 rounded-lg text-xs overflow-auto min-h-[220px]">
            {JSON.stringify({ orders, runs }, null, 2)}
          </pre>
        </div>
      </section>
    </div>
  );
}

