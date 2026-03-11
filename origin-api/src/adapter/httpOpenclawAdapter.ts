import { randomUUID } from "node:crypto";
import type {
  AdapterMapping,
  ExecutionRequest,
  ExecutionResult,
  OpenClawAdapterContract
} from "./contract.js";
import { DeterministicOpenClawAdapter } from "./openclawAdapter.js";

export interface HttpOpenClawAdapterOptions {
  endpoint: string;
  apiKey?: string;
  timeoutMs?: number;
  fallback?: OpenClawAdapterContract;
}

export interface HealthCheckResult {
  ok: boolean;
  detail: string;
  statusCode?: number;
}

interface RemoteExecutionResponse {
  runId?: string;
  status?: "success" | "failed";
  output?: string;
  cost?: number;
  trace?: string[];
  error?: string;
}

function normalizeBaseUrl(endpoint: string): string {
  const trimmed = endpoint.trim();
  if (!trimmed) {
    throw new Error("OpenClaw endpoint is required.");
  }
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

function uniqueUrls(values: string[]): string[] {
  return Array.from(new Set(values));
}

function buildExecuteCandidates(baseUrl: string): string[] {
  return uniqueUrls([
    new URL("v1/execute", baseUrl).toString(),
    new URL("execute", baseUrl).toString(),
    baseUrl
  ]);
}

function buildHealthCandidates(baseUrl: string): string[] {
  return uniqueUrls([
    new URL("healthz", baseUrl).toString(),
    new URL("health", baseUrl).toString()
  ]);
}

function asHeaders(apiKey?: string): HeadersInit {
  if (!apiKey) {
    return {
      "content-type": "application/json"
    };
  }
  return {
    "content-type": "application/json",
    authorization: `Bearer ${apiKey}`
  };
}

function parseRemoteExecution(
  raw: unknown,
  fallbackMapping: AdapterMapping
): RemoteExecutionResponse | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const value = raw as Record<string, unknown>;
  const status = value.status;
  const output = value.output;
  if (status !== "success" && status !== "failed") {
    return undefined;
  }
  if (typeof output !== "string") {
    return undefined;
  }
  return {
    runId: typeof value.runId === "string" ? value.runId : undefined,
    status,
    output,
    cost: typeof value.cost === "number" ? value.cost : undefined,
    trace: Array.isArray(value.trace)
      ? value.trace.filter((item): item is string => typeof item === "string")
      : fallbackMapping.actions.map((action) => `${action.type}:${action.ref}`),
    error: typeof value.error === "string" ? value.error : undefined
  };
}

export async function checkOpenClawHealth(input: {
  endpoint: string;
  apiKey?: string;
  timeoutMs?: number;
}): Promise<HealthCheckResult> {
  const baseUrl = normalizeBaseUrl(input.endpoint);
  const timeoutMs = input.timeoutMs ?? 5000;
  const candidates = buildHealthCandidates(baseUrl);

  for (const url of candidates) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: input.apiKey ? { authorization: `Bearer ${input.apiKey}` } : undefined,
        signal: AbortSignal.timeout(timeoutMs)
      });
      if (response.ok) {
        return {
          ok: true,
          detail: `OpenClaw health check passed at ${url}.`,
          statusCode: response.status
        };
      }
      if (response.status !== 404) {
        return {
          ok: false,
          detail: `OpenClaw health endpoint responded ${response.status}.`,
          statusCode: response.status
        };
      }
    } catch {
      // Try next candidate.
    }
  }

  return {
    ok: false,
    detail: "OpenClaw endpoint is unreachable or health endpoint is unavailable."
  };
}

export class HttpOpenClawAdapter implements OpenClawAdapterContract {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fallback: OpenClawAdapterContract;
  private readonly deterministic = new DeterministicOpenClawAdapter();
  private readonly executeCandidates: string[];

  constructor(private readonly options: HttpOpenClawAdapterOptions) {
    this.baseUrl = normalizeBaseUrl(options.endpoint);
    this.timeoutMs = options.timeoutMs ?? 15_000;
    this.fallback = options.fallback ?? this.deterministic;
    this.executeCandidates = buildExecuteCandidates(this.baseUrl);
  }

  mapToRuntime(request: ExecutionRequest): AdapterMapping {
    return this.deterministic.mapToRuntime(request);
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const mapping = this.mapToRuntime(request);
    const payload = {
      workspaceId: request.workspaceId,
      source: request.source,
      intent: request.intent,
      role: request.role,
      kit: request.kit,
      team: request.team,
      mapping
    };

    for (const url of this.executeCandidates) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: asHeaders(this.options.apiKey),
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(this.timeoutMs)
        });
        if (!response.ok) {
          if (response.status === 404) {
            continue;
          }
          throw new Error(`OpenClaw execute failed with ${response.status}.`);
        }

        const raw = (await response.json()) as unknown;
        const parsed = parseRemoteExecution(raw, mapping);
        if (!parsed) {
          throw new Error("OpenClaw response schema is invalid.");
        }
        return {
          runId: parsed.runId ?? randomUUID(),
          status: parsed.status ?? "failed",
          output: parsed.output ?? "",
          cost: Number(parsed.cost ?? 0),
          trace: parsed.trace ?? mapping.actions.map((action) => `${action.type}:${action.ref}`),
          mapping,
          error: parsed.error
        };
      } catch {
        // Try next candidate or fallback.
      }
    }

    return this.fallback.execute(request);
  }
}

