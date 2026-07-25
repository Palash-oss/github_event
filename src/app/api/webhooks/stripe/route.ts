import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/server/stripe";
import { prisma } from "@/server/prisma";
import { handleGracefulDowngrade, handleProUpgrade } from "@/server/billing";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET in server config" }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    console.error("Stripe webhook signature verification failed:", err.message);
    return NextResponse.json({ error: `Webhook Signature Verification Failed: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id || session.metadata?.userId;
        const stripeCustomerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        const stripeSubscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

        if (userId && stripeCustomerId && stripeSubscriptionId) {
          await handleProUpgrade(userId, stripeCustomerId, stripeSubscriptionId);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeCustomerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
        const status = subscription.status === "active" ? "active" : subscription.status === "past_due" ? "past_due" : "canceled";
        const priceId = subscription.items.data[0]?.price.id;
        const periodEndRaw = (subscription as any).current_period_end;
        const periodEnd = typeof periodEndRaw === "number" ? new Date(periodEndRaw * 1000) : undefined;

        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { stripeSubscriptionId: subscription.id },
              { stripeCustomerId }
            ]
          }
        });

        if (user) {
          if (status === "active") {
            await handleProUpgrade(user.id, stripeCustomerId, subscription.id, priceId, periodEnd);
          } else if (status === "canceled") {
            await handleGracefulDowngrade(user.id);
          } else {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                subscriptionStatus: status,
                stripePriceId: priceId,
                stripeCurrentPeriodEnd: periodEnd
              }
            });
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { stripeSubscriptionId: subscription.id },
              { stripeCustomerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id }
            ]
          }
        });

        if (user) {
          await handleGracefulDowngrade(user.id);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeCustomerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;

        if (stripeCustomerId) {
          await prisma.user.updateMany({
            where: { stripeCustomerId },
            data: { subscriptionStatus: "past_due" }
          });
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error(`Error processing Stripe webhook event ${event.type}:`, error);
    return NextResponse.json({ error: "Internal Server Error processing Stripe event" }, { status: 500 });
  }
}
