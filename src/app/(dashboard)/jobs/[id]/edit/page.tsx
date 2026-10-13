import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/auth-session";
import { adminDb } from "@/lib/firebase-admin";
import { canEditJob, getJobTitle, normalizeJob } from "@/lib/job-utils";
import { normalizeCustomer } from "@/lib/customer-utils";
import JobEditForm from "@/components/job/JobEditForm";
import { ArrowLeft } from "lucide-react";
import type { Customer, Job, Tech } from "@/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const snap = await adminDb.collection("jobs").doc(id).get();
    if (!snap.exists) return { title: "Edit Job" };
    const job = normalizeJob({ id: snap.id, ...snap.data() } as Job);
    return { title: `Edit ${getJobTitle(job)}` };
  } catch {
    return { title: "Edit Job" };
  }
}

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, session] = await Promise.all([params, requireSession()]);
  if (!session.business) notFound();

  const [snap, customersSnap, techsSnap] = await Promise.all([
    adminDb.collection("jobs").doc(id).get(),
    adminDb
      .collection("customers")
      .where("businessId", "==", session.business.id)
      .get(),
    adminDb
      .collection("techs")
      .where("businessId", "==", session.business.id)
      .get(),
  ]);

  if (!snap.exists) notFound();
  const job = normalizeJob({ id: snap.id, ...snap.data() } as Job);
  if (job.businessId !== session.business.id) notFound();

  if (!canEditJob(session, job)) {
    redirect(`/jobs/${id}`);
  }
  if (job.status === "completed") {
    redirect(`/jobs/${id}`);
  }

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

  return (
    <div className="space-y-6">
      <Link
        href={`/jobs/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-brand-600 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to job
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-brand-900">Edit Job</h1>
        <p className="text-neutral-500 text-sm mt-0.5">
          Update job title, customer, address, and technicians. Notes and photos stay on the
          job page.
        </p>
      </div>

      <JobEditForm
        job={job}
        customers={customers}
        techs={techs}
        canAssignTechs={session.role === "owner"}
      />
    </div>
  );
}
