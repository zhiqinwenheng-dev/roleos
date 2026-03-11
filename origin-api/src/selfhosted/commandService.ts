import type { CommandResponse, ParsedCommand } from "../cli/types.js";
import type { RegistryService } from "../registry/registryService.js";
import { FileStateStore } from "../state/fileStateStore.js";
import type { GuidedInstaller } from "./installer.js";
import { OrchestrationRunner } from "../orchestration/runner.js";
import type { RoleSpecV1 } from "../core/types.js";
import { DeterministicOpenClawAdapter } from "../adapter/openclawAdapter.js";
import { HttpOpenClawAdapter } from "../adapter/httpOpenclawAdapter.js";
import { loadMarketCatalog } from "../market/catalog.js";

const LOCAL_WORKSPACE_ID = "local-workspace";

function asStringFlag(
  flags: Record<string, string | boolean>,
  key: string
): string | undefined {
  const value = flags[key];
  return typeof value === "string" ? value : undefined;
}

export class SelfHostedCommandService {
  constructor(
    private readonly registry: RegistryService,
    private readonly stateStore: FileStateStore,
    private readonly installer: GuidedInstaller,
    private readonly runner: OrchestrationRunner,
    private readonly registryRoot: string
  ) {}

  async execute(command: ParsedCommand): Promise<CommandResponse> {
    const syncResult = await this.registry.sync();
    if (!syncResult.report.valid) {
      return {
        ok: false,
        message: "Registry validation failed.",
        data: syncResult.report.issues
      };
    }

    await this.stateStore.initialize();
    switch (command.name) {
      case "setup":
        return this.handleSetup(command);
      case "doctor":
        return this.handleDoctor();
      case "market":
        return this.handleMarket();
      case "role":
        return this.handleRole();
      case "kit":
        return this.handleKit();
      case "install":
        return this.handleInstall(command.args[0]);
      case "uninstall":
        return this.handleUninstall(command.args[0]);
      case "switch-kit":
        return this.handleSwitchKit(command.args[0]);
      case "team":
        return this.handleTeam(command);
      case "help":
      default:
        return this.help();
    }
  }

  private help(): CommandResponse {
    return {
      ok: true,
      message: "RoleOS command list",
      data: {
        commands: [
          "/roleos setup [--yes] [--strict] [--no-verify]",
          "/roleos doctor",
          "/roleos market",
          "/roleos role",
          "/roleos kit",
          "/roleos install <kitId>",
          "/roleos uninstall <kitId>",
          "/roleos switch-kit <kitId>",
          "/roleos team [teamId] [--intent <text>] [--role <roleId>]"
        ]
      }
    };
  }

  private async handleSetup(command: ParsedCommand): Promise<CommandResponse> {
    const config = await this.installer.run({
      nonInteractive: Boolean(command.flags.yes),
      openClawEndpoint: asStringFlag(command.flags, "openclaw-endpoint"),
      openClawApiKey: asStringFlag(command.flags, "openclaw-key"),
      modelApiKey: asStringFlag(command.flags, "model-key"),
      feishuAppId: asStringFlag(command.flags, "feishu-app-id"),
      feishuAppSecret: asStringFlag(command.flags, "feishu-app-secret"),
      starterKitId: asStringFlag(command.flags, "starter-kit")
    });
    const skipVerify =
      command.flags["no-verify"] === true || command.flags["skip-verify"] === true;
    const strict = command.flags.strict === true;
    const connectivity = skipVerify ? undefined : await this.installer.verifyConnectivity(config);
    if (strict && connectivity && !connectivity.ok) {
      return {
        ok: false,
        message: "Setup completed but connectivity checks failed in strict mode.",
        data: {
          config,
          connectivity
        }
      };
    }

    await this.stateStore.installKit(config.starterKitId);
    await this.stateStore.logAudit(
      LOCAL_WORKSPACE_ID,
      "setup",
      "Self-hosted setup completed.",
      {
        starterKitId: config.starterKitId,
        connectivityOk: connectivity ? String(connectivity.ok) : "skipped"
      }
    );

    return {
      ok: true,
      message: connectivity?.ok === false ? "Setup complete with warnings." : "Self-hosted setup complete.",
      data: {
        config,
        connectivity
      }
    };
  }

  private async handleDoctor(): Promise<CommandResponse> {
    const config = await this.installer.loadConfig();
    if (!config) {
      return {
        ok: false,
        message: "Self-hosted config not found. Please run /roleos setup first."
      };
    }
    const connectivity = await this.installer.verifyConnectivity(config);
    return {
      ok: connectivity.ok,
      message: connectivity.ok ? "Connectivity checks passed." : "Connectivity checks found issues.",
      data: {
        config,
        connectivity
      }
    };
  }

