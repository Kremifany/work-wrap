import { requireSession } from "@/lib/auth-session";
import { adminDb } from "@/lib/firebase-admin";
import { redirect } from "next/navigation";
import TeamPageClient from "./TeamPageClient";
import type { Tech } from "@/types";

export const metadata = { title: "Team | Job Tracker Pro" };

export default async function TeamPage() {
  const session = await requireSession();
  if (session.role !== "owner") redirect("/dashboard");
  if (!session.business) redirect("/profile");

  const snap = await adminDb
    .collection("techs")
    .where("businessId", "==", session.business.id)
    .get();

  const techs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Tech));

  return (
    <TeamPageClient
      techs={techs}
      plan={session.business.plan}
    />
  );
}
