import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/auth-session";
import { adminDb } from "@/lib/firebase-admin";
import { normalizeJob, normalizeJobPhotos, getJobTitle, getJobTechniciansLabel, canEditJob } from "@/lib/job-utils";
import { Badge } from "@/components/ui";
import { formatDate, formatDateTime, formatPhoneNumber, phoneTelHref } from "@/lib/utils";
import JobDetailActions from "@/components/job/JobDetailActions";
import { ArrowLeft, Calendar, Pencil } from "lucide-react";
import type { Job, Tech } from "@/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const snap = await adminDb.collection("jobs").doc(id).get();
    if (!snap.exists) {
      return { title: "Job" };
    }
    const job = normalizeJob({ id: snap.id, ...snap.data() } as Job);
    const jobTitle = getJobTitle(job);
    const customer = job.customerName?.trim();
    return {
      title: customer ? `${jobTitle} — ${customer}` : jobTitle,
    };
  } catch {
    return { title: "Job" };
  }
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, session] = await Promise.all([params, requireSession()]);

  if (!session.business) notFound();

  const [snap, techsSnap] = await Promise.all([
    adminDb.collection("jobs").doc(id).get(),
    adminDb
      .collection("techs")
      .where("businessId", "==", session.business.id)
      .get(),
  ]);
  if (!snap.exists) notFound();

  const job = normalizeJob({ id: snap.id, ...snap.data() } as Job);
  if (job.businessId !== session.business.id) notFound();

  const teamTechs = techsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Tech))
    .sort((a, b) => {
      if (a.role === "owner" && b.role !== "owner") return -1;
      if (b.role === "owner" && a.role !== "owner") return 1;
      return a.name.localeCompare(b.name);
    });

  // Display CRM contact (one email per customer); job address stays per-job
  if (job.customerId) {
    const customerSnap = await adminDb.collection("customers").doc(job.customerId).get();
    if (customerSnap.exists) {
      const customer = customerSnap.data() as {
        businessId?: string;
        email?: string;
        phone?: string;
        name?: string;
      };
      if (customer.businessId === session.business.id) {
        if (customer.email?.trim()) job.customerEmail = customer.email.trim();
        if (customer.phone?.trim()) job.customerPhone = customer.phone.trim();
        if (customer.name?.trim()) job.customerName = customer.name.trim();
      }
    }
  }

  const { beforePhotos, afterPhotos } = normalizeJobPhotos(job);
  const jobTitle = getJobTitle(job);
  const canEdit = canEditJob(session, job);
  const canEditDetails = canEdit && job.status === "draft";

  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-brand-600 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Jobs
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-brand-900 break-words">
            {jobTitle} — {job.customerName || "Unknown Customer"}
          </h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <Badge variant={job.status === "completed" ? "success" : "warning"} size="md">
              {job.status === "completed" ? "Completed" : "Draft"}
            </Badge>
            <span className="text-sm text-neutral-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(job.createdAt)}
            </span>
          </div>
        </div>
        {canEditDetails && (
          <Link
            href={`/jobs/${job.id}/edit`}
            className="btn btn-outline flex items-center gap-2"
          >
            <Pencil className="w-4 h-4" />
            Edit Job
          </Link>
        )}
      </div>

      <div className="card card-padded">
        <h2 className="font-semibold text-neutral-900 mb-4">Job Information</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div>
            <dt className="text-neutral-500 font-medium">Customer</dt>
            <dd className="text-neutral-900">{job.customerName || "—"}</dd>
          </div>
          <div>
            <dt className="text-neutral-500 font-medium">Email</dt>
            <dd>
              {job.customerEmail ? (
                <a href={`mailto:${job.customerEmail}`} className="text-brand-600 hover:underline">
                  {job.customerEmail}
                </a>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500 font-medium">Phone</dt>
            <dd>
              {job.customerPhone ? (
                <a href={`tel:${phoneTelHref(job.customerPhone)}`} className="text-brand-600 hover:underline">
                  {formatPhoneNumber(job.customerPhone)}
                </a>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500 font-medium">Service Address</dt>
            <dd className="text-neutral-900">{job.jobAddress || "—"}</dd>
          </div>
          <div>
            <dt className="text-neutral-500 font-medium">
              {(job.techs?.length ?? 0) > 1 ? "Technicians" : "Technician"}
            </dt>
            <dd className="text-neutral-900">{getJobTechniciansLabel(job)}</dd>
          </div>
          {job.completedAt && (
            <div>
              <dt className="text-neutral-500 font-medium">Date Completed</dt>
              <dd className="text-neutral-900">{formatDate(job.completedAt)}</dd>
            </div>
          )}
          {job.reportSentAt && (
            <div className="sm:col-span-2">
              <dt className="text-neutral-500 font-medium">Report Sent</dt>
              <dd className="text-neutral-900">{formatDateTime(job.reportSentAt)}</dd>
            </div>
          )}
        </dl>
      </div>

      <JobDetailActions
        job={job}
        session={session}
        techs={teamTechs}
        canEdit={canEdit}
      />

      {job.status === "completed" && (beforePhotos.length > 0 || afterPhotos.length > 0) && (
        <div className="space-y-6">
          {beforePhotos.length > 0 && (
            <div className="card card-padded">
              <h2 className="font-semibold text-neutral-900 mb-4">
                Before Photos ({beforePhotos.length})
              </h2>
              <div className="photo-grid">
                {beforePhotos.map((photo, i) => (
                  <a
                    key={i}
                    href={photo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative group rounded-lg overflow-hidden border border-neutral-200 block"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.caption || `Before photo ${i + 1}`}
                      className="w-full h-40 object-cover group-hover:opacity-90 transition-opacity"
                    />
                    {photo.caption && (
                      <div className="px-2 py-1.5 bg-white border-t border-neutral-200">
                        <p className="text-xs text-neutral-600 truncate">{photo.caption}</p>
                      </div>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}
          {afterPhotos.length > 0 && (
            <div className="card card-padded">
              <h2 className="font-semibold text-neutral-900 mb-4">
                After Photos ({afterPhotos.length})
              </h2>
              <div className="photo-grid">
                {afterPhotos.map((photo, i) => (
                  <a
                    key={i}
                    href={photo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative group rounded-lg overflow-hidden border border-neutral-200 block"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.caption || `After photo ${i + 1}`}
                      className="w-full h-40 object-cover group-hover:opacity-90 transition-opacity"
                    />
                    {photo.caption && (
                      <div className="px-2 py-1.5 bg-white border-t border-neutral-200">
                        <p className="text-xs text-neutral-600 truncate">{photo.caption}</p>
                      </div>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
