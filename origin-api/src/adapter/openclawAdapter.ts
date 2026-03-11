import { randomUUID } from "node:crypto";
import type {
  AdapterMapping,
  OpenClawAction,
  ExecutionRequest,
  ExecutionResult,
  OpenClawAdapterContract
} from "./contract.js";

function estimateCost(input: string, output: string): number {
  const tokenEstimate = Math.ceil((input.length + output.length) / 4);
  return Number((tokenEstimate * 0.000002).toFixed(6));
}

export class DeterministicOpenClawAdapter implements OpenClawAdapterContract {
  mapToRuntime(request: ExecutionRequest): AdapterMapping {
    const actions: OpenClawAction[] = [
      ...request.kit.requiredAssets.map((asset) => ({
        type: "load_skill" as const,
        ref: asset
      })),
      {
        type: "activate_kit" as const,
        ref: request.kit.id
      },
      {
        type: "run_role" as const,
        ref: request.role.id,
        detail: request.role.purpose
      }
    ];

    if (request.team) {
      for (const roleId of request.team.handoffOrder) {
        actions.push({
          type: "handoff",
          ref: roleId
        });
      }
      for (const checkpoint of request.team.humanCheckpoints) {
        actions.push({
          type: "checkpoint",
          ref: request.team.id,
          detail: checkpoint
        });
      }
    }

    return {
      roleId: request.role.id,
      kitId: request.kit.id,
      teamId: request.team?.id,
      actions
    };
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const mapping = this.mapToRuntime(request);
    const runId = randomUUID();
    const trace = mapping.actions.map((action) => `${action.type}:${action.ref}`);

    if (request.intent.toLowerCase().includes("[fail]")) {
      return {
        runId,
        status: "failed",
        output: "",
        cost: 0,
        trace,
        mapping,
        error: "Simulated runtime failure requested by input."
      };
    }

    const output = [
      `Role ${request.role.title} executed in ${request.source} mode.`,
      `Kit ${request.kit.title} policy: ${request.kit.modelPolicy.name}.`,
      request.team
        ? `Team ${request.team.title} orchestrated ${request.team.handoffOrder.length} handoff(s).`
        : "Team upgrade not required.",
      `Intent: ${request.intent}`
    ].join(" ");

    return {
      runId,
      status: "success",
      output,
      cost: estimateCost(request.intent, output),
      trace,
      mapping
    };
  }
}
