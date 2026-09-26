import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/auth-session";
import { adminDb } from "@/lib/firebase-admin";
import { Badge } from "@/components/ui";
import { formatDate, formatDateTime } from "@/lib/utils";
import { getJobTitle, normalizeJob } from "@/lib/job-utils";
import { mergeCustomerTimeline } from "@/lib/interactions";
import {
  CustomerServiceAddressesTable,
  EditCustomerForm,
} from "@/components/CustomerForms";
import { CustomerActivityTimeline } from "@/components/CustomerActivityTimeline";
import { normalizeCustomer } from "@/lib/customer-utils";
import { ArrowLeft, ChevronRight } from "lucide-react";
import type { Customer, Interaction, Job } from "@/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const snap = await adminDb.collection("customers").doc(id).get();
  const name = snap.data()?.name ?? "Customer";
  return { title: `${name} | Job Tracker Pro` };
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, session] = await Promise.all([params, requireSession()]);
  const business = session.business;
  if (!business) notFound();

  const [custSnap, jobsSnap, interactionsSnap] = await Promise.all([
    adminDb.collection("customers").doc(id).get(),
    adminDb
      .collection("jobs")
      .where("businessId", "==", business.id)
      .limit(200)
      .get(),
    adminDb
      .collection("interactions")
      .where("customerId", "==", id)
      .limit(100)
      .get(),
  ]);

  if (!custSnap.exists) notFound();
  const customer = normalizeCustomer({
    id: custSnap.id,
    ...custSnap.data(),
  } as Customer);
  if (customer.businessId !== business.id) notFound();

  const jobs = jobsSnap.docs
    .map((d) => normalizeJob({ id: d.id, ...d.data() } as Job))
    .filter((j) => j.customerId === id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 50);

  const storedInteractions = interactionsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Interaction))
    .filter((i) => i.businessId === business.id);
  const timeline = mergeCustomerTimeline(storedInteractions, jobs);

  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        href="/customers"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-brand-600 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Customers
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-brand-900">{customer.name}</h1>
        <p className="text-neutral-500 text-sm mt-0.5">
          {jobs.length} job{jobs.length !== 1 ? "s" : ""} &middot; Since{" "}
          {formatDate(customer.createdAt)}
        </p>
      </div>

      <div className="card card-padded">
        <h2 className="font-semibold text-neutral-900 mb-5">Customer Details</h2>
        <EditCustomerForm customer={customer} />
      </div>

      <div className="card card-padded">
        <div className="mb-5">
          <h2 className="font-semibold text-neutral-900">Service Addresses</h2>
          <p className="text-sm text-neutral-500 mt-0.5">
            Multiple job site locations linked to this customer.
          </p>
        </div>
        <CustomerServiceAddressesTable customer={customer} />
      </div>

      <CustomerActivityTimeline
        customerId={customer.id}
        interactions={timeline}
        defaultPhone={customer.phone}
      />

      <div className="card">
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-neutral-900">Job History</h2>
            <p className="text-sm text-neutral-500 mt-0.5">
              Jobs for this customer, including when the completion report was emailed.
            </p>
          </div>
          <Link
            href={`/jobs/new?customerId=${customer.id}`}
            className="btn btn-primary text-sm px-3 py-1.5 shrink-0"
          >
            + New Job
          </Link>
        </div>
        {jobs.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-neutral-400 text-sm">No jobs for this customer yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {jobs.map((job) => (
              <li key={job.id}>
                <Link
                  href={`/jobs/${job.id}`}
                  className="flex items-center gap-3 px-4 sm:px-6 py-3.5 hover:bg-neutral-50 active:bg-neutral-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-neutral-900 truncate">
                      {getJobTitle(job)}
                    </p>
                    <p className="text-sm text-neutral-500 truncate mt-0.5">
                      {[
                        job.jobAddress || null,
                        formatDate(job.createdAt),
                        job.reportSentAt
                          ? `Report ${formatDateTime(job.reportSentAt)}`
                          : "Report not sent",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <Badge
                    variant={job.status === "completed" ? "success" : "warning"}
                    size="sm"
                  >
                    {job.status === "completed" ? "Done" : "Draft"}
                  </Badge>
                  <ChevronRight className="w-4 h-4 text-neutral-300 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
