import { randomUUID } from "node:crypto";
import type { KitSpecV1, RoleSpecV1, TeamSpecV1 } from "../core/types.js";
import { validateRegistryBundle } from "../core/validator.js";
import { nowIso } from "../utils/time.js";
import { FileRegistry } from "./fileRegistry.js";
import { SqliteRegistryIndex } from "./sqliteIndex.js";
import type { RegistrySyncResult } from "./types.js";

function versionForObject(object: RoleSpecV1 | KitSpecV1 | TeamSpecV1): string {
  if (object.kind === "kit") {
    return object.version;
  }
  return object.specVersion;
}

export class RegistryService {
  constructor(
    private readonly fileRegistry: FileRegistry,
    private readonly index: SqliteRegistryIndex
  ) {}

  async sync(): Promise<RegistrySyncResult> {
    const bundle = await this.fileRegistry.loadBundle();
    const report = validateRegistryBundle(bundle);
    if (!report.valid) {
      return { report, indexEntries: [] };
    }

    const entries = bundle.records.map((record) => ({
      id: record.object.id,
      kind: record.object.kind,
      lifecycle: record.object.lifecycle,
      version: versionForObject(
        record.object as RoleSpecV1 | KitSpecV1 | TeamSpecV1
      ),
      title: record.object.title,
      filePath: record.filePath,
      hash: record.hash,
      updatedAt: record.object.updatedAt
    }));

    this.index.upsertEntries(entries);
    this.index.createSnapshot(randomUUID(), nowIso(), {
      counts: {
        roles: entries.filter((entry) => entry.kind === "role").length,
        kits: entries.filter((entry) => entry.kind === "kit").length,
        teams: entries.filter((entry) => entry.kind === "team").length
      }
    });

    return {
      report,
      indexEntries: entries
    };
  }

  async listRoles(): Promise<RoleSpecV1[]> {
    const objects = await this.fileRegistry.list("role");
    return objects as RoleSpecV1[];
  }

  async listKits(): Promise<KitSpecV1[]> {
    const objects = await this.fileRegistry.list("kit");
    return objects as KitSpecV1[];
  }

  async listTeams(): Promise<TeamSpecV1[]> {
    const objects = await this.fileRegistry.list("team");
    return objects as TeamSpecV1[];
  }

  async getRole(id: string): Promise<RoleSpecV1 | undefined> {
    const object = await this.fileRegistry.get("role", id);
    return object as RoleSpecV1 | undefined;
  }

  async getKit(id: string): Promise<KitSpecV1 | undefined> {
    const object = await this.fileRegistry.get("kit", id);
    return object as KitSpecV1 | undefined;
  }

  async getTeam(id: string): Promise<TeamSpecV1 | undefined> {
    const object = await this.fileRegistry.get("team", id);
    return object as TeamSpecV1 | undefined;
  }

  async getDefaultRole(): Promise<RoleSpecV1> {
    const roles = await this.listRoles();
    const active = roles.find((role) => role.lifecycle === "active");
    if (active) {
      return active;
    }
    const first = roles[0];
    if (!first) {
      throw new Error("No role found in registry.");
    }
    return first;
  }

  async getDefaultKit(): Promise<KitSpecV1> {
    const kits = await this.listKits();
    const active = kits.find((kit) => kit.lifecycle === "active");
    if (active) {
      return active;
    }
    const first = kits[0];
    if (!first) {
      throw new Error("No kit found in registry.");
    }
    return first;
  }

  async getDefaultTeam(): Promise<TeamSpecV1> {
    const teams = await this.listTeams();
    const active = teams.find((team) => team.lifecycle === "active");
    if (active) {
      return active;
    }
    const first = teams[0];
    if (!first) {
      throw new Error("No team found in registry.");
    }
    return first;
  }
}
