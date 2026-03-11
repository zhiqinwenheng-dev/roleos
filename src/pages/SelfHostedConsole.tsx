import { useEffect, useState } from "react";
import {
  createSelfHostedCheckout,
  downloadSelfHostedArtifact,
  fetchSelfHostedArtifacts,
  fetchSelfHostedEntitlement,
  fetchSelfHostedOrders,
  generateSelfHostedConfigTemplate,
  readSession,
  type PaymentOrder,
  type SelfHostedArtifact,
  type SelfHostedEntitlement,
  type WorkspaceInfo
} from "../lib/roleosApi";

interface ConfigForm {
  deploymentTarget: "windows" | "linux" | "macos" | "cloud-vm";
  modelApiKey: string;
  modelBaseUrl: string;
  openClawEndpoint: string;
  openClawApiKey: string;
  feishuWebhookUrl: string;
  starterKitId: string;
}

const defaultConfig: ConfigForm = {
  deploymentTarget: "linux",
  modelApiKey: "",
  modelBaseUrl: "",
  openClawEndpoint: "http://localhost:4310",
  openClawApiKey: "",
  feishuWebhookUrl: "",
  starterKitId: "content-starter-kit"
};

export default function SelfHostedConsolePage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [entitlement, setEntitlement] = useState<SelfHostedEntitlement | null>(null);
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [artifacts, setArtifacts] = useState<SelfHostedArtifact[]>([]);
  const [configForm, setConfigForm] = useState<ConfigForm>(defaultConfig);
  const [configOutput, setConfigOutput] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function currentWorkspaceId(): string {
    return workspaceId || workspaces[0]?.id || "";
  }

  async function refreshSelfHosted(targetWorkspaceId?: string) {
    const wid = targetWorkspaceId || currentWorkspaceId();
    if (!wid) {
      return;
    }
    const [entRes, orderRes] = await Promise.all([
      fetchSelfHostedEntitlement(wid),
      fetchSelfHostedOrders(wid)
    ]);
    setEntitlement(entRes.entitlement);
    setOrders(orderRes.orders);

    if (entRes.entitlement?.status === "active") {
      const artifactRes = await fetchSelfHostedArtifacts(wid);
      setArtifacts(artifactRes.artifacts);
    } else {
      setArtifacts([]);
    }
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
      void safeRun(async () => {
        await refreshSelfHosted(session.workspaces[0].id);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onWorkspaceChange(nextWorkspaceId: string) {
    setWorkspaceId(nextWorkspaceId);
    await safeRun(async () => {
      await refreshSelfHosted(nextWorkspaceId);
    });
  }

  async function onCreateCheckout() {
    await safeRun(async () => {
      const wid = currentWorkspaceId();
      if (!wid) {
        throw new Error("No workspace selected.");
      }
      const result = await createSelfHostedCheckout(wid);
      if (result.order.checkoutUrl) {
        window.open(result.order.checkoutUrl, "_blank", "noopener,noreferrer");
      }
      await refreshSelfHosted(wid);
    });
  }

  async function onDownloadArtifact(artifactId: string) {
    await safeRun(async () => {
      const wid = currentWorkspaceId();
      if (!wid) {
        throw new Error("No workspace selected.");
      }
      await downloadSelfHostedArtifact(wid, artifactId);
    });
  }

  async function onGenerateConfig() {
    await safeRun(async () => {
      const wid = currentWorkspaceId();
      if (!wid) {
        throw new Error("No workspace selected.");
      }
      const output = await generateSelfHostedConfigTemplate(wid, {
        deploymentTarget: configForm.deploymentTarget,
        modelApiKey: configForm.modelApiKey,
        modelBaseUrl: configForm.modelBaseUrl || undefined,
        openClawEndpoint: configForm.openClawEndpoint,
        openClawApiKey: configForm.openClawApiKey || undefined,
        feishuWebhookUrl: configForm.feishuWebhookUrl || undefined,
        starterKitId: configForm.starterKitId
      });
      setConfigOutput(output);
    });
  }

  return (
    <div className="pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <section className="rounded-3xl bg-black text-white p-8 mb-6">
        <h1 className="text-3xl font-bold">RS Self-Hosted Console</h1>
        <p className="text-white/60 mt-2">
          Purchase RS, unlock download artifacts, then generate deployment config and run one-click setup.
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
          <h2 className="text-xl font-bold mb-3">RS Entitlement</h2>
          <button
            disabled={busy}
            onClick={() => void onCreateCheckout()}
            className="px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold disabled:opacity-50"
          >
            Create RS Checkout (CNY 199)
          </button>
          <pre className="mt-3 p-3 bg-zinc-950 text-zinc-100 rounded-lg text-xs overflow-auto min-h-[140px]">
            {JSON.stringify(entitlement, null, 2)}
          </pre>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-6">
          <h2 className="text-xl font-bold mb-3">RS Orders</h2>
          <pre className="p-3 bg-zinc-950 text-zinc-100 rounded-lg text-xs overflow-auto min-h-[200px]">
            {JSON.stringify(orders, null, 2)}
          </pre>
        </div>
      </section>

      <section className="rounded-2xl border border-black/10 bg-white p-6 mb-6">
        <h2 className="text-xl font-bold mb-3">Download Artifacts</h2>
        {!artifacts.length ? (
          <p className="text-sm text-black/60">
            Activate RS entitlement first, then download installer binaries and one-click scripts.
          </p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {artifacts.map((artifact) => (
              <div key={artifact.id} className="border border-black/10 rounded-xl p-4">
                <p className="font-semibold text-sm">{artifact.name}</p>
                <p className="text-xs text-black/50 mt-1">
                  {artifact.platform} | {artifact.kind} | {(artifact.sizeBytes / 1024).toFixed(1)} KB
                </p>
                <button
                  disabled={busy}
                  onClick={() => void onDownloadArtifact(artifact.id)}
                  className="mt-3 px-3 py-2 rounded-lg bg-black text-white text-xs font-semibold disabled:opacity-50"
                >
                  Download
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-black/10 bg-white p-6">
        <h2 className="text-xl font-bold mb-3">Config Generator</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <select
            value={configForm.deploymentTarget}
            onChange={(e) =>
              setConfigForm((prev) => ({
                ...prev,
                deploymentTarget: e.target.value as ConfigForm["deploymentTarget"]
              }))
            }
            className="border border-black/15 rounded-lg px-3 py-2 text-sm"
          >
            <option value="windows">Windows</option>
            <option value="linux">Linux</option>
            <option value="macos">macOS</option>
            <option value="cloud-vm">Cloud VM</option>
          </select>
          <input
            value={configForm.starterKitId}
            onChange={(e) => setConfigForm((prev) => ({ ...prev, starterKitId: e.target.value }))}
            placeholder="starter kit id"
            className="border border-black/15 rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={configForm.modelApiKey}
            onChange={(e) => setConfigForm((prev) => ({ ...prev, modelApiKey: e.target.value }))}
            placeholder="model api key"
            className="border border-black/15 rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={configForm.modelBaseUrl}
            onChange={(e) => setConfigForm((prev) => ({ ...prev, modelBaseUrl: e.target.value }))}
            placeholder="model base url (optional)"
            className="border border-black/15 rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={configForm.openClawEndpoint}
            onChange={(e) => setConfigForm((prev) => ({ ...prev, openClawEndpoint: e.target.value }))}
            placeholder="openclaw endpoint"
            className="border border-black/15 rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={configForm.openClawApiKey}
            onChange={(e) => setConfigForm((prev) => ({ ...prev, openClawApiKey: e.target.value }))}
            placeholder="openclaw api key (optional)"
            className="border border-black/15 rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={configForm.feishuWebhookUrl}
            onChange={(e) => setConfigForm((prev) => ({ ...prev, feishuWebhookUrl: e.target.value }))}
            placeholder="feishu webhook url (optional)"
            className="md:col-span-2 border border-black/15 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <button
          disabled={busy}
          onClick={() => void onGenerateConfig()}
          className="mt-3 px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold disabled:opacity-50"
        >
          Generate Config
        </button>

        <pre className="mt-3 p-3 bg-zinc-950 text-zinc-100 rounded-lg text-xs overflow-auto min-h-[220px]">
          {configOutput ? JSON.stringify(configOutput, null, 2) : "No generated config yet."}
        </pre>
      </section>
    </div>
  );
}

