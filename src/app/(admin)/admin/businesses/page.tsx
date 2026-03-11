import type { Metadata } from "next";
import { adminDb } from "@/lib/firebase-admin";
import type { Business } from "@/types";

export const metadata: Metadata = { title: "Admin – Businesses | FieldProof" };

export default async function AdminBusinessesPage() {
  const snap = await adminDb
    .collection("businesses")
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();

  const businesses = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Business));

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">All Businesses</h1>
      <p className="mt-1 text-sm text-slate-500">
        {businesses.length} registered tenants.
      </p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-6 py-3">Business Name</th>
              <th className="px-6 py-3">Owner</th>
              <th className="px-6 py-3">Email</th>
              <th className="px-6 py-3">Plan</th>
              <th className="px-6 py-3">Jobs/Mo</th>
              <th className="px-6 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {businesses.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                  No businesses found.
                </td>
              </tr>
            ) : (
              businesses.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-900">{b.name}</td>
                  <td className="px-6 py-3 text-slate-600">{b.ownerName}</td>
                  <td className="px-6 py-3 text-slate-500">{b.email}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
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
  );
}
