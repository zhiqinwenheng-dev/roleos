import { randomUUID } from "node:crypto";
import { join } from "node:path";
import type { RunRecord } from "../core/types.js";
import type { AuditEvent, SelfHostedState } from "./types.js";
import { ensureDir, readJsonFile, writeJsonFile } from "../utils/fs.js";
import { nowIso } from "../utils/time.js";

const defaultState: SelfHostedState = {
  installedKits: [],
  teamRuns: [],
  auditEvents: []
};

export class FileStateStore {
  private readonly statePath: string;

  constructor(private readonly rootDir: string) {
    this.statePath = join(rootDir, "self-hosted-state.json");
  }

  async initialize(): Promise<void> {
    await ensureDir(this.rootDir);
    try {
      await readJsonFile<SelfHostedState>(this.statePath);
    } catch {
      await this.save(defaultState);
    }
  }

  async load(): Promise<SelfHostedState> {
    await this.initialize();
    return readJsonFile<SelfHostedState>(this.statePath);
  }

  async save(state: SelfHostedState): Promise<void> {
    await writeJsonFile(this.statePath, state);
  }

  async installKit(kitId: string): Promise<SelfHostedState> {
    const state = await this.load();
    if (!state.installedKits.some((item) => item.kitId === kitId)) {
      state.installedKits.push({
        kitId,
        installedAt: nowIso()
      });
    }
    if (!state.activeKitId) {
      state.activeKitId = kitId;
    }
    await this.save(state);
    return state;
  }

  async uninstallKit(kitId: string): Promise<SelfHostedState> {
    const state = await this.load();
    state.installedKits = state.installedKits.filter((item) => item.kitId !== kitId);
    if (state.activeKitId === kitId) {
      state.activeKitId = state.installedKits[0]?.kitId;
    }
    await this.save(state);
    return state;
  }

  async switchActiveKit(kitId: string): Promise<SelfHostedState> {
    const state = await this.load();
    if (!state.installedKits.some((item) => item.kitId === kitId)) {
      throw new Error(`Kit ${kitId} is not installed.`);
    }
    state.activeKitId = kitId;
    await this.save(state);
    return state;
  }

  async logRun(run: RunRecord): Promise<void> {
    const state = await this.load();
    state.teamRuns.push(run);
    await this.save(state);
  }

  async logAudit(
    workspaceId: string,
    type: string,
    message: string,
    metadata?: Record<string, string>
  ): Promise<AuditEvent> {
    const state = await this.load();
    const event: AuditEvent = {
      id: randomUUID(),
      workspaceId,
      type,
      message,
      createdAt: nowIso(),
      metadata
    };
    state.auditEvents.push(event);
    await this.save(state);
    return event;
  }
}
