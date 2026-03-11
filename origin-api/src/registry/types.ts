import type { RegistryIndexEntry, RegistryObject } from "../core/types.js";

export interface RegistryRecord {
  object: RegistryObject;
  filePath: string;
  hash: string;
  raw: string;
}

export interface RegistryBundle {
  records: RegistryRecord[];
}

export interface RegistryValidationIssue {
  code:
    | "schema_error"
    | "duplicate_id"
    | "unknown_reference"
    | "invalid_handoff"
    | "invalid_spec_version"
    | "invalid_lifecycle";
  message: string;
  objectId?: string;
  path?: string;
}

export interface RegistryValidationReport {
  valid: boolean;
  issues: RegistryValidationIssue[];
}

export interface RegistrySyncResult {
  report: RegistryValidationReport;
  indexEntries: RegistryIndexEntry[];
}
