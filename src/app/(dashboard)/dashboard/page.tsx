import Link from "next/link";
import { requireSession } from "@/lib/auth-session";
import { adminDb } from "@/lib/firebase-admin";
import { Badge } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { getJobTitle, normalizeJob } from "@/lib/job-utils";
import DashboardOnboarding from "@/components/dashboard/DashboardOnboarding";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronRight,
  ClipboardList,
  Clock,
  Plus,
} from "lucide-react";
import type { Job, DashboardStats } from "@/types";

export const metadata = { title: "Dashboard" };

type SortKey = "customer" | "job" | "address" | "date" | "status";
type SortDir = "asc" | "desc";

const SORT_KEYS = new Set<SortKey>(["customer", "job", "address", "date", "status"]);

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
    case "address":
      return (job.jobAddress || "").toLowerCase();
    case "date":
      return job.createdAt || "";
    case "status":
      return job.status || "";
    default:
      return "";
  }
}

function dashboardHref(opts: {
  sort: SortKey;
  dir: SortDir;
  onboarding?: string;
}): string {
  const p = new URLSearchParams();
  if (opts.onboarding) p.set("onboarding", opts.onboarding);
  if (opts.sort !== "date") p.set("sort", opts.sort);
  if (opts.sort === "date" && opts.dir === "asc") p.set("dir", "asc");
  if (opts.sort !== "date" && opts.dir === "desc") p.set("dir", "desc");
  const q = p.toString();
  return q ? `/dashboard?${q}` : "/dashboard";
}

async function getStats(businessId: string): Promise<DashboardStats> {
  const jobsSnap = await adminDb
    .collection("jobs")
    .where("businessId", "==", businessId)
    .limit(100)
    .get();

  const jobs = jobsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Job))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  return {
    draftJobs: jobs.filter((j) => j.status === "draft").length,
    jobsThisMonth: jobs.filter((j) => j.createdAt >= monthStart).length,
    recentJobs: jobs.slice(0, 8),
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ onboarding?: string; sort?: string; dir?: string }>;
}) {
  const [session, params] = await Promise.all([requireSession(), searchParams]);

  if (!session.business) {
    return (
      <div className="card card-padded text-center max-w-md mx-auto mt-12">
        <h2 className="text-xl font-semibold text-brand-800 mb-2">
          Complete your profile
        </h2>
        <p className="text-neutral-600 mb-4">
          Set up your business details before creating jobs.
        </p>
        <Link href="/profile" className="btn btn-primary">
          Set up profile
        </Link>
      </div>
    );
  }

  const stats = await getStats(session.business.id);
  const sort = parseSort(params.sort);
  const dir = parseDir(params.dir, sort);
  const recentJobs = [...stats.recentJobs].sort((a, b) => {
    const cmp = sortValue(a, sort).localeCompare(sortValue(b, sort), undefined, {
      numeric: true,
      sensitivity: "base",
    });
    return dir === "asc" ? cmp : -cmp;
  });
  const displayName =
    session.role === "tech"
      ? (session.tech?.name ?? session.business.ownerName)
      : session.business.ownerName;
  const firstName = displayName.split(" ")[0] || "there";
  const showOnboarding =
    params.onboarding === "1" && !session.business.dashboardOnboardingSeenAt;
  const planLimits = {
    free: 5,
    pro: Infinity,
    team: Infinity,
  } as const;
  const limit = planLimits[session.business.plan];
  const usagePercent =
    limit === Infinity
      ? 0
      : Math.min(100, (stats.jobsThisMonth / limit) * 100);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold text-brand-900">Dashboard</h1>
          <Link href="/jobs/new" className="btn btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Job
          </Link>
        </div>
        {showOnboarding && (
          <DashboardOnboarding
            firstName={firstName}
            businessName={session.business.name}
          />
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-label">In Draft</p>
              <p className="stat-value text-warning-700">{stats.draftJobs}</p>
            </div>
            <Clock className="w-6 h-6 text-warning-400 mt-1" />
          </div>
        </div>
      </div>

      {/* Monthly usage bar (free plan) */}
      {session.business.plan === "free" && (
        <div className="card card-padded">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-neutral-700">
              Jobs this month
            </p>
            <span className="text-sm text-neutral-500">
              {stats.jobsThisMonth} / {limit}
            </span>
          </div>
          <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                usagePercent >= 80 ? "bg-error-500" : "bg-brand-500"
              }`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          {usagePercent >= 100 && (
            <p className="text-xs text-error-600 mt-1.5">
              Limit reached.{" "}
              <Link href="/billing" className="underline font-medium">
                Upgrade to Pro
              </Link>{" "}
              for unlimited jobs.
            </p>
          )}
        </div>
      )}

      {/* Recent jobs */}
      <div className="card">
        <div className="px-6 py-4 border-b border-neutral-200">
          <h2 className="font-semibold text-neutral-900">Recent Jobs</h2>
        </div>
        {stats.recentJobs.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <ClipboardList className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-500 text-sm">No jobs yet.</p>
            <Link href="/jobs/new" className="btn btn-primary mt-4 inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create your first job
            </Link>
          </div>
        ) : (
          <>
            <ul className="md:hidden divide-y divide-neutral-100">
              {recentJobs.map((job) => (
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

            <div className="hidden md:block overflow-x-auto">
              <table className="fp-table">
                <thead>
                  <tr>
                    <SortHeader
                      label="Customer"
                      column="customer"
                      sort={sort}
                      dir={dir}
                      onboarding={params.onboarding}
                    />
                    <SortHeader
                      label="Job Type"
                      column="job"
                      sort={sort}
                      dir={dir}
                      onboarding={params.onboarding}
                    />
                    <SortHeader
                      label="Address"
                      column="address"
                      sort={sort}
                      dir={dir}
                      onboarding={params.onboarding}
                    />
                    <SortHeader
                      label="Date"
                      column="date"
                      sort={sort}
                      dir={dir}
                      onboarding={params.onboarding}
                    />
                    <SortHeader
                      label="Status"
                      column="status"
                      sort={sort}
                      dir={dir}
                      onboarding={params.onboarding}
                    />
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {recentJobs.map((job) => (
                    <tr key={job.id}>
                      <td className="font-medium">{job.customerName || "—"}</td>
                      <td>{getJobTitle(job)}</td>
                      <td className="text-neutral-500 max-w-xs truncate">{job.jobAddress || "—"}</td>
                      <td className="text-neutral-500">{formatDate(job.createdAt)}</td>
                      <td>
                        <Badge variant={job.status === "completed" ? "success" : "warning"}>
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
          </>
        )}
      </div>
    </div>
  );
}

function SortHeader({
  label,
  column,
  sort,
  dir,
  onboarding,
}: {
  label: string;
  column: SortKey;
  sort: SortKey;
  dir: SortDir;
  onboarding?: string;
}) {
  const active = sort === column;
  const nextDir: SortDir = active && dir === "asc" ? "desc" : "asc";
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;

  return (
    <th>
      <Link
        href={dashboardHref({
          onboarding,
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
