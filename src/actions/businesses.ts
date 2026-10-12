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
  brandColor?: string;
  googleReviewUrl?: string;
}

export async function upsertBusinessProfileAction(
  input: UpsertBusinessInput
): Promise<ActionResult<{ businessId: string }>> {
  try {
    const parsed = upsertBusinessSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

    const session = await getSession();
    if (!session) return { success: false, error: "Not authenticated." };
    if (session.role !== "owner") {
      return { success: false, error: "Only the business owner can change the company profile." };
    }

    const uid = session.user.uid;

    if (session.business) {
      await adminDb.collection("businesses").doc(session.business.id).update({
        name:       input.name,
        ownerName:  input.ownerName,
        email:      input.email,
        phone:      input.phone,
        address:    input.address,
        ...(input.logoUrl !== undefined && { logoUrl: input.logoUrl }),
        ...(input.brandColor !== undefined && { brandColor: input.brandColor }),
        ...(input.googleReviewUrl !== undefined && { googleReviewUrl: input.googleReviewUrl }),
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
      brandColor:            input.brandColor ?? "#1E5AA8",
      googleReviewUrl:       input.googleReviewUrl ?? "",
      plan:                  "free",
      stripeCustomerId:      null,
      stripeSubscriptionId:  null,
      jobsThisMonth:         0,
      accessCodeUsed:        null,
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

export async function completeDashboardOnboardingAction(): Promise<ActionResult> {
  try {
    const session = await getSession();
    if (!session?.business) return { success: false, error: "Not authenticated." };

    await adminDb.collection("businesses").doc(session.business.id).update({
      dashboardOnboardingSeenAt: new Date().toISOString(),
    });
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to save.";
    return { success: false, error: msg };
  }
}

