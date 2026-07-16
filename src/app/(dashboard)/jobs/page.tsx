import Link from "next/link";
import { requireSession } from "@/lib/auth-session";
import { adminDb } from "@/lib/firebase-admin";
import { Badge } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { getJobTitle, normalizeJob } from "@/lib/job-utils";
import { ClipboardList, Plus } from "lucide-react";
import type { Job } from "@/types";

export const metadata = { title: "Jobs | Job Tracker Pro" };

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const [session, { status }] = await Promise.all([
    requireSession(),
    searchParams,
  ]);

  if (!session.business) {
    return <p className="text-neutral-500">No business profile found.</p>;
  }

  const snap = await adminDb
    .collection("jobs")
    .where("businessId", "==", session.business.id)
    .limit(200)
    .get();

  let jobs = snap.docs
    .map((d) => normalizeJob({ id: d.id, ...d.data() } as Job))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (status === "completed" || status === "draft") {
    jobs = jobs.filter((j) => j.status === status);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-brand-900">Jobs</h1>
        <Link href="/jobs/new" className="btn btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Job
        </Link>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: "All", value: "" },
          { label: "Completed", value: "completed" },
          { label: "Draft", value: "draft" },
        ].map((f) => (
          <Link
            key={f.value}
            href={f.value ? `/jobs?status=${f.value}` : "/jobs"}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              (f.value === "" && !status) || status === f.value
                ? "bg-brand-700 text-white border-brand-700"
                : "bg-white text-neutral-600 border-neutral-300 hover:border-brand-400 hover:text-brand-700"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        {jobs.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <ClipboardList className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-500 text-sm">
              {status ? `No ${status} jobs found.` : "No jobs yet."}
            </p>
            <Link href="/jobs/new" className="btn btn-primary mt-4 inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create first job
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="fp-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Job</th>
                  <th>Address</th>
                  <th>Tech</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Report</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id}>
                    <td className="font-medium">{job.customerName || "—"}</td>
                    <td>{getJobTitle(job)}</td>
                    <td className="text-neutral-500 max-w-xs truncate">
                      {job.jobAddress || "—"}
                    </td>
                    <td className="text-neutral-500">{job.techName || "—"}</td>
                    <td className="text-neutral-500">{formatDate(job.createdAt)}</td>
                    <td>
                      <Badge
                        variant={job.status === "completed" ? "success" : "warning"}
                      >
                        {job.status === "completed" ? "Completed" : "Draft"}
                      </Badge>
                    </td>
                    <td>
                      {job.pdfUrl ? (
                        <a
                          href={job.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-600 hover:text-brand-700 text-sm font-medium"
                        >
                          PDF
                        </a>
                      ) : (
                        <span className="text-neutral-400 text-sm">—</span>
                      )}
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
