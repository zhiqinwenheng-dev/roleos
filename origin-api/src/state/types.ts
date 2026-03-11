import type { RunRecord } from "../core/types.js";

export interface InstalledKitRecord {
  kitId: string;
  installedAt: string;
}

export interface AuditEvent {
  id: string;
  workspaceId: string;
  type: string;
  message: string;
  createdAt: string;
  metadata?: Record<string, string>;
}

export interface SelfHostedState {
  activeKitId?: string;
  installedKits: InstalledKitRecord[];
  teamRuns: RunRecord[];
  auditEvents: AuditEvent[];
}
