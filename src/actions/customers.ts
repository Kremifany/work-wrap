"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth-session";
import {
  customerAddressInputSchema,
  customerInputSchema,
  updateCustomerSchema,
  addCustomerInteractionSchema,
} from "@/lib/schemas";
import {
  buildServiceAddressesFromInput,
  normalizeCustomer,
  newAddressId,
} from "@/lib/customer-utils";
import { actorFromSession, logCustomerInteraction } from "@/lib/interactions";
import type { ActionResult, Customer, CustomerServiceAddress } from "@/types";

export interface CustomerInput {
  name: string;
  email: string;
  phone: string;
  address?: string;
  serviceAddresses?: Array<{
    id?: string;
    label?: string;
    line1: string;
    isPrimary?: boolean;
  }>;
  notes?: string;
}

async function getOwnedCustomer(
  customerId: string,
  businessId: string
): Promise<Customer | null> {
  const snap = await adminDb.collection("customers").doc(customerId).get();
  if (!snap.exists) return null;
  const customer = normalizeCustomer({ id: snap.id, ...snap.data() } as Customer);
  if (customer.businessId !== businessId) return null;
  return customer;
}

function denyUnlessOwner(role: string): { success: false; error: string } | null {
  if (role === "owner") return null;
  return { success: false, error: "Only the business owner can change customers." };
}

function revalidateCustomer(customerId: string) {
  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
}

export async function createCustomerAction(
  input: CustomerInput
): Promise<ActionResult<{ customerId: string }>> {
  try {
    const parsed = customerInputSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    const session = await getSession();
    if (!session?.business) return { success: false, error: "Not authenticated." };
    const denied = denyUnlessOwner(session.role);
    if (denied) return denied;

    const serviceAddresses = buildServiceAddressesFromInput(
      parsed.data.serviceAddresses ?? [],
      parsed.data.address
    );
    const primary = serviceAddresses.find((a) => a.isPrimary) ?? serviceAddresses[0];

    const customer: Omit<Customer, "id"> = {
      businessId: session.business.id,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      address: primary?.line1 ?? "",
      serviceAddresses,
      notes: parsed.data.notes ?? "",
      jobCount: 0,
      createdAt: new Date().toISOString(),
    };
    const ref = await adminDb.collection("customers").add(customer);
    revalidatePath("/customers");
    return { success: true, data: { customerId: ref.id } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create customer.";
    return { success: false, error: msg };
  }
}

export async function updateCustomerAction(
  customerId: string,
  input: Partial<CustomerInput>
): Promise<ActionResult> {
  try {
    const parsed = updateCustomerSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    const session = await getSession();
    if (!session?.business) return { success: false, error: "Not authenticated." };
    const denied = denyUnlessOwner(session.role);
    if (denied) return denied;

    const existing = await getOwnedCustomer(customerId, session.business.id);
    if (!existing) return { success: false, error: "Customer not found." };

    const patch: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) patch.name = parsed.data.name;
    if (parsed.data.email !== undefined) patch.email = parsed.data.email;
    if (parsed.data.phone !== undefined) patch.phone = parsed.data.phone;
    if (parsed.data.notes !== undefined) patch.notes = parsed.data.notes;

    if (parsed.data.serviceAddresses !== undefined || parsed.data.address !== undefined) {
      const serviceAddresses = buildServiceAddressesFromInput(
        parsed.data.serviceAddresses ?? existing.serviceAddresses,
        parsed.data.address ?? existing.address
      );
      const primary = serviceAddresses.find((a) => a.isPrimary) ?? serviceAddresses[0];
      patch.serviceAddresses = serviceAddresses;
      patch.address = primary?.line1 ?? "";
    }

    if (Object.keys(patch).length === 0) {
      return { success: false, error: "No changes to save." };
    }

    await adminDb.collection("customers").doc(customerId).update(patch);

    // Cascade contact fields to all jobs for this customer (email is one per customer)
    const contactPatch: Record<string, string> = {};
    if (typeof patch.email === "string") contactPatch.customerEmail = patch.email;
    if (typeof patch.phone === "string") contactPatch.customerPhone = patch.phone;
    if (typeof patch.name === "string") contactPatch.customerName = patch.name;
    if (Object.keys(contactPatch).length > 0) {
      const jobsSnap = await adminDb
        .collection("jobs")
        .where("customerId", "==", customerId)
        .get();
      if (!jobsSnap.empty) {
        const batch = adminDb.batch();
        jobsSnap.docs.forEach((doc) => batch.update(doc.ref, contactPatch));
        await batch.commit();
        jobsSnap.docs.forEach((doc) => revalidatePath(`/jobs/${doc.id}`));
        revalidatePath("/jobs");
      }
    }

    revalidateCustomer(customerId);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update customer.";
    return { success: false, error: msg };
  }
}

