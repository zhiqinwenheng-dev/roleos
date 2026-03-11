export type LifecycleState = "draft" | "validated" | "active" | "deprecated";
export type SpecVersion = "v1";
export type ObjectKind = "role" | "kit" | "team";

export interface BaseSpec {
  id: string;
  kind: ObjectKind;
  specVersion: SpecVersion;
  lifecycle: LifecycleState;
  title: string;
  description: string;
  updatedAt: string;
}

export interface RoleSpecV1 extends BaseSpec {
  kind: "role";
  purpose: string;
  inputs: string[];
  outputs: string[];
  constraints: string[];
  readinessChecks?: string[];
  recommendedContexts?: string[];
  failureBoundaries?: string[];
  successInterpretation?: string;
  escalationHints?: string[];
}

export interface ModelPolicy {
  name: string;
  temperature: number;
  maxTokens: number;
}

export interface KitSpecV1 extends BaseSpec {
  kind: "kit";
  requiredAssets: string[];
  installTarget: "workspace" | "tenant";
  modelPolicy: ModelPolicy;
  docs: string;
  checks: string[];
  version: string;
  roleRefs: string[];
}

export interface TeamSpecV1 extends BaseSpec {
  kind: "team";
  participatingRoles: string[];
  requiredKits: string[];
  handoffOrder: string[];
  humanCheckpoints: string[];
  successCriteria: string[];
}

export type RegistryObject = RoleSpecV1 | KitSpecV1 | TeamSpecV1;

export interface RunRecord {
  id: string;
  workspaceId: string;
  source: "self-hosted" | "cloud";
  roleId: string;
  kitId: string;
  teamId?: string;
  input: string;
  output: string;
  status: "success" | "failed";
  retryCount: number;
  cost: number;
  trace: string[];
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenantContext {
  workspaceId: string;
  userId?: string;
}

export interface RegistryIndexEntry {
  id: string;
  kind: ObjectKind;
  lifecycle: LifecycleState;
  version: string;
  title: string;
  filePath: string;
  hash: string;
  updatedAt: string;
}
