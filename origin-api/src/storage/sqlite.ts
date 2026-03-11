import { DatabaseSync } from "node:sqlite";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";

export function openSqlite(dbPath: string): DatabaseSync {
  mkdirSync(dirname(dbPath), { recursive: true });
  return new DatabaseSync(dbPath);
}