export async function addCustomerAddressAction(
  customerId: string,
  input: { label?: string; line1: string; isPrimary?: boolean }
): Promise<ActionResult<{ addressId: string }>> {
  try {
    const parsed = customerAddressInputSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid address." };
    }

    const session = await getSession();
    if (!session?.business) return { success: false, error: "Not authenticated." };
    const denied = denyUnlessOwner(session.role);
    if (denied) return denied;

    const existing = await getOwnedCustomer(customerId, session.business.id);
    if (!existing) return { success: false, error: "Customer not found." };

    const makePrimary = parsed.data.isPrimary || existing.serviceAddresses.length === 0;
    let serviceAddresses = existing.serviceAddresses.map((a) =>
      makePrimary ? { ...a, isPrimary: false } : a
    );

    const address: CustomerServiceAddress = {
      id: newAddressId(),
      label: parsed.data.label ?? "",
      line1: parsed.data.line1,
      isPrimary: makePrimary,
    };
    serviceAddresses = [...serviceAddresses, address];

    const primary = serviceAddresses.find((a) => a.isPrimary) ?? address;
    await adminDb.collection("customers").doc(customerId).update({
      serviceAddresses,
      address: primary.line1,
    });
    revalidateCustomer(customerId);
    return { success: true, data: { addressId: address.id } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to add address.";
    return { success: false, error: msg };
  }
}

export async function updateCustomerAddressAction(
  customerId: string,
  addressId: string,
  input: { label?: string; line1: string; isPrimary?: boolean }
): Promise<ActionResult> {
  try {
    const parsed = customerAddressInputSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid address." };
    }

    const session = await getSession();
    if (!session?.business) return { success: false, error: "Not authenticated." };
    const denied = denyUnlessOwner(session.role);
    if (denied) return denied;

    const existing = await getOwnedCustomer(customerId, session.business.id);
    if (!existing) return { success: false, error: "Customer not found." };

    const idx = existing.serviceAddresses.findIndex((a) => a.id === addressId);
    if (idx < 0) return { success: false, error: "Address not found." };

    let serviceAddresses = [...existing.serviceAddresses];
    const makePrimary = Boolean(parsed.data.isPrimary);
    if (makePrimary) {
      serviceAddresses = serviceAddresses.map((a) => ({ ...a, isPrimary: false }));
    }

    serviceAddresses[idx] = {
      ...serviceAddresses[idx],
      label: parsed.data.label ?? "",
      line1: parsed.data.line1,
      isPrimary: makePrimary || serviceAddresses[idx].isPrimary,
    };

    if (!serviceAddresses.some((a) => a.isPrimary) && serviceAddresses.length > 0) {
      serviceAddresses[0] = { ...serviceAddresses[0], isPrimary: true };
    }

    const primary = serviceAddresses.find((a) => a.isPrimary) ?? serviceAddresses[0];
    await adminDb.collection("customers").doc(customerId).update({
      serviceAddresses,
      address: primary?.line1 ?? "",
    });
    revalidateCustomer(customerId);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update address.";
    return { success: false, error: msg };
  }
}

