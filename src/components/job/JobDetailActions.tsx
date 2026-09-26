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
import { JobTechMultiSelect } from "@/components/job/JobTechMultiSelect";
import { Alert, Spinner, Modal } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import { normalizeJobPhotos, getJobTitle, resolveJobTechSelectionIds } from "@/lib/job-utils";
import {
  CheckCircle2,
  RefreshCw,
  Trash2,
  FileText,
  Mail,
  Eye,
} from "lucide-react";
import type { Job, JobPhoto, SessionContext, Tech } from "@/types";

interface JobDetailActionsProps {
  job: Job;
  session: SessionContext;
  techs: Tech[];
  canEdit: boolean;
}

export default function JobDetailActions({
  job: initialJob,
  session,
  techs,
  canEdit,
}: JobDetailActionsProps) {
  const router = useRouter();
  const { beforePhotos: initialBefore, afterPhotos: initialAfter } =
    normalizeJobPhotos(initialJob);

  const [notes, setNotes] = useState(initialJob.notes ?? "");
  const [beforePhotos, setBeforePhotos] = useState<JobPhoto[]>(initialBefore);
  const [afterPhotos, setAfterPhotos] = useState<JobPhoto[]>(initialAfter);
  const [selectedTechIds, setSelectedTechIds] = useState<string[]>(() =>
    resolveJobTechSelectionIds(initialJob, techs)
  );
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
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const updatesRef = useRef({ notes, beforePhotos, afterPhotos, selectedTechIds });
  updatesRef.current = { notes, beforePhotos, afterPhotos, selectedTechIds };
  const techsRef = useRef(techs);
  techsRef.current = techs;

  const snapshotUpdates = useCallback(() => {
    const u = updatesRef.current;
    return JSON.stringify({
      notes: u.notes.trim(),
      beforePhotos: u.beforePhotos,
      afterPhotos: u.afterPhotos,
      selectedTechIds: u.selectedTechIds,
    });
  }, []);

  const lastSavedSnapshotRef = useRef<string | null>(null);
  // Seed once so the first mount does not POST an identical draft.
  if (lastSavedSnapshotRef.current === null) {
    lastSavedSnapshotRef.current = snapshotUpdates();
  }

  const [generating, startGenerate] = useTransition();
  const [sending, startSend] = useTransition();
  const [completing, startComplete] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [saving, startSave] = useTransition();

  const isDraft = initialJob.status === "draft";
  const businessId = session.business?.id ?? "";
  const editable = canEdit && isDraft;

  const resolveSelectedTechs = (ids: string[]) => {
    const fromTeam = techsRef.current
      .filter((t) => ids.includes(t.id))
      .map((t) => ({ id: t.id, name: t.name }));
    if (fromTeam.length > 0) return fromTeam;
    // Fall back: match legacy name-only assignments to team members
    const resolvedIds = resolveJobTechSelectionIds(initialJob, techsRef.current);
    return techsRef.current
      .filter((t) => resolvedIds.includes(t.id))
      .map((t) => ({ id: t.id, name: t.name }));
  };

  const getUpdates = () => ({
    notes: notes.trim(),
    beforePhotos,
    afterPhotos,
  });

  const persistTechsIfNeeded = async () => {
    const assigned = resolveSelectedTechs(selectedTechIds);
    if (assigned.length === 0) {
      throw new Error("Select at least one technician who worked this job.");
    }
    const result = await updateJobAction(initialJob.id, { techs: assigned });
    if (!result.success) {
      throw new Error(result.error ?? "Failed to save technicians.");
    }
  };

  const persistUpdates = useCallback(
    async (opts?: { revalidate?: boolean }) => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      if (savingRef.current) return;

      const snap = snapshotUpdates();
      if (snap === lastSavedSnapshotRef.current) {
        setSaveStatus("saved");
        return;
      }

      savingRef.current = true;
      const {
        notes: n,
        beforePhotos: before,
        afterPhotos: after,
        selectedTechIds: techIds,
      } = updatesRef.current;

      const team = techsRef.current;
      const assigned = team
        .filter((t) => techIds.includes(t.id))
        .map((t) => ({ id: t.id, name: t.name }));
      if (assigned.length === 0 && team.length > 0) {
        savingRef.current = false;
        setSaveStatus("error");
        throw new Error("Select at least one technician.");
      }

      setSaveStatus("saving");
      try {
        const result = await updateJobAction(
          initialJob.id,
          {
            notes: n.trim(),
            beforePhotos: before,
            afterPhotos: after,
            ...(assigned.length > 0 ? { techs: assigned } : {}),
          },
          { revalidate: opts?.revalidate ?? false }
        );
        if (!result.success) {
          setSaveStatus("error");
          throw new Error(result.error ?? "Failed to save job.");
        }
        lastSavedSnapshotRef.current = snap;
        setSaveStatus("saved");
      } finally {
        savingRef.current = false;
      }
    },
    [initialJob.id, snapshotUpdates]
  );

  // Debounced autosave — only when the serialized draft actually changes.
  useEffect(() => {
    if (!editable) return;

    const snap = snapshotUpdates();
    if (snap === lastSavedSnapshotRef.current) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setSaveStatus("idle");

    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveTimerRef.current = null;
      void persistUpdates({ revalidate: false }).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to save job.");
      });
    }, 800);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [notes, beforePhotos, afterPhotos, selectedTechIds, editable, persistUpdates, snapshotUpdates]);

  const handleSave = () => {
    setError(null);
    setSuccess(null);
    startSave(async () => {
      try {
        await persistUpdates({ revalidate: true });
        setSuccess("Job saved. Returning…");
        // Brief pause so the success message is visible, then go back
        window.setTimeout(() => {
          if (typeof window !== "undefined" && window.history.length > 1) {
            router.back();
          } else {
            router.push("/jobs");
          }
        }, 700);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save job.");
      }
    });
  };

  const handleGenerate = () => {
    setError(null);
    startGenerate(async () => {
      try {
        await persistTechsIfNeeded();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save technicians.");
        return;
      }
      const result = await generateReportAction(initialJob.id, getUpdates());
      if (!result.success) {
        setError(result.error ?? "Failed to generate report.");
      } else {
        const url = result.data?.pdfUrl ?? null;
        if (url) {
          setPreviewUrl(url);
          if (
            typeof window !== "undefined" &&
            window.matchMedia("(max-width: 767px)").matches
          ) {
            window.open(url, "_blank", "noopener,noreferrer");
          } else {
            setShowPreview(true);
          }
        }
        setSuccess("Job completion report PDF generated.");
        router.refresh();
      }
    });
  };

  const handleSend = () => {
    setError(null);
    startSend(async () => {
      if (isDraft) {
        try {
          await persistUpdates();
          await persistTechsIfNeeded();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to save job.");
          return;
        }
      }
      const result = await sendReportAction(initialJob.id);
      if (!result.success) {
        setError(result.error ?? "Failed to send report.");
      } else {
        const emailedTo =
          (result.data as { emailedTo?: string } | undefined)?.emailedTo ??
          initialJob.customerEmail;
        setSuccess(`Report emailed to ${emailedTo}.`);
        router.refresh();
      }
    });
  };

  const handleViewPdf = () => {
    if (!pdfUrl) return;
    // Mobile browsers often fail to render Storage PDFs inside iframes/modals
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      window.open(pdfUrl, "_blank", "noopener,noreferrer");
      return;
    }
    setShowPreview(true);
  };

  const handleComplete = () => {
    setError(null);
    startComplete(async () => {
      try {
        await persistTechsIfNeeded();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save technicians.");
        return;
      }
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

      {!canEdit && (
        <Alert variant="info">
          View only — you can edit this job if you are the business owner or assigned as a
          technician on it.
        </Alert>
      )}

      {isDraft && (
        <>
          <div className="card card-padded space-y-3">
            <div>
              <h2 className="font-semibold text-neutral-900">Technicians</h2>
              <p className="text-sm text-neutral-500 mt-0.5">
                Who worked this job — shown on the completion report.
              </p>
            </div>
            <JobTechMultiSelect
              techs={techs}
              selectedIds={selectedTechIds}
              onChange={setSelectedTechIds}
              disabled={!editable}
            />
          </div>

          <div className="card card-padded space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-neutral-900">Work Notes</h2>
              {editable && saveStatus === "saving" && (
                <span className="text-xs text-neutral-400">Saving…</span>
              )}
              {editable && saveStatus === "saved" && (
                <span className="text-xs text-success-600">Saved</span>
              )}
              {editable && saveStatus === "error" && (
                <span className="text-xs text-error-600">Save failed</span>
              )}
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="fp-input min-h-25 resize-y"
              placeholder="Summary of work performed — appears on the job completion report cover page."
              maxLength={5000}
              readOnly={!editable}
              disabled={!editable}
            />
          </div>

          <div className="card card-padded space-y-4">
            <h2 className="font-semibold text-neutral-900">Before Photos</h2>
            {editable ? (
              <PhotoUpload
                businessId={businessId}
                photos={beforePhotos}
                onChange={setBeforePhotos}
                storagePrefix="before"
              />
            ) : beforePhotos.length === 0 ? (
              <p className="text-sm text-neutral-400">No before photos.</p>
            ) : (
              <div className="photo-grid">
                {beforePhotos.map((photo, i) => (
                  <a
                    key={i}
                    href={photo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative group rounded-lg overflow-hidden border border-neutral-200 block"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.caption || `Before photo ${i + 1}`}
                      className="w-full h-40 object-cover"
                    />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="card card-padded space-y-4">
            <h2 className="font-semibold text-neutral-900">After Photos</h2>
            {editable ? (
              <PhotoUpload
                businessId={businessId}
                photos={afterPhotos}
                onChange={setAfterPhotos}
                storagePrefix="after"
              />
            ) : afterPhotos.length === 0 ? (
              <p className="text-sm text-neutral-400">No after photos.</p>
            ) : (
              <div className="photo-grid">
                {afterPhotos.map((photo, i) => (
                  <a
                    key={i}
                    href={photo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative group rounded-lg overflow-hidden border border-neutral-200 block"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.caption || `After photo ${i + 1}`}
                      className="w-full h-40 object-cover"
                    />
                  </a>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <div className="flex flex-wrap gap-3">
        {editable && (
          <>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || saveStatus === "saving"}
              className="btn btn-outline flex items-center gap-2"
            >
              {(saving || saveStatus === "saving") && <Spinner size="sm" />}
              {saving || saveStatus === "saving" ? "Saving…" : "Save Job"}
            </button>
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
                onClick={handleViewPdf}
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

        {!isDraft && canEdit && (
          <button
            onClick={handleSend}
            disabled={sending || !initialJob.customerEmail}
            className="btn btn-outline flex items-center gap-2"
          >
            {sending ? <Spinner size="sm" /> : <RefreshCw className="w-4 h-4" />}
            {sending ? "Sending…" : "Resend Report Email"}
          </button>
        )}

        {!editable && isDraft && pdfUrl && (
          <button
            type="button"
            onClick={handleViewPdf}
            className="btn btn-outline flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            View PDF
          </button>
        )}

        {canEdit && (
          <button
            onClick={() => setShowDelete(true)}
            className="btn btn-destructive flex items-center gap-2 ml-auto"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        )}
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
          <h2 className="font-semibold text-neutral-900 mb-3">Job completion report</h2>

          {/* Mobile: phones can't embed most Storage PDFs in an iframe */}
          <div className="md:hidden rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-brand-700" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-neutral-900">
                  {getJobTitle(initialJob)} report
                </p>
                <p className="text-sm text-neutral-500 mt-0.5">
                  View the PDF on your phone.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleViewPdf}
              className="btn btn-primary flex items-center justify-center gap-2 w-full mt-4"
            >
              <Eye className="w-4 h-4" />
              View PDF
            </button>
          </div>

          {/* Desktop preview */}
          <iframe
            src={pdfUrl}
            title={`Job completion report — ${getJobTitle(initialJob)}`}
            className="hidden md:block w-full h-[600px] rounded-lg border border-neutral-200 bg-white"
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
          <>
            <div className="md:hidden space-y-3">
              <p className="text-sm text-neutral-600">
                PDF preview isn&apos;t available in this phone browser. Open the file instead.
              </p>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary flex items-center justify-center gap-2 w-full"
                onClick={() => setShowPreview(false)}
              >
                <Eye className="w-4 h-4" />
                View PDF
              </a>
            </div>
            <iframe
              src={pdfUrl}
              title={`Job completion report — ${getJobTitle(initialJob)}`}
              className="hidden md:block w-full h-[70vh] rounded-lg border border-neutral-200"
            />
          </>
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
