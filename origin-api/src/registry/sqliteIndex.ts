import type { DatabaseSync } from "node:sqlite";
import type { ObjectKind, RegistryIndexEntry } from "../core/types.js";

export class SqliteRegistryIndex {
  constructor(private readonly db: DatabaseSync) {
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS registry_index (
        id TEXT NOT NULL,
        kind TEXT NOT NULL,
        lifecycle TEXT NOT NULL,
        version TEXT NOT NULL,
        title TEXT NOT NULL,
        file_path TEXT NOT NULL,
        hash TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (kind, id)
      );
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS registry_snapshots (
        snapshot_id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        payload_json TEXT NOT NULL
      );
    `);
  }

  upsertEntries(entries: RegistryIndexEntry[]): void {
    const statement = this.db.prepare(`
      INSERT INTO registry_index (id, kind, lifecycle, version, title, file_path, hash, updated_at)
      VALUES (:id, :kind, :lifecycle, :version, :title, :filePath, :hash, :updatedAt)
      ON CONFLICT(kind, id) DO UPDATE SET
        lifecycle = excluded.lifecycle,
        version = excluded.version,
        title = excluded.title,
        file_path = excluded.file_path,
        hash = excluded.hash,
        updated_at = excluded.updated_at
    `);

    this.db.exec("BEGIN");
    try {
      for (const item of entries) {
        statement.run({
          id: item.id,
          kind: item.kind,
          lifecycle: item.lifecycle,
          version: item.version,
          title: item.title,
          filePath: item.filePath,
          hash: item.hash,
          updatedAt: item.updatedAt
        });
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  listByKind(kind: ObjectKind): RegistryIndexEntry[] {
    const statement = this.db.prepare(`
      SELECT id, kind, lifecycle, version, title, file_path, hash, updated_at
      FROM registry_index
      WHERE kind = ?
      ORDER BY title ASC
    `);

    const rows = statement.all(kind) as Array<{
      id: string;
      kind: ObjectKind;
      lifecycle: RegistryIndexEntry["lifecycle"];
      version: string;
      title: string;
      file_path: string;
      hash: string;
      updated_at: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      lifecycle: row.lifecycle,
      version: row.version,
      title: row.title,
      filePath: row.file_path,
      hash: row.hash,
      updatedAt: row.updated_at
    }));
  }

  createSnapshot(snapshotId: string, createdAt: string, payload: unknown): void {
    const statement = this.db.prepare(`
      INSERT INTO registry_snapshots (snapshot_id, created_at, payload_json)
      VALUES (?, ?, ?)
    `);
    statement.run(snapshotId, createdAt, JSON.stringify(payload));
  }
}
