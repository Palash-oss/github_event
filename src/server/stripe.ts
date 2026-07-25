import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const apiKey = process.env.STRIPE_SECRET_KEY ?? "sk_test_dummy_key_for_build";
    stripeInstance = new Stripe(apiKey, {
      apiVersion: "2024-09-30.acacia" as any,
      typescript: true
    });
  }
  return stripeInstance;
}

export async function createCheckoutSession(params: {
  userId: string;
  userEmail?: string;
  stripeCustomerId?: string | null;
  appUrl: string;
}): Promise<string> {
  const stripe = getStripe();
  const priceId = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;

  if (!priceId) {
    throw new Error("Missing STRIPE_PRO_MONTHLY_PRICE_ID in environment variables");
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer: params.stripeCustomerId || undefined,
    customer_email: params.stripeCustomerId ? undefined : params.userEmail,
    client_reference_id: params.userId,
    metadata: {
      userId: params.userId
    },
    line_items: [
      {
        price: priceId,
        quantity: 1
      }
    ],
    success_url: `${params.appUrl}/dashboard?billing=success`,
    cancel_url: `${params.appUrl}/dashboard?billing=cancel`
  });

  if (!session.url) {
    throw new Error("Failed to create Stripe Checkout URL");
  }

  return session.url;
}

export async function createCustomerPortalSession(params: {
  stripeCustomerId: string;
  appUrl: string;
}): Promise<string> {
  const stripe = getStripe();
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: params.stripeCustomerId,
    return_url: `${params.appUrl}/dashboard`
  });

  return portalSession.url;
}
