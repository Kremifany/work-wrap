import Link from "next/link";
import { requireSession } from "@/lib/auth-session";
import { adminDb } from "@/lib/firebase-admin";
import { Badge } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { getJobTitle, normalizeJob } from "@/lib/job-utils";
import DashboardOnboarding from "@/components/dashboard/DashboardOnboarding";
import {
  ClipboardList,
  Users,
  Clock,
  Plus,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import type { Job, DashboardStats } from "@/types";

export const metadata = { title: "Dashboard" };

async function getStats(businessId: string): Promise<DashboardStats> {
  const [jobsSnap, customersSnap] = await Promise.all([
    adminDb
      .collection("jobs")
      .where("businessId", "==", businessId)
      .limit(100)
      .get(),
    adminDb
      .collection("customers")
      .where("businessId", "==", businessId)
      .get(),
  ]);

  const jobs = jobsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Job))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  return {
    draftJobs: jobs.filter((j) => j.status === "draft").length,
    totalCustomers: customersSnap.size,
    jobsThisMonth: jobs.filter((j) => j.createdAt >= monthStart).length,
    recentJobs: jobs.slice(0, 8),
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ onboarding?: string }>;
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
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-label">Customers</p>
              <p className="stat-value">{stats.totalCustomers}</p>
            </div>
            <Users className="w-6 h-6 text-brand-400 mt-1" />
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
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="font-semibold text-neutral-900">Recent Jobs</h2>
          <Link
            href="/jobs"
            className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1 font-medium"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
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
              {stats.recentJobs.map((job) => (
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
                    <th>Customer</th>
                    <th>Job Type</th>
                    <th>Address</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentJobs.map((job) => (
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
