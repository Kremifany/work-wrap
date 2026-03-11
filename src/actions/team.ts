"use server";

import { revalidatePath } from "next/cache";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth-session";
import { addTechSchema, updateTechSchema } from "@/lib/schemas";
import type { ActionResult, Tech } from "@/types";

export interface AddTechInput {
  name: string;
  email: string;
  phone: string;
}

export async function addTechAction(
  input: AddTechInput
): Promise<ActionResult<{ techId: string }>> {
  try {
    const parsed = addTechSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

    const session = await getSession();
    if (!session?.business || session.role !== "owner") {
      return { success: false, error: "Only business owners can manage the team." };
    }

    // Check plan limits
    const existingSnap = await adminDb
      .collection("techs")
      .where("businessId", "==", session.business.id)
      .get();
    const plan    = session.business.plan;
    const limits  = { free: 1, pro: 3, team: Infinity };
    const limit   = limits[plan] ?? 1;
    if (existingSnap.size >= limit) {
      return {
        success: false,
        error: `Your ${plan} plan allows up to ${limit} team member${limit === 1 ? "" : "s"}. Please upgrade.`,
      };
    }

    // Check if a Firebase Auth user exists with this email and link them
    let uid: string | null = null;
    try {
      const fbUser = await adminAuth.getUserByEmail(input.email);
      uid = fbUser.uid;
    } catch {
      // No Firebase user yet — that's fine, they can be invited later
    }

    const tech: Omit<Tech, "id"> = {
      businessId: session.business.id,
      uid,
      name:       input.name,
      email:      input.email,
      phone:      input.phone,
      role:       "tech",
    };
    const ref = await adminDb.collection("techs").add(tech);
    revalidatePath("/team");
    return { success: true, data: { techId: ref.id } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to add team member.";
    return { success: false, error: msg };
  }
}

export async function updateTechAction(
  techId: string,
  input: Partial<AddTechInput>
): Promise<ActionResult> {
  try {
    const parsed = updateTechSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

    const session = await getSession();
    if (!session?.business || session.role !== "owner") {
      return { success: false, error: "Access denied." };
    }

    const snap = await adminDb.collection("techs").doc(techId).get();
    if (!snap.exists) return { success: false, error: "Team member not found." };

    const data = snap.data() as Tech;
    if (data.businessId !== session.business.id) return { success: false, error: "Access denied." };

    await adminDb.collection("techs").doc(techId).update(parsed.data);
    revalidatePath("/team");
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update team member.";
    return { success: false, error: msg };
  }
}

export async function removeTechAction(techId: string): Promise<ActionResult> {
  try {
    const session = await getSession();
    if (!session?.business || session.role !== "owner") {
      return { success: false, error: "Access denied." };
    }

    const snap = await adminDb.collection("techs").doc(techId).get();
    if (!snap.exists) return { success: false, error: "Team member not found." };

    const data = snap.data() as Tech;
    if (data.businessId !== session.business.id) return { success: false, error: "Access denied." };
    if (data.role === "owner") return { success: false, error: "Cannot remove the owner." };

    await adminDb.collection("techs").doc(techId).delete();
    revalidatePath("/team");
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to remove team member.";
    return { success: false, error: msg };
  }
}
