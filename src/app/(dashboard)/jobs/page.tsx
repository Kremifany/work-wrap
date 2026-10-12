import Link from "next/link";
import { requireSession } from "@/lib/auth-session";
import { adminDb } from "@/lib/firebase-admin";
import { Badge } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import {
  getJobTitle,
  getJobTechniciansLabel,
  getReportFilename,
  jobIncludesTech,
  normalizeJob,
} from "@/lib/job-utils";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, ClipboardList, Plus, X } from "lucide-react";
import type { Job, Tech } from "@/types";

export const metadata = { title: "Jobs" };

type SortKey =
  | "customer"
  | "job"
  | "type"
  | "address"
  | "techs"
  | "date"
  | "status";

type SortDir = "asc" | "desc";

const SORT_KEYS = new Set<SortKey>([
  "customer",
  "job",
  "type",
  "address",
  "techs",
  "date",
  "status",
]);

function parseSort(raw: string | undefined): SortKey {
  if (raw && SORT_KEYS.has(raw as SortKey)) return raw as SortKey;
  return "date";
}

function parseDir(raw: string | undefined, sort: SortKey): SortDir {
  if (raw === "asc" || raw === "desc") return raw;
  return sort === "date" ? "desc" : "asc";
}

function sortValue(job: Job, key: SortKey): string {
  switch (key) {
    case "customer":
      return (job.customerName || "").toLowerCase();
    case "job":
      return getJobTitle(job).toLowerCase();
    case "type":
      return (job.jobType || "General").toLowerCase();
    case "address":
      return (job.jobAddress || "").toLowerCase();
    case "techs":
      return getJobTechniciansLabel(job).toLowerCase();
    case "date":
      return job.createdAt || "";
    case "status":
      return job.status || "";
    default:
      return "";
  }
}

