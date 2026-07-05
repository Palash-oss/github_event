import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { retryActionLog } from "@/server/process-event";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const cronHeader = request.headers.get("x-vercel-cron");
  const cronSecret = request.nextUrl.searchParams.get("secret");
  const configuredSecret = process.env.CRON_SECRET;

  if (cronHeader !== "1" && configuredSecret && cronSecret !== configuredSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const failedActionLogs = await prisma.actionLog.findMany({
    where: {
      status: "failed",
      attempts: {
        lt: 5
      }
    },
    include: {
      event: {
        include: {
          repo: {
            include: {
              user: true,
              rules: true
            }
          }
        }
      }
    }
  });

  const retried: string[] = [];
  for (const actionLog of failedActionLogs) {
    const delayMs = 60_000 * Math.pow(2, actionLog.attempts - 1);
    if (Date.now() - actionLog.createdAt.getTime() < delayMs) continue;
    const succeeded = await retryActionLog(actionLog);
    if (succeeded) retried.push(actionLog.id);
  }

  return NextResponse.json({ retried: retried.length });
}