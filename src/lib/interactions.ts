import "server-only";

import { adminDb } from "@/lib/firebase-admin";
import { getJobTitle } from "@/lib/job-utils";
import type {
  Interaction,
  InteractionChannel,
  InteractionType,
  Job,
  SessionContext,
} from "@/types";

export type LogInteractionInput = {
  businessId: string;
  customerId: string;
  jobId?: string | null;
  type: InteractionType;
  channel: InteractionChannel;
  title: string;
  body?: string;
  to?: string;
  createdByUid: string;
  createdByName: string;
  createdAt?: string;
};

export async function logCustomerInteraction(
  input: LogInteractionInput
): Promise<string | null> {
  if (!input.customerId?.trim()) return null;

  const createdAt = input.createdAt ?? new Date().toISOString();
  const payload: Omit<Interaction, "id"> = {
    businessId: input.businessId,
    customerId: input.customerId,
    jobId: input.jobId ?? null,
    type: input.type,
    channel: input.channel,
    title: input.title,
    body: (input.body ?? "").trim(),
    to: (input.to ?? "").trim(),
    createdByUid: input.createdByUid,
    createdByName: input.createdByName.trim() || "Team",
    createdAt,
  };

  const ref = await adminDb.collection("interactions").add(payload);
  return ref.id;
}

export function actorFromSession(session: SessionContext): {
  createdByUid: string;
  createdByName: string;
} {
  const name =
    session.role === "owner"
      ? (session.business?.ownerName ?? session.user.email)
      : (session.tech?.name ?? session.user.email);
  return {
    createdByUid: session.user.uid,
    createdByName: name || "Team",
  };
}

export async function logJobCreatedInteraction(
  session: SessionContext,
  job: Pick<Job, "id" | "customerId" | "title" | "jobType" | "jobAddress">,
  businessId: string
): Promise<void> {
  if (!job.customerId) return;
  const actor = actorFromSession(session);
  await logCustomerInteraction({
    businessId,
    customerId: job.customerId,
    jobId: job.id,
    type: "job_created",
    channel: "system",
    title: "Job created",
    body: `${getJobTitle(job)}${job.jobAddress ? ` — ${job.jobAddress}` : ""}`,
    ...actor,
  });
}

export async function logReportEmailedInteraction(
  session: SessionContext,
  job: Pick<Job, "id" | "customerId" | "title" | "jobType" | "customerEmail">,
  businessId: string,
  emailedTo: string
): Promise<void> {
  if (!job.customerId) return;
  const actor = actorFromSession(session);
  await logCustomerInteraction({
    businessId,
    customerId: job.customerId,
    jobId: job.id,
    type: "email_report_sent",
    channel: "email",
    title: "Job completion report emailed",
    body: `Report for ${getJobTitle(job)} sent to ${emailedTo}`,
    to: emailedTo,
    ...actor,
  });
}

export async function logJobCompletedInteraction(
  session: SessionContext,
  job: Pick<Job, "id" | "customerId" | "title" | "jobType">,
  businessId: string
): Promise<void> {
  if (!job.customerId) return;
  const actor = actorFromSession(session);
  await logCustomerInteraction({
    businessId,
    customerId: job.customerId,
    jobId: job.id,
    type: "job_completed",
    channel: "system",
    title: "Job completed",
    body: getJobTitle(job),
    ...actor,
  });
}

/** Merge stored interactions with job-derived history for older records. */
export function mergeCustomerTimeline(
  stored: Interaction[],
  jobs: Job[]
): Interaction[] {
  const keys = new Set(
    stored
      .filter((i) => i.jobId)
      .map((i) => `${i.type}:${i.jobId}`)
  );

  const virtual: Interaction[] = [];
  for (const job of jobs) {
    if (!job.customerId) continue;

    const createdKey = `job_created:${job.id}`;
    if (!keys.has(createdKey)) {
      virtual.push({
        id: `virtual:${createdKey}`,
        businessId: job.businessId,
        customerId: job.customerId,
        jobId: job.id,
        type: "job_created",
        channel: "system",
        title: "Job created",
        body: `${getJobTitle(job)}${job.jobAddress ? ` — ${job.jobAddress}` : ""}`,
        to: "",
        createdByUid: "",
        createdByName: job.techName || "Team",
        createdAt: job.createdAt,
      });
    }

    if (job.completedAt && job.status === "completed") {
      const completedKey = `job_completed:${job.id}`;
      if (!keys.has(completedKey)) {
        virtual.push({
          id: `virtual:${completedKey}`,
          businessId: job.businessId,
          customerId: job.customerId,
          jobId: job.id,
          type: "job_completed",
          channel: "system",
          title: "Job completed",
          body: getJobTitle(job),
          to: "",
          createdByUid: "",
          createdByName: job.techName || "Team",
          createdAt: job.completedAt,
        });
      }
    }

    if (job.reportSentAt) {
      const emailKey = `email_report_sent:${job.id}`;
      if (!keys.has(emailKey)) {
        virtual.push({
          id: `virtual:${emailKey}`,
          businessId: job.businessId,
          customerId: job.customerId,
          jobId: job.id,
          type: "email_report_sent",
          channel: "email",
          title: "Job completion report emailed",
          body: job.customerEmail
            ? `Report for ${getJobTitle(job)} sent to ${job.customerEmail}`
            : `Report for ${getJobTitle(job)} emailed`,
          to: job.customerEmail || "",
          createdByUid: "",
          createdByName: job.techName || "Team",
          createdAt: job.reportSentAt,
        });
      }
    }
  }

  return [...stored, ...virtual].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}
