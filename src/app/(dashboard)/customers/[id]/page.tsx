import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/auth-session";
import { adminDb } from "@/lib/firebase-admin";
import { Badge } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { EditCustomerForm } from "@/components/CustomerForms";
import { ArrowLeft } from "lucide-react";
import type { Customer, Job } from "@/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const snap = await adminDb.collection("customers").doc(id).get();
  const name = snap.data()?.name ?? "Customer";
  return { title: `${name} | FieldProof` };
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, session] = await Promise.all([params, requireSession()]);
  if (!session.business) notFound();

  const [custSnap, jobsSnap] = await Promise.all([
    adminDb.collection("customers").doc(id).get(),
    adminDb
      .collection("jobs")
      .where("businessId", "==", session.business.id)
      .where("customerId", "==", id)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get(),
  ]);

  if (!custSnap.exists) notFound();
  const customer = { id: custSnap.id, ...custSnap.data() } as Customer;
  if (customer.businessId !== session.business.id) notFound();

  const jobs = jobsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Job));

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
          {customer.jobCount} job{customer.jobCount !== 1 ? "s" : ""} &middot; Since{" "}
          {formatDate(customer.createdAt)}
        </p>
      </div>

      {/* Edit form */}
      <div className="card card-padded">
        <h2 className="font-semibold text-neutral-900 mb-5">Customer Details</h2>
        <EditCustomerForm customer={customer} />
      </div>

      {/* Job history */}
      <div className="card">
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="font-semibold text-neutral-900">Job History</h2>
          <Link
            href={`/jobs/new?customerId=${customer.id}`}
            className="btn btn-primary text-sm px-3 py-1.5"
          >
            + New Job
          </Link>
        </div>
        {jobs.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-neutral-400 text-sm">No jobs for this customer yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="fp-table">
              <thead>
                <tr>
                  <th>Job Type</th>
                  <th>Address</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id}>
                    <td className="font-medium">{job.jobType}</td>
                    <td className="text-neutral-500 text-sm max-w-xs truncate">
                      {job.jobAddress || "—"}
                    </td>
                    <td className="text-neutral-500 text-sm">{formatDate(job.createdAt)}</td>
                    <td>
                      <Badge
                        variant={job.status === "completed" ? "success" : "warning"}
                      >
                        {job.status === "completed" ? "Completed" : "Draft"}
                      </Badge>
                    </td>
                    <td>
                      <Link
                        href={`/jobs/${job.id}`}
                        className="text-brand-600 hover:text-brand-700 text-sm font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