function jobsHref(opts: {
  status?: string;
  sort?: SortKey;
  dir?: SortDir;
  techId?: string;
}): string {
  const p = new URLSearchParams();
  if (opts.status) p.set("status", opts.status);
  if (opts.techId) p.set("techId", opts.techId);
  if (opts.sort && opts.sort !== "date") p.set("sort", opts.sort);
  if (opts.sort && opts.dir && !(opts.sort === "date" && opts.dir === "desc")) {
    p.set("dir", opts.dir);
  } else if (opts.sort === "date" && opts.dir === "asc") {
    p.set("dir", "asc");
  }
  const q = p.toString();
  return q ? `/jobs?${q}` : "/jobs";
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    sort?: string;
    dir?: string;
    techId?: string;
  }>;
}) {
  const [session, params] = await Promise.all([requireSession(), searchParams]);
  const { status } = params;
  const techId = params.techId?.trim() || undefined;
  const sort = parseSort(params.sort);
  const dir = parseDir(params.dir, sort);

  if (!session.business) {
    return <p className="text-neutral-500">No business profile found.</p>;
  }

  const [snap, techSnap] = await Promise.all([
    adminDb
      .collection("jobs")
      .where("businessId", "==", session.business.id)
      .limit(200)
      .get(),
    techId
      ? adminDb.collection("techs").doc(techId).get()
      : Promise.resolve(null),
  ]);

  let jobs = snap.docs.map((d) => normalizeJob({ id: d.id, ...d.data() } as Job));

  if (status === "completed" || status === "draft") {
    jobs = jobs.filter((j) => j.status === status);
  }

  if (techId) {
    jobs = jobs.filter((j) => jobIncludesTech(j, techId));
  }

  jobs = [...jobs].sort((a, b) => {
    const av = sortValue(a, sort);
    const bv = sortValue(b, sort);
    const cmp = av.localeCompare(bv, undefined, { numeric: true, sensitivity: "base" });
    return dir === "asc" ? cmp : -cmp;
  });

  const filterTech =
    techSnap?.exists
      ? ({ id: techSnap.id, ...techSnap.data() } as Tech)
      : null;
  const techName = filterTech?.name?.trim() || "Technician";
  const techBelongs =
    !techId ||
    (filterTech && filterTech.businessId === session.business.id);

  const statusHref = (value: string) =>
    jobsHref({ status: value || undefined, sort, dir, techId });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-brand-900">Jobs</h1>
        <Link href="/jobs/new" className="btn btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Job
        </Link>
      </div>

      {techId && techBelongs && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-brand-50 text-brand-800 border border-brand-200">
            Technician: {techName}
            <Link
              href={jobsHref({ status, sort, dir })}
              className="text-brand-600 hover:text-brand-900"
              aria-label="Clear technician filter"
              title="Clear filter"
            >
              <X className="w-3.5 h-3.5" />
            </Link>
          </span>
          <Link
            href="/team"
            className="text-sm text-neutral-500 hover:text-brand-700"
          >
            Back to team
          </Link>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {[
          { label: "All", value: "" },
          { label: "Completed", value: "completed" },
          { label: "Draft", value: "draft" },
        ].map((f) => (
          <Link
            key={f.value}
            href={statusHref(f.value)}
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

      <div className="card">
        {jobs.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <ClipboardList className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-500 text-sm">
              {techId
                ? `No jobs found for ${techName}.`
                : status
                  ? `No ${status} jobs found.`
                  : "No jobs yet."}
            </p>
            {!techId && (
              <Link
                href="/jobs/new"
                className="btn btn-primary mt-4 inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Create first job
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Mobile: compact clickable list */}
            <ul className="md:hidden divide-y divide-neutral-100">
              {jobs.map((job) => (
                <li key={job.id}>
                  <Link
                    href={`/jobs/${job.id}`}
                    className="flex items-center gap-3 px-4 py-3.5 active:bg-neutral-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-neutral-900 truncate">
                        {job.customerName || "Unknown customer"}
                      </p>
                      <p className="text-sm text-neutral-500 truncate mt-0.5">
                        {getJobTitle(job)}
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

            {/* Desktop: full table */}
            <div className="hidden md:block">
              <table className="fp-table table-fixed">
                <colgroup>
                  <col />
                  <col />
                  <col />
                  <col />
                  <col />
                  <col className="w-44" />
                  <col className="w-28" />
                  <col className="w-16" />
                  <col className="w-16" />
                </colgroup>
                <thead>
                  <tr>
                    <SortHeaderCell
                      label="Customer"
                      column="customer"
                      sort={sort}
                      dir={dir}
                      status={status}
                      techId={techId}
                    />
                    <SortHeaderCell
                      label="Job"
                      column="job"
                      sort={sort}
                      dir={dir}
                      status={status}
                      techId={techId}
                    />
                    <SortHeaderCell
                      label="Type"
                      column="type"
                      sort={sort}
                      dir={dir}
                      status={status}
                      techId={techId}
                    />
                    <SortHeaderCell
                      label="Address"
                      column="address"
                      sort={sort}
                      dir={dir}
                      status={status}
                      techId={techId}
                    />
                    <SortHeaderCell
                      label="Techs"
                      column="techs"
                      sort={sort}
                      dir={dir}
                      status={status}
                      techId={techId}
                    />
                    <SortHeaderCell
                      label="Date"
                      column="date"
                      sort={sort}
                      dir={dir}
                      status={status}
                      techId={techId}
                    />
                    <SortHeaderCell
                      label="Status"
                      column="status"
                      sort={sort}
                      dir={dir}
                      status={status}
                      techId={techId}
                    />
                    <th>Report</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id}>
                      <td className="font-medium truncate" title={job.customerName || undefined}>
                        {job.customerName || "—"}
                      </td>
                      <td className="truncate" title={getJobTitle(job)}>
                        {getJobTitle(job)}
                      </td>
                      <td className="text-neutral-500 text-sm truncate" title={job.jobType || "General"}>
                        {job.jobType || "General"}
                      </td>
                      <td className="text-neutral-500 truncate" title={job.jobAddress || undefined}>
                        {job.jobAddress || "—"}
                      </td>
                      <td className="text-neutral-500 truncate" title={getJobTechniciansLabel(job)}>
                        {getJobTechniciansLabel(job)}
                      </td>
                      <td className="text-neutral-500 whitespace-nowrap">{formatDate(job.createdAt)}</td>
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
                            download={getReportFilename(job)}
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
          </>
        )}
      </div>
    </div>
  );
}

function SortHeaderCell({
  label,
  column,
  sort,
  dir,
  status,
  techId,
}: {
  label: string;
  column: SortKey;
  sort: SortKey;
  dir: SortDir;
  status?: string;
  techId?: string;
}) {
  const active = sort === column;
  const nextDir: SortDir = active && dir === "asc" ? "desc" : "asc";
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;

  return (
    <th>
      <Link
        href={jobsHref({
          status,
          techId,
          sort: column,
          dir: active ? nextDir : column === "date" ? "desc" : "asc",
        })}
        className={`inline-flex items-center gap-1 hover:text-brand-700 transition-colors ${
          active ? "text-brand-800" : "text-inherit"
        }`}
        title={`Sort by ${label}`}
      >
        {label}
        <Icon className={`w-3.5 h-3.5 ${active ? "opacity-100" : "opacity-40"}`} />
      </Link>
    </th>
  );
}
