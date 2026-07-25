import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/prisma";
import { createCheckoutSession } from "@/server/stripe";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id }
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const appUrl = process.env.APP_URL || new URL(req.url).origin;

  try {
    const checkoutUrl = await createCheckoutSession({
      userId: user.id,
      userEmail: session.user.email ?? undefined,
      stripeCustomerId: user.stripeCustomerId,
      appUrl
    });

    return NextResponse.json({ url: checkoutUrl });
  } catch (error: any) {
    console.error("Failed to create Stripe Checkout session:", error);
    return NextResponse.json({ error: error.message || "Failed to create checkout session" }, { status: 500 });
  }
}
