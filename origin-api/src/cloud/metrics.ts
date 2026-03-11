function escapeLabelValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

function labelsToString(labels: { [key: string]: string }): string {
  const parts = Object.entries(labels).map(
    ([key, value]) => `${key}="${escapeLabelValue(value)}"`
  );
  return `{${parts.join(",")}}`;
}

function round(value: number): number {
  return Number(value.toFixed(6));
}

function normalizeMetricPath(path: string): string {
  return path
    .replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi,
      ":uuid"
    )
    .replace(/\/[A-Za-z0-9_-]{32,}(?=\/|$)/g, "/:id");
}

interface HttpMetric {
  method: string;
  path: string;
  status: string;
}

function parseHttpMetricKey(key: string): HttpMetric {
  const [method, path, status] = key.split("|");
  return {
    method: method ?? "UNKNOWN",
    path: path ?? "/unknown",
    status: status ?? "0"
  };
}

export class CloudMetrics {
  private readonly startedAt = Date.now();
  private readonly httpRequestTotal = new Map<string, number>();
  private readonly httpRequestDurationMsTotal = new Map<string, number>();
  private readonly httpRequestDurationMsCount = new Map<string, number>();
  private readonly runStatusTotal = new Map<"success" | "failed", number>([
    ["success", 0],
    ["failed", 0]
  ]);
  private runUsageCostUsdTotal = 0;
  private runVariableRevenueUsdTotal = 0;

  recordHttpRequest(
    method: string,
    path: string,
    statusCode: number,
    durationMs: number
  ): void {
    const key = `${method.toUpperCase()}|${normalizeMetricPath(path)}|${statusCode}`;
    this.httpRequestTotal.set(key, (this.httpRequestTotal.get(key) ?? 0) + 1);
    this.httpRequestDurationMsTotal.set(
      key,
      (this.httpRequestDurationMsTotal.get(key) ?? 0) + round(durationMs)
    );
    this.httpRequestDurationMsCount.set(
      key,
      (this.httpRequestDurationMsCount.get(key) ?? 0) + 1
    );
  }

  recordRun(status: "success" | "failed", usageCostUsd: number, variableRevenueUsd: number): void {
    this.runStatusTotal.set(status, (this.runStatusTotal.get(status) ?? 0) + 1);
    this.runUsageCostUsdTotal = round(this.runUsageCostUsdTotal + usageCostUsd);
    this.runVariableRevenueUsdTotal = round(
      this.runVariableRevenueUsdTotal + variableRevenueUsd
    );
  }

  renderPrometheus(): string {
    const lines: string[] = [];
    lines.push("# HELP roleos_http_requests_total Total HTTP requests handled.");
    lines.push("# TYPE roleos_http_requests_total counter");

    const sortedKeys = Array.from(this.httpRequestTotal.keys()).sort();
    for (const key of sortedKeys) {
      const labels = parseHttpMetricKey(key);
      lines.push(
        `roleos_http_requests_total${labelsToString({
          method: labels.method,
          path: labels.path,
          status: labels.status
        })} ${this.httpRequestTotal.get(key)}`
      );
    }

    lines.push("# HELP roleos_http_request_duration_ms_sum Total request latency (ms).");
    lines.push("# TYPE roleos_http_request_duration_ms_sum counter");
    for (const key of sortedKeys) {
      const labels = parseHttpMetricKey(key);
      lines.push(
        `roleos_http_request_duration_ms_sum${labelsToString({
          method: labels.method,
          path: labels.path,
          status: labels.status
        })} ${
          this.httpRequestDurationMsTotal.get(key) ?? 0
        }`
      );
    }

    lines.push("# HELP roleos_http_request_duration_ms_count Request count for latency metric.");
    lines.push("# TYPE roleos_http_request_duration_ms_count counter");
    for (const key of sortedKeys) {
      const labels = parseHttpMetricKey(key);
      lines.push(
        `roleos_http_request_duration_ms_count${labelsToString({
          method: labels.method,
          path: labels.path,
          status: labels.status
        })} ${
          this.httpRequestDurationMsCount.get(key) ?? 0
        }`
      );
    }

    lines.push("# HELP roleos_team_runs_total Team run outcomes.");
    lines.push("# TYPE roleos_team_runs_total counter");
    lines.push(
      `roleos_team_runs_total${labelsToString({ status: "success" })} ${
        this.runStatusTotal.get("success") ?? 0
      }`
    );
    lines.push(
      `roleos_team_runs_total${labelsToString({ status: "failed" })} ${
        this.runStatusTotal.get("failed") ?? 0
      }`
    );

    lines.push("# HELP roleos_team_run_usage_cost_usd_total Total run usage cost (USD).");
    lines.push("# TYPE roleos_team_run_usage_cost_usd_total counter");
    lines.push(`roleos_team_run_usage_cost_usd_total ${this.runUsageCostUsdTotal}`);

    lines.push("# HELP roleos_team_run_variable_revenue_usd_total Total variable revenue (USD).");
    lines.push("# TYPE roleos_team_run_variable_revenue_usd_total counter");
    lines.push(
      `roleos_team_run_variable_revenue_usd_total ${this.runVariableRevenueUsdTotal}`
    );

    lines.push("# HELP roleos_process_uptime_seconds Process uptime in seconds.");
    lines.push("# TYPE roleos_process_uptime_seconds gauge");
    lines.push(`roleos_process_uptime_seconds ${Math.floor((Date.now() - this.startedAt) / 1000)}`);

    const memory = process.memoryUsage();
    lines.push("# HELP roleos_process_resident_memory_bytes Resident memory usage.");
    lines.push("# TYPE roleos_process_resident_memory_bytes gauge");
    lines.push(`roleos_process_resident_memory_bytes ${memory.rss}`);
    lines.push("# HELP roleos_process_heap_used_bytes Heap used bytes.");
    lines.push("# TYPE roleos_process_heap_used_bytes gauge");
    lines.push(`roleos_process_heap_used_bytes ${memory.heapUsed}`);

    return `${lines.join("\n")}\n`;
  }
}