export async function setPrimaryCustomerAddressAction(
  customerId: string,
  addressId: string
): Promise<ActionResult> {
  try {
    const session = await getSession();
    if (!session?.business) return { success: false, error: "Not authenticated." };
    const denied = denyUnlessOwner(session.role);
    if (denied) return denied;

    const existing = await getOwnedCustomer(customerId, session.business.id);
    if (!existing) return { success: false, error: "Customer not found." };

    if (!existing.serviceAddresses.some((a) => a.id === addressId)) {
      return { success: false, error: "Address not found." };
    }

    const serviceAddresses = existing.serviceAddresses.map((a) => ({
      ...a,
      isPrimary: a.id === addressId,
    }));
    const primary = serviceAddresses.find((a) => a.isPrimary);

    await adminDb.collection("customers").doc(customerId).update({
      serviceAddresses,
      address: primary?.line1 ?? "",
    });
    revalidateCustomer(customerId);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to set primary address.";
    return { success: false, error: msg };
  }
}

export async function removeCustomerAddressAction(
  customerId: string,
  addressId: string
): Promise<ActionResult> {
  try {
    const session = await getSession();
    if (!session?.business) return { success: false, error: "Not authenticated." };
    const denied = denyUnlessOwner(session.role);
    if (denied) return denied;

    const existing = await getOwnedCustomer(customerId, session.business.id);
    if (!existing) return { success: false, error: "Customer not found." };

    const remaining = existing.serviceAddresses.filter((a) => a.id !== addressId);
    if (remaining.length === existing.serviceAddresses.length) {
      return { success: false, error: "Address not found." };
    }

    if (remaining.length > 0 && !remaining.some((a) => a.isPrimary)) {
      remaining[0] = { ...remaining[0], isPrimary: true };
    }

    const primary = remaining.find((a) => a.isPrimary);
    await adminDb.collection("customers").doc(customerId).update({
      serviceAddresses: remaining,
      address: primary?.line1 ?? "",
    });
    revalidateCustomer(customerId);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to remove address.";
    return { success: false, error: msg };
  }
}

export async function deleteCustomerAction(customerId: string): Promise<ActionResult> {
  try {
    const session = await getSession();
    if (!session?.business) return { success: false, error: "Not authenticated." };
    const denied = denyUnlessOwner(session.role);
    if (denied) return denied;

    const existing = await getOwnedCustomer(customerId, session.business.id);
    if (!existing) return { success: false, error: "Customer not found." };

    await adminDb.collection("customers").doc(customerId).delete();
    revalidatePath("/customers");
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to delete customer.";
    return { success: false, error: msg };
  }
}

export async function addCustomerInteractionAction(
  customerId: string,
  input: { type: "note" | "call" | "sms_logged"; body: string; to?: string; jobId?: string | null }
): Promise<ActionResult<{ interactionId: string }>> {
  try {
    const parsed = addCustomerInteractionSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid interaction." };
    }

    const session = await getSession();
    if (!session?.business) return { success: false, error: "Not authenticated." };
    const denied = denyUnlessOwner(session.role);
    if (denied) return denied;

    const existing = await getOwnedCustomer(customerId, session.business.id);
    if (!existing) return { success: false, error: "Customer not found." };

    const actor = actorFromSession(session);
    const type = parsed.data.type;
    const titles = {
      note: "Note added",
      call: "Phone call logged",
      sms_logged: "Text message logged",
    } as const;
    const channels = {
      note: "system",
      call: "phone",
      sms_logged: "sms",
    } as const;

    const interactionId = await logCustomerInteraction({
      businessId: session.business.id,
      customerId,
      jobId: parsed.data.jobId ?? null,
      type,
      channel: channels[type],
      title: titles[type],
      body: parsed.data.body,
      to: parsed.data.to || (type === "sms_logged" ? existing.phone : type === "call" ? existing.phone : ""),
      ...actor,
    });

    if (!interactionId) {
      return { success: false, error: "Failed to save interaction." };
    }

    revalidateCustomer(customerId);
    return { success: true, data: { interactionId } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to save interaction.";
    return { success: false, error: msg };
  }
}
