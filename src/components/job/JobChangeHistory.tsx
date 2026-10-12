"use client";

import { useState } from "react";
import { Modal } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import type { JobChange } from "@/types";

/** Opens the job's change history in its own dialog. */
export function JobChangeHistory({ changes }: { changes: JobChange[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="btn btn-outline" onClick={() => setOpen(true)}>
        Job edits history
      </button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Job edits history" size="lg">
        {changes.length === 0 ? (
          <p className="text-sm text-neutral-500">No changes recorded yet.</p>
        ) : (
          <ul className="max-h-[60vh] divide-y divide-neutral-100 overflow-y-auto">
            {changes.map((change) => (
              <li key={change.id} className="py-3">
                <p className="text-sm text-neutral-900">{change.summary}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  {change.createdByName} · {formatDateTime(change.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </>
  );
}
