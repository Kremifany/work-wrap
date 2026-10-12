import { requireSession } from "@/lib/auth-session";
import { redirect } from "next/navigation";
import BillingPageClient from "./BillingPageClient";
import { adminDb } from "@/lib/firebase-admin";
import {
  syncBusinessPlanFromCheckoutSession,
  syncBusinessPlanFromStripeEmail,
} from "@/lib/stripe-billing-sync";
import type { Business } from "@/types";

export const metadata = { title: "Billing" };

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{
    upgrade?: string;
    success?: string;
    canceled?: string;
    session_id?: string;
  }>;
}) {
  const [session, params] = await Promise.all([requireSession(), searchParams]);

  if (session.role !== "owner") redirect("/dashboard");
  if (!session.business) redirect("/profile");

  let business = session.business;

  if (params.success) {
    let synced = false;
    if (params.session_id) {
      synced = await syncBusinessPlanFromCheckoutSession(
        business.id,
        params.session_id
      );
    }
    if (!synced) {
      synced = await syncBusinessPlanFromStripeEmail(business.id, business.email);
    }
    if (synced) {
      const doc = await adminDb.collection("businesses").doc(business.id).get();
      if (doc.exists) {
        business = { id: doc.id, ...doc.data() } as Business;
      }
    }
  } else if (business.plan === "free") {
    const synced = await syncBusinessPlanFromStripeEmail(business.id, business.email);
    if (synced) {
      const doc = await adminDb.collection("businesses").doc(business.id).get();
      if (doc.exists) {
        business = { id: doc.id, ...doc.data() } as Business;
      }
    }
  }

  const now = new Date();
  const monthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  ).toISOString();
  const jobsSnap = await adminDb
    .collection("jobs")
    .where("businessId", "==", business.id)
    .get();

  const jobsThisMonth = jobsSnap.docs.filter((d) => {
    const createdAt = d.data().createdAt as string | undefined;
    return createdAt != null && createdAt >= monthStart;
  }).length;

  return (
    <BillingPageClient
      business={business}
      jobsThisMonth={jobsThisMonth}
      checkoutSuccess={!!params.success}
      checkoutCanceled={!!params.canceled}
    />
  );
}
