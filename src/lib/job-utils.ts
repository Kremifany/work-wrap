import { slugify } from "@/lib/utils";
import type { Job, JobPhoto } from "@/types";

/** Primary display title — v1 uses `title`; legacy jobs fall back to jobType. */
export function getJobTitle(job: Pick<Job, "title" | "jobType">): string {
  return job.title?.trim() || job.jobType || "Job";
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
  return {
    ...job,
    title: job.title ?? job.jobType ?? "",
    beforePhotos,
    afterPhotos,
    photos: job.photos ?? [...beforePhotos, ...afterPhotos],
    completedAt: job.completedAt ?? null,
  };
}

/** `{job-slug}-inspection-report-{YYYY-MM-DD}.pdf` */
export function getReportFilename(job: Pick<Job, "title" | "jobType" | "completedAt" | "createdAt">): string {
  const slug = slugify(getJobTitle(job)) || "job";
  const dateSource = job.completedAt ?? job.createdAt;
  const date = new Date(dateSource).toISOString().slice(0, 10);
  return `${slug}-inspection-report-${date}.pdf`;
}

export function getCompletedDate(job: Pick<Job, "completedAt" | "createdAt">): string {
  const source = job.completedAt ?? job.createdAt;
  return new Date(source).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
