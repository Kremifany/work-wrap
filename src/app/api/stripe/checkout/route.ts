import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import { stripe, PLANS } from "@/lib/stripe";
import { adminDb } from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";
import type { PlanType } from "@/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.business) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const { plan } = (await req.json()) as { plan: PlanType };
    if (plan === "free") {
      return NextResponse.json({ error: "Cannot checkout free plan." }, { status: 400 });
    }

    const planConfig = PLANS[plan];
    if (!planConfig.priceId) {
      return NextResponse.json({ error: "Plan price not configured." }, { status: 400 });
    }

    const business = session.business;

    // Get or create Stripe customer
    let stripeCustomerId = business.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: business.email,
        name: business.name,
        metadata: { businessId: business.id },
      });
      stripeCustomerId = customer.id;
      await adminDb
        .collection("businesses")
        .doc(business.id)
        .update({ stripeCustomerId });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      line_items: [{ price: planConfig.priceId, quantity: 1 }],
      success_url: `${APP_URL}/billing?success=1`,
      cancel_url: `${APP_URL}/billing?canceled=1`,
      allow_promotion_codes: true,
      metadata: { businessId: business.id, plan },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    logger.error("Stripe checkout failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Checkout failed. Please try again." }, { status: 500 });
  }
}