  private async handleMarket(): Promise<CommandResponse> {
    const catalog = await loadMarketCatalog(this.registryRoot);
    return {
      ok: true,
      message: "Loaded shared market catalog.",
      data: catalog
    };
  }

  private async resolveRunner(): Promise<OrchestrationRunner> {
    const config = await this.installer.loadConfig();
    if (!config?.openClawEndpoint) {
      return this.runner;
    }
    return new OrchestrationRunner(
      new HttpOpenClawAdapter({
        endpoint: config.openClawEndpoint,
        apiKey: config.openClawApiKey,
        fallback: new DeterministicOpenClawAdapter()
      })
    );
  }

  private async handleRole(): Promise<CommandResponse> {
    const roles = await this.registry.listRoles();
    return {
      ok: true,
      message: `Loaded ${roles.length} role(s).`,
      data: roles
    };
  }

  private async handleKit(): Promise<CommandResponse> {
    const [kits, state] = await Promise.all([this.registry.listKits(), this.stateStore.load()]);
    return {
      ok: true,
      message: `Loaded ${kits.length} kit(s).`,
      data: {
        activeKitId: state.activeKitId,
        installedKits: state.installedKits,
        availableKits: kits
      }
    };
  }

  private async handleInstall(kitId?: string): Promise<CommandResponse> {
    if (!kitId) {
      return {
        ok: false,
        message: "Missing kitId. Usage: /roleos install <kitId>"
      };
    }

    const kit = await this.registry.getKit(kitId);
    if (!kit) {
      return {
        ok: false,
        message: `Kit ${kitId} not found in registry.`
      };
    }

    const state = await this.stateStore.installKit(kit.id);
    await this.stateStore.logAudit(LOCAL_WORKSPACE_ID, "install_kit", `Installed kit ${kit.id}`);

    return {
      ok: true,
      message: `Kit ${kitId} installed.`,
      data: state
    };
  }

  private async handleUninstall(kitId?: string): Promise<CommandResponse> {
    if (!kitId) {
      return {
        ok: false,
        message: "Missing kitId. Usage: /roleos uninstall <kitId>"
      };
    }
    const state = await this.stateStore.uninstallKit(kitId);
    await this.stateStore.logAudit(
      LOCAL_WORKSPACE_ID,
      "uninstall_kit",
      `Uninstalled kit ${kitId}`
    );
    return {
      ok: true,
      message: `Kit ${kitId} uninstalled.`,
      data: state
    };
  }

  private async handleSwitchKit(kitId?: string): Promise<CommandResponse> {
    if (!kitId) {
      return {
        ok: false,
        message: "Missing kitId. Usage: /roleos switch-kit <kitId>"
      };
    }
    const state = await this.stateStore.switchActiveKit(kitId);
    await this.stateStore.logAudit(
      LOCAL_WORKSPACE_ID,
      "switch_kit",
      `Switched active kit to ${kitId}`
    );
    return {
      ok: true,
      message: `Active kit switched to ${kitId}.`,
      data: state
    };
  }

  private async handleTeam(command: ParsedCommand): Promise<CommandResponse> {
    const state = await this.stateStore.load();
    const team = command.args[0]
      ? await this.registry.getTeam(command.args[0])
      : await this.registry.getDefaultTeam();
    if (!team) {
      return {
        ok: false,
        message: "Requested team was not found."
      };
    }

    const roleId = asStringFlag(command.flags, "role") ?? team.handoffOrder[0];
    const role = roleId ? await this.registry.getRole(roleId) : await this.registry.getDefaultRole();
    if (!role) {
      return {
        ok: false,
        message: "No role available for team run."
      };
    }

    const selectedKitId = state.activeKitId ?? team.requiredKits[0];
    const kit = selectedKitId ? await this.registry.getKit(selectedKitId) : await this.registry.getDefaultKit();
    if (!kit) {
      return {
        ok: false,
        message: "No kit available for team run."
      };
    }

    if (!state.installedKits.some((item) => item.kitId === kit.id)) {
      await this.stateStore.installKit(kit.id);
    }

    const intent =
      asStringFlag(command.flags, "intent") ?? "Generate an initial deliverable draft.";
    const runner = await this.resolveRunner();
    const run = await runner.execute({
      workspaceId: LOCAL_WORKSPACE_ID,
      source: "self-hosted",
      role: role as RoleSpecV1,
      kit,
      team,
      intent
    });

    await this.stateStore.logRun(run);
    await this.stateStore.logAudit(LOCAL_WORKSPACE_ID, "team_run", `Team run ${run.id}`, {
      teamId: team.id,
      roleId: role.id,
      kitId: kit.id
    });

    return {
      ok: run.status === "success",
      message: run.status === "success" ? "Team run succeeded." : "Team run failed.",
      data: run
    };
  }
}
