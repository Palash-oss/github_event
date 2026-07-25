import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/prisma";
import { createCustomerPortalSession } from "@/server/stripe";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id }
  });

  if (!user || !user.stripeCustomerId) {
    return NextResponse.json({ error: "No active Stripe customer account found" }, { status: 400 });
  }

  const appUrl = process.env.APP_URL || new URL(req.url).origin;

  try {
    const portalUrl = await createCustomerPortalSession({
      stripeCustomerId: user.stripeCustomerId,
      appUrl
    });

    return NextResponse.json({ url: portalUrl });
  } catch (error: any) {
    console.error("Failed to create Stripe Customer Portal session:", error);
    return NextResponse.json({ error: error.message || "Failed to create portal session" }, { status: 500 });
  }
}
