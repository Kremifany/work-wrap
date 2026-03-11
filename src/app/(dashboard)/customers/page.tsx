import Link from "next/link";
import { requireSession } from "@/lib/auth-session";
import { adminDb } from "@/lib/firebase-admin";
import { Badge } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { Users, Plus } from "lucide-react";
import type { Customer } from "@/types";

export const metadata = { title: "Customers | Job Tracker Pro" };

export default async function CustomersPage() {
  const session = await requireSession();
  if (!session.business) {
    return <p className="text-neutral-500">No business profile found.</p>;
  }

  const snap = await adminDb
    .collection("customers")
    .where("businessId", "==", session.business.id)
    .orderBy("name", "asc")
    .get();

  const customers = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Customer));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-brand-900">Customers</h1>
        <Link href="/customers/new" className="btn btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Customer
        </Link>
      </div>

      <div className="card">
        {customers.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Users className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-500 text-sm">No customers yet.</p>
            <p className="text-neutral-400 text-xs mt-1">
              Create a job — customers are added automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="fp-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Jobs</th>
                  <th>Since</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td className="font-medium">{c.name}</td>
                    <td>
                      {c.email ? (
                        <a
                          href={`mailto:${c.email}`}
                          className="text-brand-600 hover:underline text-sm"
                        >
                          {c.email}
                        </a>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td>
                      {c.phone ? (
                        <a
                          href={`tel:${c.phone}`}
                          className="text-neutral-700 hover:text-brand-600 text-sm"
                        >
                          {c.phone}
                        </a>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="text-neutral-500 text-sm max-w-xs truncate">
                      {c.address || "—"}
                    </td>
                    <td>
                      <Badge variant="default">{c.jobCount}</Badge>
                    </td>
                    <td className="text-neutral-500 text-sm">
                      {formatDate(c.createdAt)}
                    </td>
                    <td>
                      <Link
                        href={`/customers/${c.id}`}
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
