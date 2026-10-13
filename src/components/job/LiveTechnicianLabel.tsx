"use client";

import { useEffect, useState } from "react";
import { subscribeTechnicianLabel } from "@/lib/job-save-bus";

/** Technician names in Job Information, updated when the assignment checkboxes change. */
export function LiveTechnicianLabel({
  jobId,
  initial,
}: {
  jobId: string;
  initial: string;
}) {
  const [label, setLabel] = useState(initial);

  useEffect(() => subscribeTechnicianLabel(jobId, setLabel), [jobId]);
  useEffect(() => setLabel(initial), [initial]);

  const count = label
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name && name !== "—").length;

  return (
    <>
      <dt className="text-neutral-500 font-medium">
        {count > 1 ? "Technicians" : "Technician"}
      </dt>
      <dd className="text-neutral-900">{label || "—"}</dd>
    </>
  );
}
