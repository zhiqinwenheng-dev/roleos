import { randomUUID } from "node:crypto";
import type { OpenClawAdapterContract } from "../adapter/contract.js";
import type { KitSpecV1, RoleSpecV1, RunRecord, TeamSpecV1 } from "../core/types.js";
import { nowIso } from "../utils/time.js";

export interface RunRequest {
  workspaceId: string;
  source: "self-hosted" | "cloud";
  role: RoleSpecV1;
  kit: KitSpecV1;
  team?: TeamSpecV1;
  intent: string;
}

export class OrchestrationRunner {
  constructor(private readonly adapter: OpenClawAdapterContract) {}

  async execute(request: RunRequest): Promise<RunRecord> {
    const startedAt = nowIso();
    const result = await this.adapter.execute({
      workspaceId: request.workspaceId,
      source: request.source,
      role: request.role,
      kit: request.kit,
      team: request.team,
      intent: request.intent
    });

    const record: RunRecord = {
      id: result.runId ?? randomUUID(),
      workspaceId: request.workspaceId,
      source: request.source,
      roleId: request.role.id,
      kitId: request.kit.id,
      teamId: request.team?.id,
      input: request.intent,
      output: result.output,
      status: result.status,
      retryCount: 0,
      cost: result.cost,
      trace: result.trace,
      error: result.error,
      createdAt: startedAt,
      updatedAt: nowIso()
    };

    return record;
  }
}
