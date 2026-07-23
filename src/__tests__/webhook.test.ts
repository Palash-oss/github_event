import { describe, expect, it, beforeEach } from "vitest";
import { createHmac } from "crypto";
import { compareSignatures } from "../app/api/webhooks/github/[repoId]/route";
import { checkRateLimit, clearRateLimitStore } from "../server/rate-limit";
import { isPermanentErrorMessage } from "../server/process-event";

describe("Webhook Security & Handler Resilience", () => {
  beforeEach(() => {
    clearRateLimitStore();
  });

  describe("Webhook Signature Verification", () => {
    const secret = "test-secret-12345";
    const bodyText = JSON.stringify({ action: "opened", issue: { title: "Test Bug" } });
    const validHex = createHmac("sha256", secret).update(bodyText).digest("hex");
    const validSignature = `sha256=${validHex}`;

    it("accepts valid matching signature (happy path)", () => {
      const expectedSignature = `sha256=${createHmac("sha256", secret).update(bodyText).digest("hex")}`;
      expect(compareSignatures(validSignature, expectedSignature)).toBe(true);
    });

    it("rejects wrong signature / mismatched secret (auth failure)", () => {
      const wrongHex = createHmac("sha256", "wrong-secret").update(bodyText).digest("hex");
      const wrongSignature = `sha256=${wrongHex}`;
      expect(compareSignatures(wrongSignature, validSignature)).toBe(false);
    });

    it("rejects empty or malformed signature strings (edge case)", () => {
      expect(compareSignatures("", validSignature)).toBe(false);
      expect(compareSignatures("invalid-prefix-hex", validSignature)).toBe(false);
    });
  });

  describe("Webhook Rate Limiter", () => {
    it("allows requests under the rate limit threshold", () => {
      const repoId = "repo-101";
      for (let i = 0; i < 5; i++) {
        const res = checkRateLimit(repoId, 10, 60000);
        expect(res.success).toBe(true);
      }
    });

    it("blocks requests once rate limit threshold is exceeded (edge case)", () => {
      const repoId = "repo-102";
      for (let i = 0; i < 5; i++) {
        checkRateLimit(repoId, 5, 60000);
      }
      const exceedRes = checkRateLimit(repoId, 5, 60000);
      expect(exceedRes.success).toBe(false);
      expect(exceedRes.remaining).toBe(0);
    });
  });

  describe("Transient vs Permanent Failure Classification", () => {
    it("classifies authentication, 401, 403, 404 as permanent (dead-letter candidates)", () => {
      expect(isPermanentErrorMessage("Request failed with status code 401 Unauthorized")).toBe(true);
      expect(isPermanentErrorMessage("HttpError: Bad credentials (403)")).toBe(true);
      expect(isPermanentErrorMessage("Resource not found (404)")).toBe(true);
      expect(isPermanentErrorMessage("No issue or pull request number in payload")).toBe(true);
    });

    it("classifies transient network/server errors as retryable (not permanent)", () => {
      expect(isPermanentErrorMessage("ETIMEDOUT: Connection timed out")).toBe(false);
      expect(isPermanentErrorMessage("502 Bad Gateway")).toBe(false);
      expect(isPermanentErrorMessage("503 Service Unavailable")).toBe(false);
    });
  });
});
