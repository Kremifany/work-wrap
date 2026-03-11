import "server-only";

import Stripe from "stripe";
import { serverEnv } from "./env.server";

export const stripe = new Stripe(serverEnv.STRIPE_SECRET_KEY, {
  apiVersion: "2026-02-25.clover",
  typescript: true,
});

export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    priceId: null,
    jobsPerMonth: 5,
    maxTechs: 1,
  },
  pro: {
    name: "Pro",
    price: 4900, // cents
    priceId: serverEnv.STRIPE_PRO_PRICE_ID,
    jobsPerMonth: Infinity,
    maxTechs: 3,
  },
  team: {
    name: "Team",
    price: 9900,
    priceId: serverEnv.STRIPE_TEAM_PRICE_ID,
    jobsPerMonth: Infinity,
    maxTechs: Infinity,
  },
} as const;
