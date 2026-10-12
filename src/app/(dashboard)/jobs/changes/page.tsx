import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-session";
import { listRecentJobChanges } from "@/lib/job-changes";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Job edits history" };

export default async function JobChangesPage() {
  const session = await requireSession();
  if (!session.business) {
    return <p className="text-neutral-500">No business profile found.</p>;
  }
  if (session.role !== "owner") redirect("/jobs");

  const changes = await listRecentJobChanges(session.business.id);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/jobs" className="text-sm text-neutral-500 hover:text-brand-600">
          Back to Jobs
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-brand-900">Job edits history</h1>
        <p className="mt-0.5 text-sm text-neutral-500">
          Changes made on job pages, newest first.
        </p>
      </div>

      <div className="card">
        {changes.length === 0 ? (
          <p className="px-6 py-8 text-sm text-neutral-500">No changes recorded yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {changes.map((change) => (
              <li key={change.id} className="px-6 py-4">
                <Link
                  href={`/jobs/${change.jobId}`}
                  className="text-sm font-medium text-brand-700 hover:underline"
                >
                  {change.jobTitle}
                </Link>
                <p className="mt-1 text-sm text-neutral-900">{change.summary}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  {change.createdByName} · {formatDateTime(change.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
