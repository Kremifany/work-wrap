"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateTechAction } from "@/actions/team";
import { Alert, Badge, PhoneInput, Spinner } from "@/components/ui";
import { formatDate, formatPhoneNumber, phoneTelHref } from "@/lib/utils";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import type { Tech } from "@/types";

export interface TeamMemberJob {
  id: string;
  title: string;
  customerName: string;
  status: "draft" | "completed";
  createdAt: string;
}

export default function TeamMemberClient({
  tech,
  jobs,
}: {
  tech: Tech;
  jobs: TeamMemberJob[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(tech.name);
  const [email, setEmail] = useState(tech.email);
  const [phone, setPhone] = useState(tech.phone ?? "");
  const [saving, startSave] = useTransition();

  const initials = tech.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startSave(async () => {
      const result = await updateTechAction(tech.id, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });
      if (!result.success) {
        setError(result.error ?? "Failed to save team member.");
        return;
      }
      setEditing(false);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        href="/team"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-brand-600 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Team
      </Link>

      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="card card-padded">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-brand-900 truncate">{tech.name}</h1>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <Badge variant={tech.role === "owner" ? "info" : "default"}>
                  {tech.role === "owner" ? "Owner" : "Technician"}
                </Badge>
                {tech.uid ? (
                  <Badge variant="success" size="sm">Active login</Badge>
                ) : (
                  <Badge variant="warning" size="sm">No login yet</Badge>
                )}
              </div>
            </div>
          </div>
          {!editing && (
            <button type="button" onClick={() => setEditing(true)} className="btn btn-outline">
              Edit
            </button>
          )}
        </div>

        {editing ? (
          <form onSubmit={handleSave} className="space-y-4 mt-6">
            <div>
              <label className="form-label" htmlFor="member-name">
                Name <span className="text-error-500">*</span>
              </label>
              <input
                id="member-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="fp-input"
                required
                maxLength={100}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="member-email">
                Email <span className="text-error-500">*</span>
              </label>
              <input
                id="member-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="fp-input"
                required
                maxLength={200}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="member-phone">
                Phone
              </label>
              <PhoneInput id="member-phone" value={phone} onChange={setPhone} />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                className="btn btn-outline"
                disabled={saving}
                onClick={() => {
                  setName(tech.name);
                  setEmail(tech.email);
                  setPhone(tech.phone ?? "");
                  setEditing(false);
                  setError(null);
                }}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary flex items-center gap-2" disabled={saving}>
                {saving && <Spinner size="sm" />}
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        ) : (
          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-neutral-400 shrink-0" />
              <dt className="sr-only">Email</dt>
              <dd>
                {tech.email ? (
                  <a href={`mailto:${tech.email}`} className="text-brand-600 hover:underline">
                    {tech.email}
                  </a>
                ) : (
                  <span className="text-neutral-400">No email</span>
                )}
              </dd>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-neutral-400 shrink-0" />
              <dt className="sr-only">Phone</dt>
              <dd>
                {tech.phone ? (
                  <a href={`tel:${phoneTelHref(tech.phone)}`} className="text-neutral-700 hover:text-brand-600">
                    {formatPhoneNumber(tech.phone)}
                  </a>
                ) : (
                  <span className="text-neutral-400">No phone</span>
                )}
              </dd>
            </div>
          </dl>
        )}
      </div>

      <div className="card">
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="font-semibold text-neutral-900">Jobs</h2>
          <Link
            href={`/jobs?techId=${encodeURIComponent(tech.id)}`}
            className="text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            Open in Jobs
          </Link>
        </div>
        {jobs.length === 0 ? (
          <p className="px-6 py-8 text-sm text-neutral-500">No jobs assigned yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {jobs.map((job) => (
              <li key={job.id}>
                <Link
                  href={`/jobs/${job.id}`}
                  className="flex items-center gap-3 px-6 py-3.5 hover:bg-neutral-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-neutral-900 truncate">
                      {job.customerName || "Unknown customer"}
                    </p>
                    <p className="text-sm text-neutral-500 truncate mt-0.5">{job.title}</p>
                  </div>
                  <span className="text-sm text-neutral-500 shrink-0">{formatDate(job.createdAt)}</span>
                  <Badge variant={job.status === "completed" ? "success" : "warning"} size="sm">
                    {job.status === "completed" ? "Done" : "Draft"}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
