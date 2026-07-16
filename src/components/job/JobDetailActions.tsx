"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  completeJobAction,
  generateReportAction,
  sendReportAction,
  updateJobAction,
  deleteJobAction,
} from "@/actions/jobs";
import PhotoUpload from "@/components/job/PhotoUpload";
import { Alert, Spinner, Modal } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import { normalizeJobPhotos, getJobTitle } from "@/lib/job-utils";
import {
  CheckCircle2,
  RefreshCw,
  Trash2,
  Download,
  FileText,
  Mail,
  Eye,
} from "lucide-react";
import type { Job, JobPhoto, SessionContext } from "@/types";

interface JobDetailActionsProps {
  job: Job;
  session: SessionContext;
}

export default function JobDetailActions({ job: initialJob, session }: JobDetailActionsProps) {
  const router = useRouter();
  const { beforePhotos: initialBefore, afterPhotos: initialAfter } =
    normalizeJobPhotos(initialJob);

  const [notes, setNotes] = useState(initialJob.notes ?? "");
  const [beforePhotos, setBeforePhotos] = useState<JobPhoto[]>(initialBefore);
  const [afterPhotos, setAfterPhotos] = useState<JobPhoto[]>(initialAfter);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialJob.pdfUrl);

  useEffect(() => {
    if (initialJob.pdfUrl) setPreviewUrl(initialJob.pdfUrl);
  }, [initialJob.pdfUrl]);

  const pdfUrl = previewUrl ?? initialJob.pdfUrl;

  type SaveStatus = "idle" | "saving" | "saved" | "error";
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const skipAutoSaveRef = useRef(true);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updatesRef = useRef({ notes, beforePhotos, afterPhotos });
  updatesRef.current = { notes, beforePhotos, afterPhotos };

  const [generating, startGenerate] = useTransition();
  const [sending, startSend] = useTransition();
  const [completing, startComplete] = useTransition();
  const [deleting, startDelete] = useTransition();

  const isDraft = initialJob.status === "draft";
  const businessId = session.business?.id ?? "";

  const getUpdates = () => ({
    notes: notes.trim(),
    beforePhotos,
    afterPhotos,
  });

  const persistUpdates = useCallback(async () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    const { notes: n, beforePhotos: before, afterPhotos: after } = updatesRef.current;
    setSaveStatus("saving");
    const result = await updateJobAction(initialJob.id, {
      notes: n.trim(),
      beforePhotos: before,
      afterPhotos: after,
    });
    if (!result.success) {
      setSaveStatus("error");
      throw new Error(result.error ?? "Failed to save job.");
    }
    setSaveStatus("saved");
  }, [initialJob.id]);

  useEffect(() => {
    if (!isDraft) return;

    if (skipAutoSaveRef.current) {
      skipAutoSaveRef.current = false;
      return;
    }

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setSaveStatus("idle");

    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveTimerRef.current = null;
      void persistUpdates().catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to save job.");
      });
    }, 800);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [notes, beforePhotos, afterPhotos, isDraft, persistUpdates]);

  const handleGenerate = () => {
    setError(null);
    startGenerate(async () => {
      const result = await generateReportAction(initialJob.id, getUpdates());
      if (!result.success) {
        setError(result.error ?? "Failed to generate report.");
      } else {
        const url = result.data?.pdfUrl ?? null;
        if (url) {
          setPreviewUrl(url);
          setShowPreview(true);
        }
        setSuccess("Inspection report PDF generated.");
        router.refresh();
      }
    });
  };

  const handleSend = () => {
    setError(null);
    startSend(async () => {
      if (isDraft) {
        await persistUpdates();
      }
      const result = await sendReportAction(initialJob.id);
      if (!result.success) {
        setError(result.error ?? "Failed to send report.");
      } else {
        setSuccess(`Report emailed to ${initialJob.customerEmail}.`);
        router.refresh();
      }
    });
  };

  const handleComplete = () => {
    setError(null);
    startComplete(async () => {
      const result = await completeJobAction(initialJob.id, getUpdates());
      if (!result.success) {
        setError(result.error ?? "Failed to complete job.");
      } else {
        setSuccess("Report generated and emailed to customer.");
        router.refresh();
      }
    });
  };

  const handleDelete = () => {
    startDelete(async () => {
      const result = await deleteJobAction(initialJob.id);
      if (!result.success) {
        setError(result.error ?? "Failed to delete job.");
        setShowDelete(false);
      } else {
        router.push("/jobs");
      }
    });
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {isDraft && (
        <>
          <div className="card card-padded space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-neutral-900">Work Notes</h2>
              {saveStatus === "saving" && (
                <span className="text-xs text-neutral-400">Saving…</span>
              )}
              {saveStatus === "saved" && (
                <span className="text-xs text-success-600">Saved</span>
              )}
              {saveStatus === "error" && (
                <span className="text-xs text-error-600">Save failed</span>
              )}
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="fp-input min-h-25 resize-y"
              placeholder="Summary of work performed — appears on the inspection report cover page."
              maxLength={5000}
            />
          </div>

          <div className="card card-padded space-y-4">
            <h2 className="font-semibold text-neutral-900">Before Photos</h2>
            <PhotoUpload
              businessId={businessId}
              photos={beforePhotos}
              onChange={setBeforePhotos}
              storagePrefix="before"
            />
          </div>

          <div className="card card-padded space-y-4">
            <h2 className="font-semibold text-neutral-900">After Photos</h2>
            <PhotoUpload
              businessId={businessId}
              photos={afterPhotos}
              onChange={setAfterPhotos}
              storagePrefix="after"
            />
          </div>
        </>
      )}

      <div className="flex flex-wrap gap-3">
        {isDraft && (
          <>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="btn btn-outline flex items-center gap-2"
            >
              {generating ? <Spinner size="sm" /> : <FileText className="w-4 h-4" />}
              {generating ? "Generating…" : "Generate PDF"}
            </button>
            {pdfUrl && (
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className="btn btn-outline flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                View PDF
              </button>
            )}
            <button
              onClick={handleSend}
              disabled={sending || !initialJob.customerEmail}
              className="btn btn-primary flex items-center gap-2"
              title={!initialJob.customerEmail ? "Add a customer email to send" : undefined}
            >
              {sending ? <Spinner size="sm" /> : <Mail className="w-4 h-4" />}
              {sending ? "Sending…" : "Send Report to Client"}
            </button>
            <button
              onClick={handleComplete}
              disabled={completing}
              className="btn btn-primary flex items-center gap-2"
            >
              {completing ? <Spinner size="sm" /> : <CheckCircle2 className="w-4 h-4" />}
              {completing ? "Processing…" : "Generate & Send"}
            </button>
          </>
        )}

        {!isDraft && (
          <>
            {pdfUrl && (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </a>
            )}
            {pdfUrl && (
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className="btn btn-outline flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                View PDF
              </button>
            )}
            <button
              onClick={handleSend}
              disabled={sending || !initialJob.customerEmail}
              className="btn btn-outline flex items-center gap-2"
            >
              {sending ? <Spinner size="sm" /> : <RefreshCw className="w-4 h-4" />}
              {sending ? "Sending…" : "Resend Report Email"}
            </button>
          </>
        )}

        <button
          onClick={() => setShowDelete(true)}
          className="btn btn-destructive flex items-center gap-2 ml-auto"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>

      {initialJob.status === "completed" && initialJob.reportSentAt && (
        <p className="text-sm text-success-700 flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4" />
          Report sent to {initialJob.customerEmail || "customer"} on{" "}
          {formatDateTime(initialJob.reportSentAt)}
        </p>
      )}

      {!isDraft && pdfUrl && (
        <div className="card card-padded">
          <h2 className="font-semibold text-neutral-900 mb-3">Report Preview</h2>
          <iframe
            src={pdfUrl}
            title={`Inspection report — ${getJobTitle(initialJob)}`}
            className="w-full h-[600px] rounded-lg border border-neutral-200"
          />
        </div>
      )}

      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Report Preview"
        className="max-w-5xl"
      >
        {pdfUrl ? (
          <iframe
            src={pdfUrl}
            title={`Inspection report — ${getJobTitle(initialJob)}`}
            className="w-full h-[70vh] rounded-lg border border-neutral-200"
          />
        ) : null}
      </Modal>

      <Modal isOpen={showDelete} onClose={() => setShowDelete(false)} title="Delete Job">
        <div className="space-y-4">
          <p className="text-neutral-600">
            Are you sure you want to delete this job? This cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowDelete(false)} className="btn btn-outline" disabled={deleting}>
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="btn btn-destructive flex items-center gap-2"
              disabled={deleting}
            >
              {deleting && <Spinner size="sm" />}
              Delete Job
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
