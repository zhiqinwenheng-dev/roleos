import { join } from "node:path";
import { DeterministicOpenClawAdapter } from "../adapter/openclawAdapter.js";
import { HttpOpenClawAdapter } from "../adapter/httpOpenclawAdapter.js";
import { OrchestrationRunner } from "../orchestration/runner.js";
import { ensureDefaultRegistry } from "../registry/bootstrap.js";
import { FileRegistry } from "../registry/fileRegistry.js";
import { RegistryService } from "../registry/registryService.js";
import { SqliteRegistryIndex } from "../registry/sqliteIndex.js";
import { GuidedInstaller } from "../selfhosted/installer.js";
import { FileStateStore } from "../state/fileStateStore.js";
import { openSqlite } from "../storage/sqlite.js";

export interface AppContext {
  workspaceRoot: string;
  registryRoot: string;
  dbPath: string;
  stateRoot: string;
  configRoot: string;
  registryService: RegistryService;
  runner: OrchestrationRunner;
  stateStore: FileStateStore;
  installer: GuidedInstaller;
}

export interface AppContextOptions {
  openClawEndpoint?: string;
  openClawApiKey?: string;
}

export async function createAppContext(
  workspaceRoot: string,
  options: AppContextOptions = {}
): Promise<AppContext> {
  const registryRoot = join(workspaceRoot, "registry");
  const dbPath = join(workspaceRoot, ".roleos", "registry.db");
  const stateRoot = join(workspaceRoot, ".roleos", "state");
  const configRoot = join(workspaceRoot, ".roleos", "config");

  await ensureDefaultRegistry(registryRoot);
  const db = openSqlite(dbPath);
  const registry = new FileRegistry(registryRoot);
  const index = new SqliteRegistryIndex(db);
  const registryService = new RegistryService(registry, index);
  const deterministic = new DeterministicOpenClawAdapter();
  const openClawEndpoint =
    options.openClawEndpoint ?? process.env.ROLEOS_OPENCLAW_ENDPOINT;
  const openClawApiKey = options.openClawApiKey ?? process.env.ROLEOS_OPENCLAW_API_KEY;
  const adapter = openClawEndpoint
    ? new HttpOpenClawAdapter({
        endpoint: openClawEndpoint,
        apiKey: openClawApiKey,
        fallback: deterministic
      })
    : deterministic;
  const runner = new OrchestrationRunner(adapter);
  const stateStore = new FileStateStore(stateRoot);
  const installer = new GuidedInstaller(workspaceRoot, registryService);

  return {
    workspaceRoot,
    registryRoot,
    dbPath,
    stateRoot,
    configRoot,
    registryService,
    runner,
    stateStore,
    installer
  };
}
