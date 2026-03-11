import type { Metadata } from "next";
import { adminDb } from "@/lib/firebase-admin";
import type { Job } from "@/types";

export const metadata: Metadata = { title: "Admin – Jobs | FieldProof" };

export default async function AdminJobsPage() {
  const snap = await adminDb
    .collection("jobs")
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();

  const jobs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Job));

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">All Jobs</h1>
      <p className="mt-1 text-sm text-slate-500">
        Most recent {jobs.length} jobs across all tenants.
      </p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-6 py-3">Customer</th>
              <th className="px-6 py-3">Tech</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                  No jobs found.
                </td>
              </tr>
            ) : (
              jobs.map((j) => (
                <tr key={j.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-900">{j.customerName}</td>
                  <td className="px-6 py-3 text-slate-600">{j.techName}</td>
                  <td className="px-6 py-3 text-slate-500">{j.jobType}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        j.status === "completed"
                          ? "bg-success-100 text-success-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {j.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-400">
                    {new Date(j.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
