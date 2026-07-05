import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { processEvent } from "@/server/process-event";

export const runtime = "nodejs";

type WebhookPayload = {
  action?: string;
  repository?: {
    full_name?: string;
    owner?: { login?: string };
    name?: string;
  };
};

export async function POST(request: NextRequest) {
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

  const repoInfo = payload.repository?.full_name ?? buildRepoFullName(payload);
  if (!repoInfo) {
    return NextResponse.json({ error: "Missing repository information" }, { status: 400 });
  }

  const [owner, name] = repoInfo.split("/");
  const repo = await prisma.repo.findFirst({
    where: {
      owner,
      name,
      active: true
    },
    include: {
      user: true,
      rules: true
    }
  });

  if (!repo) {
    return NextResponse.json({ error: "Repository not connected" }, { status: 404 });
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

function compareSignatures(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  if (receivedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(receivedBuffer, expectedBuffer);
}

function buildRepoFullName(payload: WebhookPayload) {
  const owner = payload.repository?.owner?.login;
  const name = payload.repository?.name;
  if (!owner || !name) return null;
  return `${owner}/${name}`;
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002";
}