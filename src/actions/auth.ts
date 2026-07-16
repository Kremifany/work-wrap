"use server";

import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { serverEnv } from "@/lib/env.server";
import { validateAccessCode, redeemAccessCode } from "@/actions/access-codes";
import { registerBusinessSchema } from "@/lib/schemas";
import type { ActionResult, Business } from "@/types";
import { revalidatePath } from "next/cache";

// Called client-side after Firebase auth — exchanges ID token for session cookie
export async function createSessionAction(idToken: string): Promise<ActionResult> {
  try {
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
    const cookieStore = await cookies();
    cookieStore.set("__session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: expiresIn / 1000,
      path: "/",
    });
    return { success: true };
  } catch {
    return { success: false, error: "Failed to create session. Please try again." };
  }
}

export async function signOutAction(): Promise<ActionResult> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("__session");
    return { success: true };
  } catch {
    return { success: false, error: "Sign out failed." };
  }
}

// Called after initial registration to create the owner's business record
export async function registerBusinessAction(
  uid: string,
  ownerName: string,
  businessName: string,
  email: string,
  accessCode?: string
): Promise<ActionResult<{ businessId: string }>> {
  try {
    const parsed = registerBusinessSchema.safeParse({
      uid,
      ownerName,
      businessName,
      email,
      accessCode,
    });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid registration data." };
    }

    if (serverEnv.BETA_ACCESS_REQUIRED) {
      const codeError = await validateAccessCode(accessCode ?? "");
      if (codeError) return { success: false, error: codeError };
    }

    const existingSnap = await adminDb
      .collection("businesses")
      .where("ownerId", "==", uid)
      .limit(1)
      .get();
    if (!existingSnap.empty) {
      return { success: true, data: { businessId: existingSnap.docs[0].id } };
    }

    const now = new Date().toISOString();
    const business: Omit<Business, "id"> = {
      ownerId: uid,
      name: businessName,
      ownerName,
      email,
      logoUrl: "",
      phone: "",
      address: "",
      brandColor: "#1E5AA8",
      googleReviewUrl: "",
      plan: "free",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      jobsThisMonth: 0,
      accessCodeUsed: accessCode?.trim().toUpperCase() ?? null,
      createdAt: now,
    };
    const ref = await adminDb.collection("businesses").add(business);

    await adminDb.collection("techs").add({
      businessId: ref.id,
      uid,
      name: ownerName,
      email,
      phone: "",
      role: "owner",
    });

    if (serverEnv.BETA_ACCESS_REQUIRED && accessCode?.trim()) {
      await redeemAccessCode(accessCode);
    }

    revalidatePath("/dashboard");
    return { success: true, data: { businessId: ref.id } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Registration failed.";
    return { success: false, error: msg };
  }
}

