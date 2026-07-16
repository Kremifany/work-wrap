"use server";

import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth-session";
import { betaAccessCodeSchema } from "@/lib/schemas";
import type { ActionResult, BetaAccessCode } from "@/types";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function validateAccessCode(code: string): Promise<string | null> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return "Beta access code is required.";

  const snap = await adminDb
    .collection("beta_access_codes")
    .where("code", "==", normalized)
    .limit(1)
    .get();

  if (snap.empty) return "Invalid beta access code.";

  const doc = snap.docs[0];
  const data = doc.data() as Omit<BetaAccessCode, "id">;

  if (!data.active) return "This access code is no longer active.";
  if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
    return "This access code has expired.";
  }
  if (data.useCount >= data.maxUses) return "This access code has reached its use limit.";

  return null;
}

export async function redeemAccessCode(code: string): Promise<void> {
  const normalized = code.trim().toUpperCase();
  const snap = await adminDb
    .collection("beta_access_codes")
    .where("code", "==", normalized)
    .limit(1)
    .get();

  if (snap.empty) return;

  await snap.docs[0].ref.update({
    useCount: FieldValue.increment(1),
  });
}

export async function createAccessCodeAction(input: {
  label: string;
  maxUses?: number;
  expiresAt?: string | null;
}): Promise<ActionResult<{ code: string }>> {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return { success: false, error: "Admin access required." };
    }

    const parsed = betaAccessCodeSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    const code = generateCode();
    const now = new Date().toISOString();

    await adminDb.collection("beta_access_codes").add({
      code,
      label: parsed.data.label,
      maxUses: parsed.data.maxUses,
      useCount: 0,
      active: true,
      createdAt: now,
      expiresAt: parsed.data.expiresAt ?? null,
    });

    revalidatePath("/admin/access-codes");
    return { success: true, data: { code } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create access code.";
    return { success: false, error: msg };
  }
}

export async function toggleAccessCodeAction(
  codeId: string,
  active: boolean
): Promise<ActionResult> {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return { success: false, error: "Admin access required." };
    }

    await adminDb.collection("beta_access_codes").doc(codeId).update({ active });
    revalidatePath("/admin/access-codes");
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update access code.";
    return { success: false, error: msg };
  }
}

export async function listAccessCodesAction(): Promise<BetaAccessCode[]> {
  const session = await getSession();
  if (!session || session.role !== "admin") return [];

  const snap = await adminDb
    .collection("beta_access_codes")
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();

  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as BetaAccessCode));
}
