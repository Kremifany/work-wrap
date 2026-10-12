import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-session";
import { adminDb } from "@/lib/firebase-admin";
import { getJobTitle, jobIncludesTech, normalizeJob } from "@/lib/job-utils";
import TeamMemberClient from "./TeamMemberClient";
import type { Job, Tech } from "@/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const snap = await adminDb.collection("techs").doc(id).get();
  const name = snap.data()?.name ?? "Team member";
  return { title: name };
}

export default async function TeamMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, session] = await Promise.all([params, requireSession()]);
  if (session.role !== "owner") redirect("/dashboard");
  if (!session.business) redirect("/profile");

  const [techSnap, jobsSnap] = await Promise.all([
    adminDb.collection("techs").doc(id).get(),
    adminDb
      .collection("jobs")
      .where("businessId", "==", session.business.id)
      .limit(200)
      .get(),
  ]);

  if (!techSnap.exists) notFound();
  const tech = { id: techSnap.id, ...techSnap.data() } as Tech;
  if (tech.businessId !== session.business.id) notFound();

  const jobs = jobsSnap.docs
    .map((d) => normalizeJob({ id: d.id, ...d.data() } as Job))
    .filter((job) => jobIncludesTech(job, tech.id))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 20)
    .map((job) => ({
      id: job.id,
      title: getJobTitle(job),
      customerName: job.customerName,
      status: job.status,
      createdAt: job.createdAt,
    }));

  return <TeamMemberClient tech={tech} jobs={jobs} />;
}
