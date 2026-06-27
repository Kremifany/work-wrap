import "server-only";

import { adminDb } from "./firebase-admin";
import { stripe, getPlanFromStripeLineItem } from "./stripe";
import { logger } from "./logger";
import type Stripe from "stripe";
import type { PlanType } from "@/types";

function resolvePlanFromSubscription(subscription: Stripe.Subscription): PlanType {
  const lineItem = subscription.items.data[0];
  const fromPrice = lineItem ? getPlanFromStripeLineItem(lineItem) : "free";
  if (fromPrice !== "free") return fromPrice;

  const fromMeta = subscription.metadata?.plan;
  if (fromMeta === "pro" || fromMeta === "team") return fromMeta;

  return "free";
}

export async function applySubscriptionToBusiness(
  businessId: string,
  subscription: Stripe.Subscription,
  plan?: PlanType
): Promise<void> {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const resolvedPlan = plan ?? resolvePlanFromSubscription(subscription);
  const active =
    resolvedPlan !== "free" &&
    (subscription.status === "active" || subscription.status === "trialing");

  await adminDb.collection("businesses").doc(businessId).update({
    plan: active ? resolvedPlan : "free",
    stripeCustomerId: customerId,
    stripeSubscriptionId: active ? subscription.id : null,
  });
}

export async function updateBusinessBillingFromSubscription(
  subscription: Stripe.Subscription,
  planOverride?: PlanType
): Promise<void> {
  const businessId = subscription.metadata?.businessId;
  const canceled =
    subscription.status === "canceled" || subscription.status === "incomplete_expired";
  const plan = canceled ? "free" : (planOverride ?? resolvePlanFromSubscription(subscription));

  if (businessId) {
    await applySubscriptionToBusiness(businessId, subscription, plan);
    return;
  }

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const snap = await adminDb
    .collection("businesses")
    .where("stripeCustomerId", "==", customerId)
    .limit(1)
    .get();

  if (!snap.empty) {
    await applySubscriptionToBusiness(snap.docs[0].id, subscription, plan);
  }
}

export async function syncBusinessPlanFromCheckoutSession(
  businessId: string,
  checkoutSessionId: string
): Promise<boolean> {
  if (!stripe) return false;

  try {
    const checkout = await stripe.checkout.sessions.retrieve(checkoutSessionId);

    if (checkout.metadata?.businessId !== businessId) {
      logger.warn("Checkout session business mismatch", { businessId, checkoutSessionId });
      return false;
    }

    if (checkout.status !== "complete") return false;

    const subscriptionId = checkout.subscription;
    if (!subscriptionId || typeof subscriptionId !== "string") return false;

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const fallbackPlan = checkout.metadata?.plan as PlanType | undefined;
    const plan = fallbackPlan ?? resolvePlanFromSubscription(subscription);

    await applySubscriptionToBusiness(businessId, subscription, plan);
    return true;
  } catch (err) {
    logger.error("Checkout billing sync failed", {
      businessId,
      checkoutSessionId,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

/** Fallback when webhook did not run — match Stripe customer by business email. */
export async function syncBusinessPlanFromStripeEmail(
  businessId: string,
  email: string
): Promise<boolean> {
  if (!stripe) return false;

  try {
    const customers = await stripe.customers.list({ email, limit: 1 });
    const customer = customers.data[0];
    if (!customer) return false;

    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 10,
    });

    const activeSub = subscriptions.data.find(
      (sub) => sub.status === "active" || sub.status === "trialing"
    );
    if (!activeSub) return false;

    await applySubscriptionToBusiness(
      businessId,
      activeSub,
      resolvePlanFromSubscription(activeSub)
    );
    return true;
  } catch (err) {
    logger.error("Email billing sync failed", {
      businessId,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}
