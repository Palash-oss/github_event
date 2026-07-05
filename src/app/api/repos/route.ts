import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/server/auth";
import { listAccessibleRepos } from "@/server/github";
import { prisma } from "@/server/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    const repos = await listAccessibleRepos(user.accessToken);
    return NextResponse.json({ repos });
  } catch (error: any) {
    console.error("Failed to list accessible repos:", error);
    return NextResponse.json({ error: error.message || "Failed to load repositories" }, { status: 500 });
  }
}
