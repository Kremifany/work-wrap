import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/auth-session";
import { adminDb } from "@/lib/firebase-admin";
import { Badge } from "@/components/ui";
import { formatDate, formatDateTime } from "@/lib/utils";
import JobDetailActions from "@/components/job/JobDetailActions";
import { ArrowLeft, CheckSquare, Square, Calendar } from "lucide-react";
import type { Job } from "@/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return { title: `Job ${id.slice(0, 6)} | Job Tracker Pro` };
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, session] = await Promise.all([params, requireSession()]);

  if (!session.business) notFound();

  const snap = await adminDb.collection("jobs").doc(id).get();
  if (!snap.exists) notFound();

  const job = { id: snap.id, ...snap.data() } as Job;
  if (job.businessId !== session.business.id) notFound();

  const checkedCount = job.checklist.filter((c) => c.checked).length;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back */}
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-brand-600 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Jobs
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">
            {job.jobType} — {job.customerName || "Unknown Customer"}
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
      </div>

      {/* Actions */}
      <JobDetailActions job={job} />

      {/* Meta grid */}
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
                <a
                  href={`mailto:${job.customerEmail}`}
                  className="text-brand-600 hover:underline"
                >
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
                <a
                  href={`tel:${job.customerPhone}`}
                  className="text-brand-600 hover:underline"
                >
                  {job.customerPhone}
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
            <dt className="text-neutral-500 font-medium">Technician</dt>
            <dd className="text-neutral-900">{job.techName || "—"}</dd>
          </div>
          <div>
            <dt className="text-neutral-500 font-medium">Job Type</dt>
            <dd className="text-neutral-900">{job.jobType}</dd>
          </div>
          {job.reportSentAt && (
            <div className="sm:col-span-2">
              <dt className="text-neutral-500 font-medium">Report Sent</dt>
              <dd className="text-neutral-900">{formatDateTime(job.reportSentAt)}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Checklist */}
      <div className="card card-padded">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-neutral-900">Checklist</h2>
          <span className="text-sm text-neutral-500">
            {checkedCount}/{job.checklist.length} completed
          </span>
        </div>
        {job.checklist.length === 0 ? (
          <p className="text-sm text-neutral-400">No checklist items.</p>
        ) : (
          <ul className="space-y-2">
            {job.checklist.map((item, i) => (
              <li key={i} className="flex items-center gap-2.5 text-sm">
                {item.checked ? (
                  <CheckSquare className="w-4 h-4 text-success-600 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-neutral-300 shrink-0" />
                )}
                <span
                  className={
                    item.checked
                      ? "line-through text-neutral-400"
                      : "text-neutral-800"
                  }
                >
                  {item.item}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Notes */}
      {job.notes && (
        <div className="card card-padded">
          <h2 className="font-semibold text-neutral-900 mb-3">Work Notes</h2>
          <p className="text-sm text-neutral-700 whitespace-pre-wrap">{job.notes}</p>
        </div>
      )}

      {/* Photos */}
      {job.photos.length > 0 && (
        <div className="card card-padded">
          <h2 className="font-semibold text-neutral-900 mb-4">
            Photos ({job.photos.length})
          </h2>
          <div className="photo-grid">
            {job.photos.map((photo, i) => (
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
                  alt={photo.caption || `Photo ${i + 1}`}
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
  );
}
