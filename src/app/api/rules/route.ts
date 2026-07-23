import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/prisma";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "create");
  const repoId = String(formData.get("repoId") ?? "");
  const ruleId = String(formData.get("ruleId") ?? "");

  const repo = await prisma.repo.findFirst({
    where: {
      id: repoId,
      userId: session.user.id
    }
  });

  if (!repo) {
    return NextResponse.json({ error: "Repository not found" }, { status: 404 });
  }

  if (intent === "delete") {
    if (!ruleId) {
      return NextResponse.json({ error: "ruleId is required" }, { status: 400 });
    }

    await prisma.rule.deleteMany({
      where: {
        id: ruleId,
        repoId: repo.id
      }
    });

    return NextResponse.redirect(new URL("/dashboard", request.url), 303);
  }

  const eventType = String(formData.get("eventType") ?? "issues").trim();
  const matchField = String(formData.get("matchField") ?? "title").trim();
  const matchType = String(formData.get("matchType") ?? "contains").trim();
  const matchValue = String(formData.get("matchValue") ?? "").trim();
  const actionLabel = String(formData.get("actionLabel") ?? "").trim();
  const actionComment = String(formData.get("actionComment") ?? "").trim();
  const notifySlack = String(formData.get("notifySlack") ?? "on") === "on";
  const notifyDiscord = String(formData.get("notifyDiscord") ?? "") === "on";
  const notifyTelegram = String(formData.get("notifyTelegram") ?? "") === "on";

  if (!matchValue) {
    return NextResponse.json({ error: "matchValue is required" }, { status: 400 });
  }

  await prisma.rule.create({
    data: {
      repoId: repo.id,
      eventType,
      matchField,
      matchType,
      matchValue,
      actionLabel: actionLabel || null,
      actionComment: actionComment || null,
      notifySlack,
      notifyDiscord,
      notifyTelegram
    }
  });

  return NextResponse.redirect(new URL("/dashboard", request.url), 303);
}