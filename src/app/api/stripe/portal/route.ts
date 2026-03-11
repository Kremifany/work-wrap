import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import { stripe } from "@/lib/stripe";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function POST() {
  try {
    const session = await getSession();
    if (!session?.business) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const stripeCustomerId = session.business.stripeCustomerId;
    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: "No Stripe customer found. Please upgrade first." },
        { status: 400 }
      );
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${APP_URL}/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Portal session failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
