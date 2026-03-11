import { readFile, readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { ObjectKind, RegistryObject } from "../core/types.js";
import { parseRegistryObject } from "../core/schema.js";
import type { RegistryBundle, RegistryRecord } from "./types.js";
import { sha256 } from "../utils/hash.js";

const kinds: ObjectKind[] = ["role", "kit", "team"];

function kindFolder(kind: ObjectKind): string {
  if (kind === "role") {
    return "roles";
  }
  if (kind === "kit") {
    return "kits";
  }
  return "teams";
}

export class FileRegistry {
  constructor(private readonly rootDir: string) {}

  async loadBundle(): Promise<RegistryBundle> {
    const records: RegistryRecord[] = [];
    for (const kind of kinds) {
      const folder = join(this.rootDir, kindFolder(kind));
      let files: string[] = [];
      try {
        const folderStat = await stat(folder);
        if (!folderStat.isDirectory()) {
          continue;
        }
        files = await readdir(folder);
      } catch {
        continue;
      }

      for (const file of files) {
        if (!file.endsWith(".json")) {
          continue;
        }
        const filePath = resolve(folder, file);
        const raw = await readFile(filePath, "utf8");
        const payload = JSON.parse(raw) as unknown;
        const object = parseRegistryObject(payload);

        if (object.kind !== kind) {
          throw new Error(`Kind mismatch in ${filePath}: expected ${kind}, got ${object.kind}`);
        }

        records.push({
          object,
          filePath,
          raw,
          hash: sha256(raw)
        });
      }
    }

    return { records };
  }

  async list(kind: ObjectKind): Promise<RegistryObject[]> {
    const bundle = await this.loadBundle();
    return bundle.records
      .map((record) => record.object)
      .filter((record) => record.kind === kind);
  }

  async get(kind: ObjectKind, id: string): Promise<RegistryObject | undefined> {
    const objects = await this.list(kind);
    return objects.find((item) => item.id === id);
  }
}
