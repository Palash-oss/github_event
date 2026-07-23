import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { processEvent } from "@/server/process-event";
import { checkRateLimit } from "@/server/rate-limit";

export const runtime = "nodejs";

type WebhookPayload = {
  action?: string;
  repository?: {
    full_name?: string;
    owner?: { login?: string };
    name?: string;
  };
};

export async function POST(
  request: NextRequest,
  { params }: { params: { repoId: string } }
) {
  const repoId = params.repoId;
  if (!repoId) {
    return NextResponse.json({ error: "Missing repository ID in route" }, { status: 400 });
  }

  // Rate Limiting per repoId (100 requests per minute)
  const rateLimitResult = checkRateLimit(repoId, 100, 60000);
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: "Rate limit exceeded for this repository" }, { status: 429 });
  }

  const deliveryId = request.headers.get("x-github-delivery");
  const signature = request.headers.get("x-hub-signature-256");
  const eventType = request.headers.get("x-github-event") ?? "unknown";
  const bodyText = await request.text();

  if (!deliveryId || !signature) {
    return NextResponse.json({ error: "Missing GitHub signature headers" }, { status: 400 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(bodyText) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const repo = await prisma.repo.findUnique({
    where: {
      id: repoId
    },
    include: {
      user: true,
      rules: true
    }
  });

  if (!repo || !repo.active) {
    return NextResponse.json({ error: "Repository not connected or inactive" }, { status: 404 });
  }

  const expectedSignature = `sha256=${createHmac("sha256", repo.webhookSecret).update(bodyText).digest("hex")}`;
  if (!compareSignatures(signature, expectedSignature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const event = await prisma.event.create({
      data: {
        deliveryId,
        repoId: repo.id,
        eventType,
        action: payload.action ?? null,
        payload: JSON.parse(bodyText)
      },
      include: {
        repo: {
          include: {
            user: true,
            rules: true
          }
        }
      }
    });

    await processEvent(event);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ ok: true, duplicated: true });
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Webhook processing failed"
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

export function compareSignatures(received: string, expected: string): boolean {
  try {
    const receivedBuffer = Buffer.from(received);
    const expectedBuffer = Buffer.from(expected);
    if (receivedBuffer.length !== expectedBuffer.length) return false;
    return timingSafeEqual(receivedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002";
}
