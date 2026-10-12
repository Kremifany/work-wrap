import type { Metadata } from "next";
import { adminDb } from "@/lib/firebase-admin";
import AccessCodesClient from "./AccessCodesClient";
import type { BetaAccessCode } from "@/types";

export const metadata: Metadata = { title: "Admin – Beta Access Codes" };

async function getAccessCodes(): Promise<BetaAccessCode[]> {
  const snap = await adminDb
    .collection("beta_access_codes")
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();

  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as BetaAccessCode));
}

export default async function AdminAccessCodesPage() {
  const codes = await getAccessCodes();

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Beta Access Codes</h1>
      <p className="mt-1 text-sm text-slate-500">
        Generate invite codes for contractors joining the v1 beta. Set{" "}
        <code className="text-xs bg-slate-100 px-1 rounded">BETA_ACCESS_REQUIRED=true</code> to
        require a code at registration.
      </p>
      <AccessCodesClient initialCodes={codes} />
    </div>
  );
}
