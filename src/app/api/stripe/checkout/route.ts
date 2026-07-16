import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import { stripe, resolveCheckoutPriceId } from "@/lib/stripe";
import { logger } from "@/lib/logger";
import type { PlanType } from "@/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function POST(req: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: "Billing is not enabled during beta." }, { status: 503 });
    }

    const session = await getSession();
    if (!session?.business) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const { plan } = (await req.json()) as { plan: PlanType };
    if (plan === "free") {
      return NextResponse.json({ error: "Cannot checkout free plan." }, { status: 400 });
    }

    const priceId = await resolveCheckoutPriceId(plan);
    if (!priceId) {
      return NextResponse.json({ error: "Plan price not configured." }, { status: 400 });
    }

    const business = session.business;

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: business.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${APP_URL}/billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/billing?canceled=1`,
      allow_promotion_codes: true,
      metadata: { businessId: business.id, plan },
      subscription_data: {
        metadata: { businessId: business.id, plan },
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Stripe checkout failed", { error: message });
    const userMessage =
      message.includes("No such product") || message.includes("No such price")
        ? "Stripe product or price not found. Use API keys and product IDs from the same Stripe account (test mode)."
        : "Checkout failed. Please try again.";
    return NextResponse.json({ error: userMessage }, { status: 500 });
  }
}
