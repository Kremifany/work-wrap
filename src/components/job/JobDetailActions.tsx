"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeJobAction, resendReportAction, deleteJobAction } from "@/actions/jobs";
import { Alert, Badge, Spinner, Modal } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import {
  CheckCircle2,
  RefreshCw,
  Trash2,
  Download,
  ClipboardCheck,
} from "lucide-react";
import type { Job } from "@/types";

interface JobDetailActionsProps {
  job: Job;
}

export default function JobDetailActions({ job }: JobDetailActionsProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [completing, startComplete] = useTransition();
  const [resending, startResend] = useTransition();
  const [deleting, startDelete] = useTransition();

  const handleComplete = () => {
    setError(null);
    startComplete(async () => {
      const result = await completeJobAction(job.id, {});
      if (!result.success) {
        setError(result.error ?? "Failed to complete job.");
      } else {
        setSuccess("Job completed! Report PDF generated and emailed to customer.");
        router.refresh();
      }
    });
  };

  const handleResend = () => {
    setError(null);
    startResend(async () => {
      const result = await resendReportAction(job.id);
      if (!result.success) {
        setError(result.error ?? "Failed to resend report.");
      } else {
        setSuccess("Report emailed to customer.");
      }
    });
  };

  const handleDelete = () => {
    startDelete(async () => {
      const result = await deleteJobAction(job.id);
      if (!result.success) {
        setError(result.error ?? "Failed to delete job.");
        setShowDelete(false);
      } else {
        router.push("/jobs");
      }
    });
  };

  return (
    <div className="space-y-4">
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

      <div className="flex flex-wrap gap-3">
        {job.status === "draft" && (
          <button
            onClick={handleComplete}
            disabled={completing}
            className="btn btn-primary flex items-center gap-2"
          >
            {completing ? <Spinner size="sm" /> : <ClipboardCheck className="w-4 h-4" />}
            {completing ? "Processing…" : "Complete & Send Report"}
          </button>
        )}

        {job.status === "completed" && (
          <>
            {job.pdfUrl && (
              <a
                href={job.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </a>
            )}
            <button
              onClick={handleResend}
              disabled={resending}
              className="btn btn-outline flex items-center gap-2"
            >
              {resending ? <Spinner size="sm" /> : <RefreshCw className="w-4 h-4" />}
              {resending ? "Sending…" : "Resend Report Email"}
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

      {/* Completion info */}
      {job.status === "completed" && job.reportSentAt && (
        <p className="text-sm text-success-700 flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4" />
          Report sent to {job.customerEmail || "customer"} on{" "}
          {formatDateTime(job.reportSentAt)}
        </p>
      )}

      {/* Delete confirm modal */}
      <Modal
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        title="Delete Job"
      >
        <div className="space-y-4">
          <p className="text-neutral-600">
            Are you sure you want to delete this job? This cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowDelete(false)}
              className="btn btn-outline"
              disabled={deleting}
            >
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
