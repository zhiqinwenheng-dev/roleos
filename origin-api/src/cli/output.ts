import type { CommandResponse } from "./types.js";

export function renderResponse(response: CommandResponse, asJson: boolean): string {
  if (asJson) {
    return JSON.stringify(response, null, 2);
  }

  const lines: string[] = [
    response.ok ? "Status: OK" : "Status: FAILED",
    `Message: ${response.message}`
  ];
  if (response.data !== undefined) {
    lines.push("Data:");
    lines.push(JSON.stringify(response.data, null, 2));
  }
  return lines.join("\n");
}
