import { randomBytes } from "crypto";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/server/auth";
import { createOrUpdateWebhook, createOctokit } from "@/server/github";
import { getAppUrl } from "@/server/env";
import { prisma } from "@/server/prisma";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "connect").trim();
  const owner = String(formData.get("owner") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();

  if (!owner || !name) {
    return NextResponse.json({ error: "owner and name are required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Handle Disconnect Action
  if (intent === "disconnect") {
    const existingRepo = await prisma.repo.findFirst({
      where: {
        userId: user.id,
        owner,
        name
      }
    });

    if (existingRepo) {
      // 1. Delete Webhook from GitHub
      if (existingRepo.webhookId) {
        try {
          const octokit = createOctokit(user.accessToken);
          await octokit.repos.deleteWebhook({
            owner,
            repo: name,
            hook_id: existingRepo.webhookId
          });
        } catch (error) {
          console.warn("Failed to delete webhook from GitHub:", error);
        }
      }

      // 2. Pre-fetch event IDs to perform safe scalar delete for ActionLogs (avoids relation filtering bug in deleteMany)
      const repoEvents = await prisma.event.findMany({
        where: { repoId: existingRepo.id },
        select: { id: true }
      });
      const eventIds = repoEvents.map(ev => ev.id);

      // 3. Cascade delete in transaction using compatible scalar filters
      await prisma.$transaction([
        prisma.rule.deleteMany({ where: { repoId: existingRepo.id } }),
        prisma.actionLog.deleteMany({ where: { eventId: { in: eventIds } } }),
        prisma.event.deleteMany({ where: { repoId: existingRepo.id } }),
        prisma.repo.delete({ where: { id: existingRepo.id } })
      ]);
    }

    return NextResponse.redirect(new URL("/dashboard", request.url), 303);
  }

  // Handle Connect Action
  const secret = randomBytes(32).toString("hex");
  const existingRepo = await prisma.repo.findUnique({
    where: {
      userId_owner_name: {
        userId: user.id,
        owner,
        name
      }
    }
  });

  const webhookId = await createOrUpdateWebhook({
    accessToken: user.accessToken,
    owner,
    repo: name,
    secret,
    appUrl: getAppUrl(request.url),
    webhookId: existingRepo?.webhookId
  });

  await prisma.repo.upsert({
    where: {
      userId_owner_name: {
        userId: user.id,
        owner,
        name
      }
    },
    update: {
      webhookId,
      webhookSecret: secret,
      active: true
    },
    create: {
      userId: user.id,
      owner,
      name,
      webhookId,
      webhookSecret: secret,
      active: true
    }
  });

  return NextResponse.redirect(new URL("/dashboard", request.url), 303);
}