"use server";

import { getSession } from "@/lib/auth-session";
import { listJobChanges } from "@/lib/job-changes";
import type { ActionResult, JobChange } from "@/types";

/** Latest edit lines for one job. Used when the dialog opens after an in-page save. */
export async function getJobEditsHistoryAction(
  jobId: string
): Promise<ActionResult<JobChange[]>> {
  const session = await getSession();
  if (!session?.business || session.role !== "owner") {
    return { success: false, error: "Only the owner can view job edits." };
  }

  const changes = await listJobChanges(session.business.id, jobId);
  return { success: true, data: changes };
}
