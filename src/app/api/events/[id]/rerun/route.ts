import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/prisma";
import { processEvent } from "@/server/process-event";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const eventId = params.id;
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        repo: { userId: session.user.id }
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

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    await processEvent(event);

    return NextResponse.json({ ok: true, message: "Rules re-executed successfully" });
  } catch (error: any) {
    console.error("Failed to rerun event rules:", error);
    return NextResponse.json({ error: error.message || "Failed to rerun event rules" }, { status: 500 });
  }
}
