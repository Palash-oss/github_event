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

  try {
    const events = await prisma.event.findMany({
      where: { repo: { userId: session.user.id } },
      orderBy: { receivedAt: "desc" },
      take: 8,
      include: {
        repo: true,
        actions: true
      }
    });

    return NextResponse.json({ events });
  } catch (error: any) {
    console.error("Failed to fetch events:", error.message || error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
