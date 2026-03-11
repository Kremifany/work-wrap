"use server";

import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
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
  email: string
): Promise<ActionResult<{ businessId: string }>> {
  try {
    const now = new Date().toISOString();
    const business: Omit<Business, "id"> = {
      ownerId: uid,
      name: businessName,
      ownerName,
      email,
      logoUrl: "",
      phone: "",
      address: "",
      plan: "free",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      jobsThisMonth: 0,
      createdAt: now,
    };
    const ref = await adminDb.collection("businesses").add(business);

    // Also create a tech record for the owner
    await adminDb.collection("techs").add({
      businessId: ref.id,
      uid,
      name: ownerName,
      email,
      phone: "",
      role: "owner",
    });

    revalidatePath("/dashboard");
    return { success: true, data: { businessId: ref.id } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Registration failed.";
    return { success: false, error: msg };
  }
}

