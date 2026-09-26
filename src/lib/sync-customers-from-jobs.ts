import "server-only";

import { adminDb } from "@/lib/firebase-admin";
import {
  buildServiceAddressesFromInput,
  normalizeCustomer,
} from "@/lib/customer-utils";
import type { Customer, Job } from "@/types";

function contactKey(name: string, email: string, phone: string): string {
  const e = email.trim().toLowerCase();
  if (e) return `email:${e}`;
  return `name:${name.trim().toLowerCase()}|phone:${phone.trim()}`;
}

/**
 * Ensure CRM customer records exist for job contacts.
 * Creates missing customers from denormalized job fields and links orphan jobs.
 * Reconciles `jobCount` from actual linked jobs (the stored counter drifts).
 */
export async function syncCustomersFromJobs(
  businessId: string
): Promise<{ created: number; linked: number }> {
  const [customersSnap, jobsSnap] = await Promise.all([
    adminDb.collection("customers").where("businessId", "==", businessId).get(),
    adminDb.collection("jobs").where("businessId", "==", businessId).limit(500).get(),
  ]);

  const customers = customersSnap.docs.map((d) =>
    normalizeCustomer({ id: d.id, ...d.data() } as Customer)
  );
  const byId = new Map(customers.map((c) => [c.id, c]));
  const byContact = new Map<string, Customer>();
  for (const c of customers) {
    byContact.set(contactKey(c.name, c.email, c.phone), c);
  }

  const jobs = jobsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Job));
  let created = 0;
  let linked = 0;
  /** Actual jobs per customer after linking (source of truth for jobCount). */
  const jobCounts = new Map<string, number>();

  const bumpCount = (customerId: string) => {
    jobCounts.set(customerId, (jobCounts.get(customerId) ?? 0) + 1);
  };

  for (const job of jobs) {
    const name = (job.customerName ?? "").trim();
    if (!name) continue;

    const email = (job.customerEmail ?? "").trim();
    const phone = (job.customerPhone ?? "").trim();
    const address = (job.jobAddress ?? "").trim();

    let customer =
      (job.customerId && byId.get(job.customerId)) ||
      byContact.get(contactKey(name, email, phone)) ||
      null;

    if (!customer) {
      const serviceAddresses = buildServiceAddressesFromInput([], address);
      const primary = serviceAddresses.find((a) => a.isPrimary) ?? serviceAddresses[0];
      const now = new Date().toISOString();
      const payload: Omit<Customer, "id"> = {
        businessId,
        name,
        email,
        phone,
        address: primary?.line1 ?? "",
        serviceAddresses,
        notes: "",
        jobCount: 1,
        createdAt: job.createdAt || now,
      };
      const ref = await adminDb.collection("customers").add(payload);
      customer = normalizeCustomer({ id: ref.id, ...payload });
      byId.set(customer.id, customer);
      byContact.set(contactKey(name, email, phone), customer);
      created += 1;
      bumpCount(customer.id);

      if (job.customerId !== customer.id) {
        await adminDb.collection("jobs").doc(job.id).update({ customerId: customer.id });
        linked += 1;
      }
      continue;
    }

    // Link orphan / mismatched job to existing CRM record
    if (!job.customerId || job.customerId !== customer.id) {
      await adminDb.collection("jobs").doc(job.id).update({ customerId: customer.id });
      linked += 1;
    }

    bumpCount(customer.id);

    // Import job address into serviceAddresses if missing
    if (address) {
      const hasAddress = customer.serviceAddresses.some(
        (a) => a.line1.trim().toLowerCase() === address.toLowerCase()
      );
      if (!hasAddress) {
        const serviceAddresses = buildServiceAddressesFromInput([
          ...customer.serviceAddresses,
          {
            label: customer.serviceAddresses.length === 0 ? "Primary" : "Job site",
            line1: address,
            isPrimary: customer.serviceAddresses.length === 0,
          },
        ]);
        const primary = serviceAddresses.find((a) => a.isPrimary) ?? serviceAddresses[0];
        await adminDb.collection("customers").doc(customer.id).update({
          serviceAddresses,
          address: primary?.line1 ?? customer.address,
        });
        customer = normalizeCustomer({
          ...customer,
          serviceAddresses,
          address: primary?.line1 ?? customer.address,
        });
        byId.set(customer.id, customer);
        byContact.set(contactKey(customer.name, customer.email, customer.phone), customer);
      }
    }
  }

  // Reconcile stored jobCount with linked jobs (fixes stale "2 jobs" badges)
  const writes: Promise<unknown>[] = [];
  for (const c of byId.values()) {
    const actual = jobCounts.get(c.id) ?? 0;
    if ((c.jobCount ?? 0) !== actual) {
      writes.push(
        adminDb.collection("customers").doc(c.id).update({ jobCount: actual })
      );
    }
  }
  if (writes.length > 0) await Promise.all(writes);

  return { created, linked };
}
