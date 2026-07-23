import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const totalRepos = await prisma.repo.count({ where: { userId, active: true } });
    const totalEvents = await prisma.event.count({ where: { repo: { userId } } });
    const totalActions = await prisma.actionLog.count({ where: { event: { repo: { userId } } } });

    const successfulActions = await prisma.actionLog.count({
      where: { event: { repo: { userId } }, status: "success" }
    });

    const failedActions = await prisma.actionLog.count({
      where: { event: { repo: { userId } }, status: "failed" }
    });

    const issuesCount = await prisma.event.count({
      where: { repo: { userId }, eventType: "issues" }
    });

    const prCount = await prisma.event.count({
      where: { repo: { userId }, eventType: "pull_request" }
    });

    const pushCount = await prisma.event.count({
      where: { repo: { userId }, eventType: "push" }
    });

    const priorityBreakdown = {
      P0: await prisma.event.count({ where: { repo: { userId }, aiPriority: "P0" } }),
      P1: await prisma.event.count({ where: { repo: { userId }, aiPriority: "P1" } }),
      P2: await prisma.event.count({ where: { repo: { userId }, aiPriority: "P2" } })
    };

    const successRate = totalActions > 0 ? Math.round((successfulActions / totalActions) * 100) : 100;

    return NextResponse.json({
      metrics: {
        totalRepos,
        totalEvents,
        totalActions,
        successfulActions,
        failedActions,
        successRate,
        eventTypeBreakdown: {
          issues: issuesCount,
          pull_request: prCount,
          push: pushCount
        },
        priorityBreakdown
      }
    });
  } catch (error: any) {
    console.error("Failed to fetch analytics metrics:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
