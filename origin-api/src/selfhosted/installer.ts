import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { join } from "node:path";
import { checkOpenClawHealth } from "../adapter/httpOpenclawAdapter.js";
import { ensureDir, readJsonFile, writeJsonFile } from "../utils/fs.js";
import { nowIso } from "../utils/time.js";
import type { RegistryService } from "../registry/registryService.js";

export interface SelfHostedConfig {
  openClawEndpoint: string;
  openClawApiKey?: string;
  modelApiKey: string;
  feishuAppId: string;
  feishuAppSecret: string;
  starterKitId: string;
  installedAt: string;
}

export interface ConnectivityCheck {
  ok: boolean;
  detail: string;
  statusCode?: number;
  skipped?: boolean;
}

export interface ConnectivityReport {
  ok: boolean;
  openClaw: ConnectivityCheck;
  model: ConnectivityCheck;
  feishu: ConnectivityCheck;
  checkedAt: string;
}

export interface InstallerOptions {
  openClawEndpoint?: string;
  openClawApiKey?: string;
  modelApiKey?: string;
  feishuAppId?: string;
  feishuAppSecret?: string;
  starterKitId?: string;
  nonInteractive?: boolean;
}

async function promptIfMissing(
  rl: ReturnType<typeof createInterface>,
  current: string | undefined,
  promptText: string
): Promise<string> {
  if (current && current.length > 0) {
    return current;
  }
  return rl.question(promptText);
}

function ensureRuntimeCompatibility(): void {
  const major = Number(process.versions.node.split(".")[0] ?? "0");
  if (major < 20) {
    throw new Error("Node.js 20+ is required for RoleOS setup.");
  }
}

function isPlaceholder(value: string): boolean {
  return (
    value.length === 0 ||
    value.includes("placeholder") ||
    value.includes("local-") ||
    value.includes("feishu-app-")
  );
}

export class GuidedInstaller {
  private readonly configPath: string;

  constructor(
    private readonly workspaceRoot: string,
    private readonly registryService: RegistryService
  ) {
    this.configPath = join(
      workspaceRoot,
      ".roleos",
      "config",
      "self-hosted.config.json"
    );
  }

  async run(options: InstallerOptions = {}): Promise<SelfHostedConfig> {
    ensureRuntimeCompatibility();
    await ensureDir(join(this.workspaceRoot, ".roleos", "config"));

    const kits = await this.registryService.listKits();
    const defaultStarter = kits[0];
    if (!defaultStarter) {
      throw new Error("No starter kits found in registry.");
    }
    const defaultStarterKitId = defaultStarter.id;

    if (options.nonInteractive) {
      const config: SelfHostedConfig = {
        openClawEndpoint: options.openClawEndpoint ?? "http://localhost:4310",
        openClawApiKey: options.openClawApiKey,
        modelApiKey: options.modelApiKey ?? "local-model-key",
        feishuAppId: options.feishuAppId ?? "feishu-app-id",
        feishuAppSecret: options.feishuAppSecret ?? "feishu-app-secret",
        starterKitId: options.starterKitId ?? defaultStarterKitId,
        installedAt: nowIso()
      };
      await writeJsonFile(this.configPath, config);
      return config;
    }

    const rl = createInterface({ input, output });
    try {
      const config: SelfHostedConfig = {
        openClawEndpoint: await promptIfMissing(
          rl,
          options.openClawEndpoint,
          "OpenClaw endpoint (default: http://localhost:4310): "
        ),
        openClawApiKey: await promptIfMissing(
          rl,
          options.openClawApiKey,
          "OpenClaw API key (optional, press Enter to skip): "
        ),
        modelApiKey: await promptIfMissing(
          rl,
          options.modelApiKey,
          "Model API key: "
        ),
        feishuAppId: await promptIfMissing(rl, options.feishuAppId, "Feishu App ID: "),
        feishuAppSecret: await promptIfMissing(
          rl,
          options.feishuAppSecret,
          "Feishu App Secret: "
        ),
        starterKitId: await promptIfMissing(
          rl,
          options.starterKitId,
          `Starter Kit ID (default: ${defaultStarterKitId}): `
        ),
        installedAt: nowIso()
      };

      if (!config.openClawEndpoint) {
        config.openClawEndpoint = "http://localhost:4310";
      }
      if (!config.starterKitId) {
        config.starterKitId = defaultStarterKitId;
      }

      await writeJsonFile(this.configPath, config);
      return config;
    } finally {
      rl.close();
    }
  }

  async loadConfig(): Promise<SelfHostedConfig | undefined> {
    try {
      return await readJsonFile<SelfHostedConfig>(this.configPath);
    } catch {
      return undefined;
    }
  }

  async verifyConnectivity(config: SelfHostedConfig): Promise<ConnectivityReport> {
    const openClaw = await checkOpenClawHealth({
      endpoint: config.openClawEndpoint,
      apiKey: config.openClawApiKey
    });

    const model: ConnectivityCheck = isPlaceholder(config.modelApiKey)
      ? {
          ok: false,
          skipped: true,
          detail: "Model API key is placeholder. Provider connectivity skipped."
        }
      : {
          ok: true,
          detail: "Model API key is configured."
        };

    let feishu: ConnectivityCheck;
    if (isPlaceholder(config.feishuAppId) || isPlaceholder(config.feishuAppSecret)) {
      feishu = {
        ok: false,
        skipped: true,
        detail: "Feishu credentials are placeholders. Connectivity skipped."
      };
    } else {
      try {
        const response = await fetch(
          "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
          {
            method: "POST",
            headers: {
              "content-type": "application/json"
            },
            body: JSON.stringify({
              app_id: config.feishuAppId,
              app_secret: config.feishuAppSecret
            }),
            signal: AbortSignal.timeout(8000)
          }
        );
        const payload = (await response.json()) as {
          code?: number;
          msg?: string;
        };
        if (response.ok && payload.code === 0) {
          feishu = {
            ok: true,
            detail: "Feishu credential check passed."
          };
        } else {
          feishu = {
            ok: false,
            detail: `Feishu check failed: ${payload.msg ?? `HTTP ${response.status}`}`,
            statusCode: response.status
          };
        }
      } catch {
        feishu = {
          ok: false,
          detail: "Feishu endpoint is unreachable or request timed out."
        };
      }
    }

    const ok = openClaw.ok && (model.ok || model.skipped === true) && (feishu.ok || feishu.skipped === true);

    return {
      ok,
      openClaw,
      model,
      feishu,
      checkedAt: nowIso()
    };
  }
}
