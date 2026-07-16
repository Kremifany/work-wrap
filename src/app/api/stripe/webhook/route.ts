import { type NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { updateBusinessBillingFromSubscription } from "@/lib/stripe-billing-sync";
import { stripe } from "@/lib/stripe";
import { serverEnv } from "@/lib/env.server";
import { logger } from "@/lib/logger";
import type Stripe from "stripe";

const RELEVANT_EVENTS = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Billing is not enabled." }, { status: 503 });
  }

  if (!serverEnv.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook secret not configured." }, { status: 503 });
  }

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
    logger.error("Stripe webhook signature verification failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Webhook signature invalid." }, { status: 400 });
  }

  logger.info("Stripe webhook received", { type: event.type });

  if (!RELEVANT_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true });
  }

  if (event.type === "checkout.session.completed") {
    const checkout = event.data.object as Stripe.Checkout.Session;
    const subscriptionId = checkout.subscription;
    if (subscriptionId && typeof subscriptionId === "string") {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const planOverride = checkout.metadata?.plan as "pro" | "team" | undefined;
      await updateBusinessBillingFromSubscription(subscription, planOverride);
    }
    return NextResponse.json({ received: true });
  }

  const subscription = event.data.object as Stripe.Subscription;
  const status = subscription.status;

  if (event.type === "customer.subscription.deleted" || status === "canceled") {
    await updateBusinessBillingFromSubscription(subscription, "free");
    return NextResponse.json({ received: true });
  }

  if (status === "active" || status === "trialing") {
    await updateBusinessBillingFromSubscription(subscription);
  }

  return NextResponse.json({ received: true });
}
