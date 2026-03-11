import { describe, expect, it } from "vitest";
import {
  computeWebhookSignature,
  verifyWebhookSignature
} from "../../src/cloud/security.js";

describe("webhook signature", () => {
  it("validates matching HMAC signature", () => {
    const secret = "pay-secret";
    const payload = JSON.stringify({ hello: "world" });
    const signature = computeWebhookSignature(secret, payload);

    const valid = verifyWebhookSignature({
      secret,
      payload,
      providedSignature: `sha256=${signature}`
    });

    expect(valid).toBe(true);
  });

  it("rejects invalid signature", () => {
    const valid = verifyWebhookSignature({
      secret: "pay-secret",
      payload: JSON.stringify({ hello: "world" }),
      providedSignature: "sha256=bad"
    });

    expect(valid).toBe(false);
  });
});

