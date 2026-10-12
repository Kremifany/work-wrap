import { requireSession } from "@/lib/auth-session";
import { adminDb } from "@/lib/firebase-admin";
import JobForm from "@/components/job/JobForm";
import { normalizeCustomer, getPrimaryAddressLine } from "@/lib/customer-utils";
import type { Customer, Tech } from "@/types";

export const metadata = { title: "New Job" };

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  const [session, params] = await Promise.all([requireSession(), searchParams]);

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

  const [customersSnap, techsSnap] = await Promise.all([
    adminDb
      .collection("customers")
      .where("businessId", "==", session.business.id)
      .get(),
    adminDb
      .collection("techs")
      .where("businessId", "==", session.business.id)
      .get(),
  ]);

  const customers = customersSnap.docs
    .map((d) => normalizeCustomer({ id: d.id, ...d.data() } as Customer))
    .sort((a, b) => a.name.localeCompare(b.name));

  const techs = techsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Tech))
    .sort((a, b) => {
      if (a.role === "owner" && b.role !== "owner") return -1;
      if (b.role === "owner" && a.role !== "owner") return 1;
      return a.name.localeCompare(b.name);
    });

  const initialCustomerId =
    params.customerId && customers.some((c) => c.id === params.customerId)
      ? params.customerId
      : undefined;

  const initialCustomer = initialCustomerId
    ? customers.find((c) => c.id === initialCustomerId)
    : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">New Job</h1>
        <p className="text-neutral-500 text-sm mt-0.5">
          Create a job, upload before/after photos, then generate and email the job completion report.
        </p>
      </div>
      <JobForm
        session={session}
        customers={customers}
        techs={techs}
        initialCustomerId={initialCustomerId}
        initialJobAddress={
          initialCustomer ? getPrimaryAddressLine(initialCustomer) : undefined
        }
      />
    </div>
  );
}
