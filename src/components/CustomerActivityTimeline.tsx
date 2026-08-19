"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addCustomerInteractionAction } from "@/actions/customers";
import { Alert, Badge, Spinner } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import {
  Mail,
  MessageSquare,
  Phone,
  StickyNote,
  Briefcase,
  CheckCircle2,
} from "lucide-react";
import type { Interaction, InteractionType } from "@/types";

interface CustomerActivityTimelineProps {
  customerId: string;
  interactions: Interaction[];
  defaultPhone?: string;
}

const TYPE_META: Record<
  InteractionType,
  { label: string; icon: typeof Mail; variant: "default" | "info" | "success" | "warning" }
> = {
  email_report_sent: { label: "Email", icon: Mail, variant: "info" },
  sms_logged: { label: "Text", icon: MessageSquare, variant: "info" },
  call: { label: "Call", icon: Phone, variant: "default" },
  note: { label: "Note", icon: StickyNote, variant: "default" },
  job_created: { label: "Job", icon: Briefcase, variant: "warning" },
  job_completed: { label: "Completed", icon: CheckCircle2, variant: "success" },
};

type ManualType = "note" | "call" | "sms_logged";

export function CustomerActivityTimeline({
  customerId,
  interactions,
  defaultPhone = "",
}: CustomerActivityTimelineProps) {
  const router = useRouter();
  const [type, setType] = useState<ManualType>("note");
  const [body, setBody] = useState("");
  const [to, setTo] = useState(defaultPhone);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addCustomerInteractionAction(customerId, {
        type,
        body: body.trim(),
        to: type === "note" ? "" : to.trim(),
      });
      if (!result.success) {
        setError(result.error ?? "Failed to save.");
        return;
      }
      setBody("");
      router.refresh();
    });
  };

  return (
    <div className="card">
      <div className="px-6 py-4 border-b border-neutral-200">
        <h2 className="font-semibold text-neutral-900">Activity</h2>
        <p className="text-sm text-neutral-500 mt-0.5">
          Emails, texts, calls, notes, and job history for this customer.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-4 border-b border-neutral-200 space-y-3">
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["note", "Note"],
              ["call", "Call"],
              ["sms_logged", "Text sent"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setType(value);
                if (value !== "note" && !to) setTo(defaultPhone);
              }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                type === value
                  ? "bg-brand-700 text-white border-brand-700"
                  : "bg-white text-neutral-600 border-neutral-300 hover:border-brand-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {type !== "note" && (
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="fp-input"
            placeholder={type === "sms_logged" ? "Phone number texted" : "Phone number called"}
            maxLength={254}
          />
        )}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="fp-input min-h-20 resize-y"
          placeholder={
            type === "note"
              ? "Add a note about this customer…"
              : type === "call"
                ? "What was discussed on the call…"
                : "What you texted (e.g. Google review link)…"
          }
          required
          maxLength={5000}
        />
        <button
          type="submit"
          disabled={pending || !body.trim()}
          className="btn btn-outline flex items-center gap-2"
        >
          {pending && <Spinner size="sm" />}
          {pending ? "Saving…" : "Log activity"}
        </button>
      </form>

      {interactions.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="text-neutral-400 text-sm">
            No activity yet. Job emails and manual notes will show up here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {interactions.map((item) => {
            const meta = TYPE_META[item.type] ?? TYPE_META.note;
            const Icon = meta.icon;
            return (
              <li key={item.id} className="px-6 py-4 flex gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={meta.variant} size="sm">
                      {meta.label}
                    </Badge>
                    <span className="text-sm font-medium text-neutral-900">{item.title}</span>
                  </div>
                  {item.body && (
                    <p className="mt-1 text-sm text-neutral-600 whitespace-pre-wrap">{item.body}</p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-400">
                    <span>{formatDateTime(item.createdAt)}</span>
                    {item.createdByName && <span>by {item.createdByName}</span>}
                    {item.to && <span>→ {item.to}</span>}
                    {item.jobId && (
                      <Link
                        href={`/jobs/${item.jobId}`}
                        className="text-brand-600 hover:underline"
                      >
                        View job
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
