import { createHmac, timingSafeEqual } from "node:crypto";

function normalizeSignature(input: string): string {
  const first = input.split(",")[0]?.trim() ?? "";
  const raw = first.startsWith("sha256=") ? first.slice("sha256=".length) : first;
  return raw.toLowerCase();
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function computeWebhookSignature(secret: string, payload: Buffer | string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifyWebhookSignature(input: {
  secret: string;
  payload: Buffer | string;
  providedSignature: string | string[] | undefined;
}): boolean {
  if (typeof input.providedSignature !== "string" || input.providedSignature.length === 0) {
    return false;
  }
  const expected = computeWebhookSignature(input.secret, input.payload).toLowerCase();
  const provided = normalizeSignature(input.providedSignature);
  if (provided.length === 0) {
    return false;
  }
  return safeEqual(provided, expected);
}

