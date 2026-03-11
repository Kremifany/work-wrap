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
    .orderBy("name", "asc")
    .get();

  const customers = customersSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() } as Customer)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">New Job</h1>
        <p className="text-neutral-500 text-sm mt-0.5">
          Fill in the details, complete the checklist, and add photos.
        </p>
      </div>
      <JobForm session={session} customers={customers} />
    </div>
  );
}
