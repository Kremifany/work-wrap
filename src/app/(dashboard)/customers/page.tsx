import Link from "next/link";
import { requireSession } from "@/lib/auth-session";
import { adminDb } from "@/lib/firebase-admin";
import { Badge } from "@/components/ui";
import { formatDate, formatPhoneNumber, phoneTelHref } from "@/lib/utils";
import {
  getPrimaryAddressLine,
  normalizeCustomer,
} from "@/lib/customer-utils";
import { syncCustomersFromJobs } from "@/lib/sync-customers-from-jobs";
import { ChevronRight, Mail, MapPin, Phone, Plus, Users } from "lucide-react";
import type { Customer } from "@/types";

export const metadata = { title: "Customers | Job Tracker Pro" };

export default async function CustomersPage() {
  const session = await requireSession();
  if (!session.business) {
    return (
      <div className="card card-padded">
        <p className="text-neutral-500">
          No business profile found. Finish setup on{" "}
          <Link href="/profile" className="text-brand-600 hover:underline">
            Profile
          </Link>{" "}
          first.
        </p>
      </div>
    );
  }

  // Pull contacts from jobs into CRM so the tab isn't empty when jobs already exist
  await syncCustomersFromJobs(session.business.id);

  const snap = await adminDb
    .collection("customers")
    .where("businessId", "==", session.business.id)
    .get();

  const customers = snap.docs
    .map((d) => normalizeCustomer({ id: d.id, ...d.data() } as Customer))
    .sort((a, b) => a.name.localeCompare(b.name));

  const withEmail = customers.filter((c) => c.email.trim()).length;
  const withPhone = customers.filter((c) => c.phone.trim()).length;
  const withAddress = customers.filter((c) => getPrimaryAddressLine(c)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Customers</h1>
          <p className="text-neutral-500 text-sm mt-0.5">
            Contact details, phone numbers, emails, and primary service addresses.
          </p>
        </div>
        <Link href="/customers/new" className="btn btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Customer
        </Link>
      </div>

      {customers.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card card-padded">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Customers
            </p>
            <p className="mt-1 text-2xl font-bold text-brand-900">{customers.length}</p>
          </div>
          <div className="card card-padded">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              With email
            </p>
            <p className="mt-1 text-2xl font-bold text-brand-900">{withEmail}</p>
          </div>
          <div className="card card-padded">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              With phone
            </p>
            <p className="mt-1 text-2xl font-bold text-brand-900">{withPhone}</p>
          </div>
          <div className="card card-padded">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              With address
            </p>
            <p className="mt-1 text-2xl font-bold text-brand-900">{withAddress}</p>
          </div>
        </div>
      )}

      <div className="card">
        {customers.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Users className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-700 font-medium">No customers yet</p>
            <p className="text-neutral-500 text-sm mt-1 max-w-md mx-auto">
              Save names, emails, phones, and service addresses here. You can also
              add a customer while creating a job.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Link href="/customers/new" className="btn btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add customer
              </Link>
              <Link href="/jobs/new" className="btn btn-outline">
                Create a job
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Mobile: compact clickable list */}
            <ul className="md:hidden divide-y divide-neutral-100">
              {customers.map((c) => {
                const primaryAddress = getPrimaryAddressLine(c);
                const subtitle =
                  (c.phone ? formatPhoneNumber(c.phone) : null) ||
                  c.email.trim() ||
                  primaryAddress ||
                  "No contact info";
                return (
                  <li key={c.id}>
                    <Link
                      href={`/customers/${c.id}`}
                      className="flex items-center gap-3 px-4 py-3.5 active:bg-neutral-50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-neutral-900 truncate">{c.name}</p>
                        <p className="text-sm text-neutral-500 truncate mt-0.5">
                          {subtitle}
                        </p>
                      </div>
                      <Badge variant="default" size="sm">
                        {c.jobCount} {c.jobCount === 1 ? "job" : "jobs"}
                      </Badge>
                      <ChevronRight className="w-4 h-4 text-neutral-300 shrink-0" />
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Desktop: full table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="fp-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Primary address</th>
                    <th>Jobs</th>
                    <th>Since</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => {
                    const primaryAddress = getPrimaryAddressLine(c);
                    return (
                      <tr key={c.id}>
                        <td>
                          <Link
                            href={`/customers/${c.id}`}
                            className="font-medium text-neutral-900 hover:text-brand-700"
                          >
                            {c.name}
                          </Link>
                        </td>
                        <td>
                          {c.email ? (
                            <a
                              href={`mailto:${c.email}`}
                              className="inline-flex items-center gap-1.5 text-brand-600 hover:underline text-sm"
                            >
                              <Mail className="w-3.5 h-3.5 shrink-0" />
                              {c.email}
                            </a>
                          ) : (
                            <span className="text-neutral-400 text-sm">—</span>
                          )}
                        </td>
                        <td>
                          {c.phone ? (
                            <a
                              href={`tel:${phoneTelHref(c.phone)}`}
                              className="inline-flex items-center gap-1.5 text-neutral-700 hover:text-brand-600 text-sm"
                            >
                              <Phone className="w-3.5 h-3.5 shrink-0" />
                              {formatPhoneNumber(c.phone)}
                            </a>
                          ) : (
                            <span className="text-neutral-400 text-sm">—</span>
                          )}
                        </td>
                        <td className="text-neutral-500 text-sm max-w-xs">
                          {primaryAddress ? (
                            <span className="inline-flex items-start gap-1.5">
                              <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-neutral-400" />
                              <span className="truncate">
                                {primaryAddress}
                                {c.serviceAddresses.length > 1 && (
                                  <span className="ml-1 text-xs text-neutral-400">
                                    (+{c.serviceAddresses.length - 1} more)
                                  </span>
                                )}
                              </span>
                            </span>
                          ) : (
                            <span className="text-neutral-400">—</span>
                          )}
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
