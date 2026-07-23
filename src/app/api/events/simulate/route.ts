import { randomBytes } from "crypto";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/prisma";
import { processEvent } from "@/server/process-event";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const body = await request.json().catch(() => ({}));
    const eventType = body.eventType || "issues";
    const title = body.title || "Bug: System database timeout crash on login";
    const issueBody = body.body || "Critical error: database connection timed out during OAuth callback handshake.";

    const repo = await prisma.repo.findFirst({
      where: { userId, active: true },
      include: { user: true, rules: true }
    });

    if (!repo) {
      return NextResponse.json({ error: "No active repo connected to simulate events." }, { status: 400 });
    }

    const deliveryId = `sim_${randomBytes(12).toString("hex")}`;
    const payload = eventType === "issues" ? {
      action: "opened",
      issue: {
        number: Math.floor(100 + Math.random() * 900),
        title,
        body: issueBody,
        user: { login: session.user.name || "testuser" }
      },
      repository: { full_name: `${repo.owner}/${repo.name}` }
    } : eventType === "pull_request" ? {
      action: "opened",
      pull_request: {
        number: Math.floor(100 + Math.random() * 900),
        title,
        body: issueBody,
        user: { login: session.user.name || "testuser" }
      },
      repository: { full_name: `${repo.owner}/${repo.name}` }
    } : {
      ref: "refs/heads/main",
      commits: [{ message: title, author: { name: session.user.name || "testuser" } }],
      pusher: { name: session.user.name || "testuser" },
      repository: { full_name: `${repo.owner}/${repo.name}` }
    };

    const event = await prisma.event.create({
      data: {
        deliveryId,
        repoId: repo.id,
        eventType,
        action: payload.action || "push",
        payload
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

    return NextResponse.json({ ok: true, eventId: event.id, deliveryId });
  } catch (error: any) {
    console.error("Failed to simulate event:", error);
    return NextResponse.json({ error: error.message || "Failed to simulate event" }, { status: 500 });
  }
}
