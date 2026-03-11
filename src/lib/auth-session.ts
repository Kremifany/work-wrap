import "server-only";

import { cookies } from "next/headers";
import { adminAuth, adminDb } from "./firebase-admin";
import { serverEnv } from "./env.server";
import type { Business, SessionContext, Tech } from "@/types";

/** Emails that are granted admin access regardless of Firestore records. */
function getAdminEmails(): Set<string> {
  return new Set(
    serverEnv.ADMIN_EMAILS.split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

export async function getSession(): Promise<SessionContext | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;
    if (!sessionCookie) return null;

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const uid = decoded.uid;
    const email = (decoded.email ?? "").toLowerCase();

    // ── Admin shortcut — no Firestore lookup needed ────────────────────────
    if (getAdminEmails().has(email)) {
      return {
        user: { uid, email: decoded.email ?? "" },
        business: null,
        tech: null,
        role: "admin",
      };
    }

    // Check if user is a business owner
    const businessSnap = await adminDb
      .collection("businesses")
      .where("ownerId", "==", uid)
      .limit(1)
      .get();

    if (!businessSnap.empty) {
      const doc = businessSnap.docs[0];
      return {
        user: { uid, email: decoded.email ?? "" },
        business: { id: doc.id, ...doc.data() } as Business,
        tech: null,
        role: "owner",
      };
    }

    // Check if user is a tech employee
    const techSnap = await adminDb
      .collection("techs")
      .where("uid", "==", uid)
      .limit(1)
      .get();

    if (!techSnap.empty) {
      const techDoc = techSnap.docs[0];
      const techData = techDoc.data() as Omit<Tech, "id"> & { businessId: string };
      const businessRef = await adminDb
        .doc(`businesses/${techData.businessId}`)
        .get();

      return {
        user: { uid, email: decoded.email ?? "" },
        business: businessRef.exists
          ? ({ id: businessRef.id, ...businessRef.data() } as Business)
          : null,
        tech: { id: techDoc.id, ...techData } as Tech,
        role: "tech",
      };
    }

    // New user — profile not created yet
    return {
      user: { uid, email: decoded.email ?? "" },
      business: null,
      tech: null,
      role: "owner",
    };
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SessionContext> {
  const session = await getSession();
  if (!session) {
    const { redirect } = await import("next/navigation");
    redirect("/login");
  }
  return session as SessionContext;
}
