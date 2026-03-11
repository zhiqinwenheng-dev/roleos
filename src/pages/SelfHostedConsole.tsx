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
import { useTranslation } from "../context/LanguageContext";

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
  const { language } = useTranslation();
  const isZh = language === "zh";

  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [entitlement, setEntitlement] = useState<SelfHostedEntitlement | null>(null);
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [artifacts, setArtifacts] = useState<SelfHostedArtifact[]>([]);
  const [configForm, setConfigForm] = useState<ConfigForm>(defaultConfig);
  const [configOutput, setConfigOutput] = useState<{
    configTemplate: Record<string, string>;
    envText: string;
    installCommand: string;
  } | null>(null);
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
    const [entRes, orderRes] = await Promise.all([fetchSelfHostedEntitlement(wid), fetchSelfHostedOrders(wid)]);
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
        throw new Error(isZh ? "未选择工作空间。" : "No workspace selected.");
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
        throw new Error(isZh ? "未选择工作空间。" : "No workspace selected.");
      }
      await downloadSelfHostedArtifact(wid, artifactId);
    });
  }

  async function onGenerateConfig() {
    await safeRun(async () => {
      const wid = currentWorkspaceId();
      if (!wid) {
        throw new Error(isZh ? "未选择工作空间。" : "No workspace selected.");
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
          {isZh
            ? "购买 RS 后解锁安装包下载，再生成配置并执行一键部署。"
            : "Purchase RS, unlock artifact downloads, then generate config and run one-click setup."}
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
          <h2 className="text-xl font-bold mb-3">{isZh ? "RS 授权状态" : "RS Entitlement"}</h2>
          <button
            disabled={busy}
            onClick={() => void onCreateCheckout()}
            className="px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold disabled:opacity-50"
          >
            {isZh ? "创建 RS 结算单（¥199）" : "Create RS Checkout (¥199)"}
          </button>
          <div className="mt-4 text-sm space-y-1">
            <p>
              status: <span className="font-semibold">{entitlement?.status ?? "-"}</span>
            </p>
            <p>
              package: <span className="font-semibold">{entitlement?.packageCode ?? "rs-standard"}</span>
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-6">
          <h2 className="text-xl font-bold mb-3">{isZh ? "RS 订单" : "RS Orders"}</h2>
          <div className="max-h-[200px] overflow-auto text-xs">
            {orders.map((order) => (
              <div key={order.id} className="border-b border-black/10 py-2">
                <p className="font-semibold">{order.status}</p>
                <p>{order.id}</p>
                <p>{order.createdAt}</p>
              </div>
            ))}
            {orders.length === 0 ? <p className="text-black/50">{isZh ? "暂无订单。" : "No orders yet."}</p> : null}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-black/10 bg-white p-6 mb-6">
        <h2 className="text-xl font-bold mb-3">{isZh ? "下载安装包" : "Download Artifacts"}</h2>
        {!artifacts.length ? (
          <p className="text-sm text-black/60">
            {isZh
              ? "请先激活 RS 授权，随后可下载 Windows / Linux / macOS 安装脚本与包。"
              : "Activate RS entitlement first, then download Windows / Linux / macOS installers and scripts."}
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
                  {isZh ? "下载" : "Download"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-black/10 bg-white p-6">
        <h2 className="text-xl font-bold mb-3">{isZh ? "配置生成器" : "Config Generator"}</h2>
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
            placeholder={isZh ? "模型 API Key" : "model api key"}
            className="border border-black/15 rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={configForm.modelBaseUrl}
            onChange={(e) => setConfigForm((prev) => ({ ...prev, modelBaseUrl: e.target.value }))}
            placeholder={isZh ? "模型 Base URL（可选）" : "model base url (optional)"}
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
            placeholder={isZh ? "openclaw api key（可选）" : "openclaw api key (optional)"}
            className="border border-black/15 rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={configForm.feishuWebhookUrl}
            onChange={(e) => setConfigForm((prev) => ({ ...prev, feishuWebhookUrl: e.target.value }))}
            placeholder={isZh ? "飞书 webhook（可选）" : "feishu webhook (optional)"}
            className="md:col-span-2 border border-black/15 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <button
          disabled={busy}
          onClick={() => void onGenerateConfig()}
          className="mt-3 px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold disabled:opacity-50"
        >
          {isZh ? "生成配置" : "Generate Config"}
        </button>

        <div className="mt-4 space-y-3">
          <div className="rounded-lg bg-zinc-50 border border-black/10 p-3 text-sm">
            <p className="font-semibold mb-1">{isZh ? "安装命令" : "Install Command"}</p>
            <code>{configOutput?.installCommand ?? "-"}</code>
          </div>
          <textarea
            readOnly
            value={configOutput?.envText ?? ""}
            placeholder={isZh ? "这里会输出 .env 模板" : "Generated .env template will appear here"}
            className="w-full min-h-[180px] rounded-lg border border-black/15 px-3 py-2 text-xs font-mono"
          />
        </div>
      </section>
    </div>
  );
}
