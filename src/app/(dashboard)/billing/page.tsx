import { requireSession } from "@/lib/auth-session";
import { redirect } from "next/navigation";
import BillingPageClient from "./BillingPageClient";
import { adminDb } from "@/lib/firebase-admin";

export const metadata = { title: "Billing | FieldProof" };

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ upgrade?: string; success?: string; canceled?: string }>;
}) {
  const [session, params] = await Promise.all([requireSession(), searchParams]);

  if (session.role !== "owner") redirect("/dashboard");
  if (!session.business) redirect("/profile");

  const business = session.business;

  // Get jobs this month count fresh
  const now = new Date();
  const monthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  ).toISOString();
  const jobsSnap = await adminDb
    .collection("jobs")
    .where("businessId", "==", business.id)
    .where("createdAt", ">=", monthStart)
    .get();

  const jobsThisMonth = jobsSnap.size;

  return (
    <BillingPageClient
      business={business}
      jobsThisMonth={jobsThisMonth}
      upgradeTarget={params.upgrade ?? null}
      checkoutSuccess={!!params.success}
      checkoutCanceled={!!params.canceled}
    />
  );
}
