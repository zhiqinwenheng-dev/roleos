import type { KitSpecV1, RoleSpecV1, TeamSpecV1 } from "../core/types.js";

export interface OpenClawAction {
  type: "load_skill" | "activate_kit" | "run_role" | "handoff" | "checkpoint";
  ref: string;
  detail?: string;
}

export interface AdapterMapping {
  roleId: string;
  kitId: string;
  teamId?: string;
  actions: OpenClawAction[];
}

export interface ExecutionRequest {
  workspaceId: string;
  source: "self-hosted" | "cloud";
  intent: string;
  role: RoleSpecV1;
  kit: KitSpecV1;
  team?: TeamSpecV1;
  metadata?: Record<string, string>;
}

export interface ExecutionResult {
  runId: string;
  status: "success" | "failed";
  output: string;
  cost: number;
  trace: string[];
  mapping: AdapterMapping;
  error?: string;
}

export interface OpenClawAdapterContract {
  mapToRuntime(request: ExecutionRequest): AdapterMapping;
  execute(request: ExecutionRequest): Promise<ExecutionResult>;
}
