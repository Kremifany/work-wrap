import type { Metadata } from "next";
import { adminDb } from "@/lib/firebase-admin";
import type { Business } from "@/types";

export const metadata: Metadata = { title: "Admin – FieldProof" };

async function getAdminStats() {
  const [businessSnap, jobSnap] = await Promise.all([
    adminDb.collection("businesses").get(),
    adminDb.collection("jobs").get(),
  ]);

  const businesses = businessSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Business));

  const planCounts = { free: 0, pro: 0, team: 0 };
  for (const b of businesses) {
    planCounts[b.plan] = (planCounts[b.plan] ?? 0) + 1;
  }

  const recent = [...businesses]
    .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))
    .slice(0, 10);

  return {
    totalBusinesses: businesses.length,
    totalJobs:       jobSnap.size,
    planCounts,
    recent,
  };
}

export default async function AdminPage() {
  const stats = await getAdminStats();

  const cards = [
    { label: "Total Businesses", value: stats.totalBusinesses, color: "bg-brand-600"  },
    { label: "Total Jobs",        value: stats.totalJobs,        color: "bg-accent-600" },
    { label: "Free Plans",        value: stats.planCounts.free,  color: "bg-slate-500"  },
    { label: "Pro Plans",         value: stats.planCounts.pro,   color: "bg-success-600" },
    { label: "Team Plans",        value: stats.planCounts.team,  color: "bg-info-600"   },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Admin Overview</h1>
      <p className="mt-1 text-sm text-slate-500">
        Real-time snapshot of all tenants and activity.
      </p>

      {/* Stats grid */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`h-2 w-8 rounded-full ${c.color} mb-3`} />
            <p className="text-3xl font-bold text-slate-900">{c.value}</p>
            <p className="mt-1 text-sm text-slate-500">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Recent businesses table */}
      <div className="mt-8 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-slate-900">Recent Sign-ups</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-6 py-3">Business</th>
                <th className="px-6 py-3">Owner Email</th>
                <th className="px-6 py-3">Plan</th>
                <th className="px-6 py-3">Jobs/Mo</th>
                <th className="px-6 py-3">Since</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.recent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    No businesses registered yet.
                  </td>
                </tr>
              ) : (
                stats.recent.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-900">{b.name}</td>
                    <td className="px-6 py-3 text-slate-500">{b.email}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          b.plan === "team"
                            ? "bg-info-100 text-info-700"
                            : b.plan === "pro"
                            ? "bg-success-100 text-success-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {b.plan}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-600">{b.jobsThisMonth}</td>
                    <td className="px-6 py-3 text-slate-400">
                      {new Date(b.createdAt).toLocaleDateString("en-US", {
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
    </div>
  );
}
