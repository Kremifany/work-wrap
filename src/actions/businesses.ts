"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth-session";
import { upsertBusinessSchema } from "@/lib/schemas";
import type { ActionResult, Business } from "@/types";

export interface UpsertBusinessInput {
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  logoUrl?: string;
}

export async function upsertBusinessProfileAction(
  input: UpsertBusinessInput
): Promise<ActionResult<{ businessId: string }>> {
  try {
    const parsed = upsertBusinessSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

    const session = await getSession();
    if (!session) return { success: false, error: "Not authenticated." };

    const uid = session.user.uid;

    if (session.business) {
      // Update existing
      await adminDb.collection("businesses").doc(session.business.id).update({
        name:       input.name,
        ownerName:  input.ownerName,
        email:      input.email,
        phone:      input.phone,
        address:    input.address,
        ...(input.logoUrl !== undefined && { logoUrl: input.logoUrl }),
      });
      revalidatePath("/profile");
      return { success: true, data: { businessId: session.business.id } };
    }

    // Create new
    const now: Omit<Business, "id"> = {
      ownerId:               uid,
      name:                  input.name,
      ownerName:             input.ownerName,
      email:                 input.email,
      phone:                 input.phone,
      address:               input.address,
      logoUrl:               input.logoUrl ?? "",
      plan:                  "free",
      stripeCustomerId:      null,
      stripeSubscriptionId:  null,
      jobsThisMonth:         0,
      createdAt:             new Date().toISOString(),
    };
    const ref = await adminDb.collection("businesses").add(now);
    revalidatePath("/profile");
    return { success: true, data: { businessId: ref.id } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to save profile.";
    return { success: false, error: msg };
  }
}

