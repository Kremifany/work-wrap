import "server-only";

import Stripe from "stripe";
import { serverEnv, stripeEnabled } from "./env.server";

export const stripe = stripeEnabled
  ? new Stripe(serverEnv.STRIPE_SECRET_KEY, {
      apiVersion: "2026-02-25.clover",
      typescript: true,
    })
  : null;

export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    jobsPerMonth: 5,
    maxTechs: 1,
  },
  pro: {
    name: "Pro",
    price: 2500, // $25/mo — v1 beta pricing target
    jobsPerMonth: Infinity,
    maxTechs: 3,
  },
  team: {
    name: "Team",
    price: 9900,
    jobsPerMonth: Infinity,
    maxTechs: Infinity,
  },
} as const;

function planStripeConfig(plan: "pro" | "team") {
  return plan === "pro"
    ? {
        priceId: serverEnv.STRIPE_PRO_PRICE_ID,
        productId: serverEnv.STRIPE_PRO_PRODUCT_ID,
      }
    : {
        priceId: serverEnv.STRIPE_TEAM_PRICE_ID,
        productId: serverEnv.STRIPE_TEAM_PRODUCT_ID,
      };
}

export function isPaidPlanConfigured(plan: "pro" | "team"): boolean {
  const { priceId, productId } = planStripeConfig(plan);
  return Boolean(priceId || productId);
}

/** Resolve Stripe price ID from env price ID or product default price. */
export async function resolveCheckoutPriceId(
  plan: "pro" | "team"
): Promise<string | null> {
  if (!stripe) return null;

  const { priceId, productId } = planStripeConfig(plan);
  if (priceId) return priceId;
  if (!productId) return null;

  const product = await stripe.products.retrieve(productId);
  const defaultPrice = product.default_price;
  if (!defaultPrice) return null;

  return typeof defaultPrice === "string" ? defaultPrice : defaultPrice.id;
}

export function getPlanFromStripeLineItem(item: {
  price: { id: string; product: string | { id: string } };
}): "pro" | "team" | "free" {
  const priceId = item.price.id;
  const productId =
    typeof item.price.product === "string"
      ? item.price.product
      : item.price.product.id;

  if (
    priceId === serverEnv.STRIPE_PRO_PRICE_ID ||
    productId === serverEnv.STRIPE_PRO_PRODUCT_ID
  ) {
    return "pro";
  }
  if (
    priceId === serverEnv.STRIPE_TEAM_PRICE_ID ||
    productId === serverEnv.STRIPE_TEAM_PRODUCT_ID
  ) {
    return "team";
  }
  return "free";
}
