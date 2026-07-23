import { getServerSession } from "next-auth/next";
import { NextRequest } from "next/server";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let isAlive = true;
      let lastEventId: string | null = null;

      const sendEvents = async () => {
        if (!isAlive) return;
        try {
          const events = await prisma.event.findMany({
            where: { repo: { userId } },
            orderBy: { receivedAt: "desc" },
            take: 8,
            include: {
              repo: true,
              actions: true
            }
          });

          const currentTopId = events[0]?.id || null;
          if (currentTopId !== lastEventId) {
            lastEventId = currentTopId;
            const dataStr = `data: ${JSON.stringify({ events })}\n\n`;
            controller.enqueue(encoder.encode(dataStr));
          }
        } catch (err) {
          console.warn("SSE fetch error:", err);
        }
      };

      // Initial push immediately
      await sendEvents();

      // Stream interval poll every 1.5 seconds for instant push
      const interval = setInterval(sendEvents, 1500);

      request.signal.addEventListener("abort", () => {
        isAlive = false;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // ignore stream close errors
        }
      });
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
