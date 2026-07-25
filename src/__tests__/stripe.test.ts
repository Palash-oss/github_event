import { describe, expect, it, vi } from "vitest";
import { POST as stripeWebhookHandler } from "@/app/api/webhooks/stripe/route";
import { NextRequest } from "next/server";

vi.mock("@/server/stripe", () => ({
  getStripe: () => ({
    webhooks: {
      constructEvent: (body: string, sig: string, secret: string) => {
        if (sig === "invalid_sig") {
          throw new Error("Invalid signature");
        }
        return {
          type: "checkout.session.completed",
          data: {
            object: {
              client_reference_id: "user-123",
              customer: "cus_123",
              subscription: "sub_123"
            }
          }
        };
      }
    }
  })
}));

vi.mock("@/server/billing", () => ({
  handleProUpgrade: vi.fn(),
  handleGracefulDowngrade: vi.fn()
}));

vi.mock("@/server/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn()
    }
  }
}));

describe("Stripe Webhook Verification", () => {
  it("rejects requests missing stripe-signature header with 400 Bad Request", async () => {
    const req = new NextRequest("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      body: JSON.stringify({ event: "dummy" })
    });

    const res = await stripeWebhookHandler(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain("Missing stripe-signature header");
  });

  it("rejects invalid webhook signatures with 400 Bad Request", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";

    const req = new NextRequest("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "stripe-signature": "invalid_sig"
      },
      body: JSON.stringify({ event: "dummy" })
    });

    const res = await stripeWebhookHandler(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain("Signature Verification Failed");
  });

  it("processes valid checkout.session.completed webhook", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";

    const req = new NextRequest("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "stripe-signature": "valid_sig"
      },
      body: JSON.stringify({ type: "checkout.session.completed" })
    });

    const res = await stripeWebhookHandler(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.received).toBe(true);
  });
});
