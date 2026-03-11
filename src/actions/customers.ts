"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth-session";
import { customerInputSchema, updateCustomerSchema } from "@/lib/schemas";
import type { ActionResult, Customer } from "@/types";

export interface CustomerInput {
  name: string;
  email: string;
  phone: string;
  address: string;
  notes?: string;
}

export async function createCustomerAction(
  input: CustomerInput
): Promise<ActionResult<{ customerId: string }>> {
  try {
    const parsed = customerInputSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

    const session = await getSession();
    if (!session?.business) return { success: false, error: "Not authenticated." };

    const customer: Omit<Customer, "id"> = {
      businessId: session.business.id,
      name:       input.name,
      email:      input.email,
      phone:      input.phone,
      address:    input.address,
      notes:      input.notes ?? "",
      jobCount:   0,
      createdAt:  new Date().toISOString(),
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
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

    const session = await getSession();
    if (!session?.business) return { success: false, error: "Not authenticated." };

    const snap = await adminDb.collection("customers").doc(customerId).get();
    if (!snap.exists) return { success: false, error: "Customer not found." };

    const data = snap.data() as Customer;
    if (data.businessId !== session.business.id) return { success: false, error: "Access denied." };

    await adminDb.collection("customers").doc(customerId).update(parsed.data);
    revalidatePath("/customers");
    revalidatePath(`/customers/${customerId}`);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update customer.";
    return { success: false, error: msg };
  }
}

export async function deleteCustomerAction(customerId: string): Promise<ActionResult> {
  try {
    const session = await getSession();
    if (!session?.business) return { success: false, error: "Not authenticated." };

    const snap = await adminDb.collection("customers").doc(customerId).get();
    if (!snap.exists) return { success: false, error: "Customer not found." };

    const data = snap.data() as Customer;
    if (data.businessId !== session.business.id) return { success: false, error: "Access denied." };

    await adminDb.collection("customers").doc(customerId).delete();
    revalidatePath("/customers");
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to delete customer.";
    return { success: false, error: msg };
  }
}
