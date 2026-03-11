import { type NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { adminDb } from "@/lib/firebase-admin";
import { stripe } from "@/lib/stripe";
import { serverEnv } from "@/lib/env.server";
import { logger } from "@/lib/logger";
import type Stripe from "stripe";

const RELEVANT_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

async function updateBusinessPlan(
  stripeCustomerId: string,
  plan: "free" | "pro" | "team",
  subscriptionId: string | null
) {
  const snap = await adminDb
    .collection("businesses")
    .where("stripeCustomerId", "==", stripeCustomerId)
    .limit(1)
    .get();

  if (snap.empty) return;
  await snap.docs[0].ref.update({
    plan,
    stripeSubscriptionId: subscriptionId,
  });
}

function getPlanFromPriceId(priceId: string): "pro" | "team" | "free" {
  if (priceId === serverEnv.STRIPE_PRO_PRICE_ID) return "pro";
  if (priceId === serverEnv.STRIPE_TEAM_PRICE_ID) return "team";
  return "free";
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("Stripe-Signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe-Signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      serverEnv.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    logger.error("Stripe webhook signature verification failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Webhook signature invalid." }, { status: 400 });
  }

  logger.info("Stripe webhook received", { type: event.type });

  if (!RELEVANT_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true });
  }

  const subscription = event.data.object as Stripe.Subscription;
  const customerId = subscription.customer as string;
  const status = subscription.status;

  if (event.type === "customer.subscription.deleted" || status === "canceled") {
    await updateBusinessPlan(customerId, "free", null);
    return NextResponse.json({ received: true });
  }

  if (status === "active" || status === "trialing") {
    const priceId = subscription.items.data[0]?.price.id ?? "";
    const plan = getPlanFromPriceId(priceId);
    await updateBusinessPlan(customerId, plan, subscription.id);
  }

  return NextResponse.json({ received: true });
}
