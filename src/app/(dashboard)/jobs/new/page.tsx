import { requireSession } from "@/lib/auth-session";
import { adminDb } from "@/lib/firebase-admin";
import JobForm from "@/components/job/JobForm";
import type { Customer } from "@/types";

export const metadata = { title: "New Job | Job Tracker Pro" };

export default async function NewJobPage() {
  const session = await requireSession();

  if (!session.business) {
    return (
      <div className="card card-padded max-w-md">
        <p className="text-neutral-600">
          Please{" "}
          <a href="/profile" className="text-brand-600 hover:underline">
            set up your business profile
          </a>{" "}
          before creating jobs.
        </p>
      </div>
    );
  }

  const customersSnap = await adminDb
    .collection("customers")
    .where("businessId", "==", session.business.id)
    .get();

  const customers = customersSnap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Customer))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">New Job</h1>
        <p className="text-neutral-500 text-sm mt-0.5">
          Create a job, upload before/after photos, then generate and email the inspection report.
        </p>
      </div>
      <JobForm session={session} customers={customers} />
    </div>
  );
}
