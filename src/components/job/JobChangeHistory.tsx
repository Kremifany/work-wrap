"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getJobEditsHistoryAction } from "@/actions/job-changes";
import { Modal } from "@/components/ui";
import { flushJobSave, onJobSaved } from "@/lib/job-save-bus";
import { formatDateTime } from "@/lib/utils";
import type { JobChange } from "@/types";

/** Opens the job's change history in its own dialog, loaded fresh each time. */
export function JobChangeHistory({
  jobId,
  changes,
}: {
  jobId: string;
  changes: JobChange[];
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(changes);
  const [loading, setLoading] = useState(false);
  const openRef = useRef(false);

  useEffect(() => {
    setItems(changes);
  }, [changes]);

  const loadLatest = useCallback(async () => {
    const result = await getJobEditsHistoryAction(jobId);
    if (result.success && result.data) setItems(result.data);
  }, [jobId]);

  useEffect(() => {
    return onJobSaved(() => {
      if (openRef.current) void loadLatest();
    });
  }, [loadLatest]);

  async function openHistory() {
    openRef.current = true;
    setOpen(true);
    setLoading(true);
    try {
      await flushJobSave();
      await loadLatest();
    } finally {
      setLoading(false);
    }
  }

  function closeHistory() {
    openRef.current = false;
    setOpen(false);
  }

  return (
    <>
      <button type="button" className="btn btn-outline" onClick={() => void openHistory()}>
        Job edits history
      </button>
      <Modal isOpen={open} onClose={closeHistory} title="Job edits history" size="lg">
        {loading && items.length === 0 ? (
          <p className="text-sm text-neutral-500">Loading job edits…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-neutral-500">No changes recorded yet.</p>
        ) : (
          <ul className="max-h-[60vh] divide-y divide-neutral-100 overflow-y-auto">
            {items.map((change) => (
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
