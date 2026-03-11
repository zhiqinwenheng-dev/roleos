import { openSqlite } from "../storage/sqlite.js";
import { CloudStore } from "./store.js";
import type { CloudStoreLike } from "./storeTypes.js";
import { SupabaseCloudStore } from "./supabaseStore.js";

export interface StoreFactoryOptions {
  provider?: "sqlite" | "supabase";
  dbPath: string;
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
}

export function createCloudStore(options: StoreFactoryOptions): CloudStoreLike {
  const provider = options.provider ?? "sqlite";
  if (provider === "supabase") {
    if (!options.supabaseUrl || !options.supabaseServiceRoleKey) {
      throw new Error(
        "Supabase store provider requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
      );
    }
    return new SupabaseCloudStore(options.supabaseUrl, options.supabaseServiceRoleKey);
  }

  const db = openSqlite(options.dbPath);
  return new CloudStore(db);
}
