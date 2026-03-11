import type { RunRecord } from "../core/types.js";

export interface FeishuDeliveryResult {
  delivered: boolean;
  statusCode?: number;
  detail: string;
}

export class FeishuChannel {
  constructor(private readonly webhookUrl?: string) {}

  async publishRunResult(run: RunRecord): Promise<FeishuDeliveryResult> {
    if (!this.webhookUrl) {
      return {
        delivered: false,
        detail: "Webhook not configured. Result retained in run log."
      };
    }

    const response = await fetch(this.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        msg_type: "text",
        content: {
          text: `[RoleOS] Run ${run.id} (${run.status}) - ${run.output}`
        }
      })
    });

    return {
      delivered: response.ok,
      statusCode: response.status,
      detail: response.ok ? "Delivered to Feishu webhook." : "Feishu webhook returned error."
    };
  }
}
