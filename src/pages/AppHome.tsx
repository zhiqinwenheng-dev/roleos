import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchMe, fetchWorkspaceDashboard, readSession, type WorkspaceInfo } from "../lib/roleosApi";

export default function AppHomePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(null);

  async function loadDashboard(targetWorkspaceId?: string) {
    const wid = targetWorkspaceId || workspaceId || workspaces[0]?.id;
    if (!wid) {
      setDashboard(null);
      return;
    }
    const data = await fetchWorkspaceDashboard(wid);
    setDashboard(data);
  }

  useEffect(() => {
    const session = readSession();
    if (!session.token) {
      setLoading(false);
      return;
    }
    setEmail(session.email);
    setWorkspaces(session.workspaces);
    if (session.workspaces[0]?.id) {
      setWorkspaceId(session.workspaces[0].id);
    }

    (async () => {
      setLoading(true);
      setError("");
      try {
        const me = await fetchMe();
        setEmail(me.user.email);
        setWorkspaces(me.workspaces);
        if (me.workspaces[0]?.id) {
          setWorkspaceId(me.workspaces[0].id);
          await loadDashboard(me.workspaces[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load app center.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onWorkspaceChange(nextWorkspaceId: string) {
    setWorkspaceId(nextWorkspaceId);
    setLoading(true);
    setError("");
    try {
      await loadDashboard(nextWorkspaceId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workspace data.");
    } finally {
      setLoading(false);
    }
  }

  if (!readSession().token) {
    return (
      <div className="pt-32 pb-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-black text-white p-10">
          <h1 className="text-4xl font-bold mb-3">RoleOS App Center</h1>
          <p className="text-white/65">
            Login first to manage RS(Self-Hosted), Rc(Cloud), billing, and admin operations.
          </p>
          <div className="mt-6 flex gap-3">
            <Link to="/login" className="px-5 py-3 bg-white text-black rounded-xl font-bold">
              Login
            </Link>
            <Link to="/signup" className="px-5 py-3 border border-white/20 rounded-xl font-bold">
              Signup
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <section className="rounded-3xl bg-gradient-to-r from-black via-zinc-900 to-zinc-700 text-white p-8 mb-6">
        <h1 className="text-3xl font-bold">RoleOS App Center</h1>
        <p className="text-white/65 mt-2">Signed in as {email || "-"}</p>
      </section>

      <section className="grid lg:grid-cols-4 gap-4 mb-6">
        <Link to="/app/self-hosted" className="rounded-2xl border border-black/10 bg-white p-5 hover:shadow-sm">
          <h2 className="font-bold mb-1">RS Console</h2>
          <p className="text-sm text-black/60">Manage self-hosted entitlement, download, and config.</p>
        </Link>
        <Link to="/app/cloud" className="rounded-2xl border border-black/10 bg-white p-5 hover:shadow-sm">
          <h2 className="font-bold mb-1">Rc Console</h2>
          <p className="text-sm text-black/60">Run Role/Kit/Team flow in managed cloud mode.</p>
        </Link>
        <Link to="/app/billing" className="rounded-2xl border border-black/10 bg-white p-5 hover:shadow-sm">
          <h2 className="font-bold mb-1">Billing</h2>
          <p className="text-sm text-black/60">Cloud plans, checkout, and order history.</p>
        </Link>
        <Link to="/app/admin" className="rounded-2xl border border-black/10 bg-white p-5 hover:shadow-sm">
          <h2 className="font-bold mb-1">Admin</h2>
          <p className="text-sm text-black/60">View users, workspaces, orders, and runs.</p>
        </Link>
      </section>

      <section className="rounded-2xl border border-black/10 bg-white p-6">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <label className="text-sm font-semibold">Workspace</label>
          <select
            value={workspaceId}
            onChange={(e) => void onWorkspaceChange(e.target.value)}
            className="border border-black/15 rounded-lg px-3 py-2 text-sm min-w-[320px]"
          >
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name} ({workspace.id})
              </option>
            ))}
          </select>
        </div>

        {loading ? <p className="text-sm text-black/60">Loading...</p> : null}
        {error ? <p className="text-sm text-red-600 mb-3">{error}</p> : null}
        <pre className="p-4 bg-zinc-950 text-zinc-100 rounded-xl text-xs overflow-auto min-h-[240px]">
          {dashboard ? JSON.stringify(dashboard, null, 2) : "No dashboard data."}
        </pre>
      </section>
    </div>
  );
}

