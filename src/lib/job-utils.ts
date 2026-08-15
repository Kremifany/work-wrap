import { slugify } from "@/lib/utils";
import type { Job, JobAssignedTech, JobPhoto } from "@/types";

/** Primary display title — v1 uses `title`; legacy jobs fall back to jobType. */
export function getJobTitle(job: Pick<Job, "title" | "jobType">): string {
  return job.title?.trim() || job.jobType || "Job";
}

/** Normalize assigned techs; fall back to legacy techId/techName. */
export function normalizeJobTechs(
  job: Pick<Job, "techId" | "techName" | "techs">
): JobAssignedTech[] {
  const fromArray = (job.techs ?? [])
    .filter((t) => t && typeof t.name === "string" && t.name.trim())
    .map((t) => ({
      id: (t.id ?? "").trim() || t.name.trim(),
      name: t.name.trim(),
    }));

  if (fromArray.length > 0) return fromArray;

  const legacyName = job.techName?.trim();
  if (legacyName) {
    return [{ id: job.techId?.trim() || legacyName, name: legacyName }];
  }
  return [];
}

/** Display string for reports / lists — "Jane, John". */
export function getJobTechniciansLabel(
  job: Pick<Job, "techId" | "techName" | "techs">
): string {
  const names = normalizeJobTechs(job).map((t) => t.name);
  return names.length > 0 ? names.join(", ") : "—";
}

/** True if this tech is assigned to the job (multi-tech list or legacy techId). */
export function jobIncludesTech(
  job: Pick<Job, "techId" | "techName" | "techs">,
  techId: string
): boolean {
  const id = techId.trim();
  if (!id) return false;
  if (job.techId?.trim() === id) return true;
  return normalizeJobTechs(job).some((t) => t.id === id);
}

/**
 * Owner of the business, or a technician assigned to this job, may edit it.
 * Other techs on the same business may view but not edit.
 */
export function canEditJob(
  session: { role: string; user: { uid: string }; tech: { id: string } | null },
  job: Pick<Job, "techId" | "techName" | "techs">
): boolean {
  if (session.role === "owner") return true;

  const techId = session.tech?.id?.trim();
  if (techId && jobIncludesTech(job, techId)) return true;
  if (jobIncludesTech(job, session.user.uid)) return true;

  return false;
}

/** Normalize legacy single `photos` array into before/after buckets. */
export function normalizeJobPhotos(
  job: Pick<Job, "photos" | "beforePhotos" | "afterPhotos">
): { beforePhotos: JobPhoto[]; afterPhotos: JobPhoto[] } {
  const before = job.beforePhotos ?? [];
  const after = job.afterPhotos ?? [];
  const legacy = job.photos ?? [];

  if (legacy.length > 0 && before.length === 0 && after.length === 0) {
    return { beforePhotos: legacy, afterPhotos: [] };
  }

  return { beforePhotos: before, afterPhotos: after };
}

export function normalizeJob<T extends Job>(job: T): T {
  const { beforePhotos, afterPhotos } = normalizeJobPhotos(job);
  const techs = normalizeJobTechs(job);
  const primary = techs[0];
  return {
    ...job,
    title: job.title ?? job.jobType ?? "",
    techs,
    techId: primary?.id || job.techId || "",
    techName: primary?.name || job.techName || "",
    beforePhotos,
    afterPhotos,
    photos: job.photos ?? [...beforePhotos, ...afterPhotos],
    completedAt: job.completedAt ?? null,
  };
}

/** `{job-slug}-{customer-slug}-jobtracker.pdf` — readable download / email attachment name. */
export function getReportFilename(
  job: Pick<Job, "title" | "jobType" | "customerName" | "completedAt" | "createdAt">
): string {
  const jobSlug = slugify(getJobTitle(job)) || "job";
  const customerSlug = slugify(job.customerName?.trim() || "") || "customer";
  return `${jobSlug}-${customerSlug}-jobtracker.pdf`;
}

export function getCompletedDate(job: Pick<Job, "completedAt" | "createdAt">): string {
  const source = job.completedAt ?? job.createdAt;
  return new Date(source).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
