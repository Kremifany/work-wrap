"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addTechAction, removeTechAction } from "@/actions/team";
import { Alert, Badge, Modal, PhoneInput, Spinner } from "@/components/ui";
import { formatPhoneNumber } from "@/lib/utils";
import { UserCheck, UserPlus, Trash2 } from "lucide-react";
import type { PlanType, Tech } from "@/types";

const PLAN_LIMITS: Record<PlanType, number> = {
  free: 1,
  pro: 3,
  team: Infinity,
};

interface TeamPageClientProps {
  techs: Tech[];
  plan: PlanType;
}

export default function TeamPageClient({ techs, plan }: TeamPageClientProps) {
  const router = useRouter();
  const limit = PLAN_LIMITS[plan];
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [adding, startAdd] = useTransition();
  const [removing, startRemove] = useTransition();

  // Add form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startAdd(async () => {
      const result = await addTechAction({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });
      if (!result.success) {
        setError(result.error ?? "Failed to add team member.");
      } else {
        setSuccess(`${name} added to your team.`);
        setShowAdd(false);
        setName("");
        setEmail("");
        setPhone("");
        router.refresh();
      }
    });
  };

  const handleRemove = (techId: string) => {
    setRemovingId(techId);
  };

  const confirmRemove = () => {
    if (!removingId) return;
    setError(null);
    startRemove(async () => {
      const result = await removeTechAction(removingId);
      if (!result.success) {
        setError(result.error ?? "Failed to remove team member.");
      } else {
        setSuccess("Team member removed.");
        router.refresh();
      }
      setRemovingId(null);
    });
  };

  const removingTech = techs.find((t) => t.id === removingId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Team</h1>
          <p className="text-neutral-500 text-sm mt-0.5">
            {techs.length} member{techs.length !== 1 ? "s" : ""} &middot;{" "}
            {limit === Infinity
              ? "Unlimited"
              : `${techs.length} / ${limit}`}{" "}
            on {plan} plan
          </p>
        </div>
        {(limit === Infinity || techs.length < limit) && (
          <button
            onClick={() => setShowAdd(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add Team Member
          </button>
        )}
        {limit !== Infinity && techs.length >= limit && (
          <a href="/billing" className="btn btn-outline text-sm">
            Upgrade to add more
          </a>
        )}
      </div>

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

      {/* Team list */}
      <div className="card">
        {techs.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <UserCheck className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-500 text-sm">No team members yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {techs.map((tech) => (
              <div
                key={tech.id}
                className="px-6 py-4 flex items-center gap-4 flex-wrap"
              >
                <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-sm shrink-0">
                  {tech.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-neutral-900">{tech.name}</p>
                    <Badge variant={tech.role === "owner" ? "info" : "default"}>
                      {tech.role === "owner" ? "Owner" : "Technician"}
                    </Badge>
                    {tech.uid ? (
                      <Badge variant="success" size="sm">
                        Active login
                      </Badge>
                    ) : (
                      <Badge variant="warning" size="sm">
                        No login yet
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-neutral-500 mt-0.5">
                    {tech.email}
                    {tech.phone ? ` · ${formatPhoneNumber(tech.phone)}` : ""}
                  </p>
                </div>
                {tech.role !== "owner" && (
                  <button
                    onClick={() => handleRemove(tech.id)}
                    className="text-neutral-400 hover:text-error-600 transition-colors p-1.5 rounded"
                    aria-label={`Remove ${tech.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Plan note */}
      {plan === "free" && (
        <div className="card card-padded bg-brand-50 border-brand-200">
          <p className="text-sm text-brand-800">
            <strong>Free plan:</strong> 1 team member (owner only). Upgrade to{" "}
            <a href="/billing" className="underline font-medium">
              Pro
            </a>{" "}
            for up to 3 technicians, or{" "}
            <a href="/billing" className="underline font-medium">
              Team
            </a>{" "}
            for unlimited.
          </p>
        </div>
      )}

      {/* Add member modal */}
      <Modal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Team Member"
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="form-label" htmlFor="t-name">
              Name <span className="text-error-500">*</span>
            </label>
            <input
              id="t-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="fp-input"
              required
              maxLength={100}
            />
          </div>
          <div>
            <label className="form-label" htmlFor="t-email">
              Email <span className="text-error-500">*</span>
            </label>
            <input
              id="t-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="fp-input"
              required
              maxLength={200}
            />
            <p className="text-xs text-neutral-400 mt-1">
              If this person already has a Job Tracker Pro account, they&apos;ll be linked
              automatically.
            </p>
          </div>
          <div>
            <label className="form-label" htmlFor="t-phone">
              Phone
            </label>
            <PhoneInput id="t-phone" value={phone} onChange={setPhone} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="btn btn-outline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={adding}
              className="btn btn-primary flex items-center gap-2"
            >
              {adding && <Spinner size="sm" />}
              {adding ? "Adding…" : "Add Member"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Remove confirm modal */}
      <Modal
        isOpen={!!removingId}
        onClose={() => setRemovingId(null)}
        title="Remove Team Member"
      >
        <div className="space-y-4">
          <p className="text-neutral-600">
            Remove <strong>{removingTech?.name}</strong> from your team?
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setRemovingId(null)}
              className="btn btn-outline"
              disabled={removing}
            >
              Cancel
            </button>
            <button
              onClick={confirmRemove}
              className="btn btn-destructive flex items-center gap-2"
              disabled={removing}
            >
              {removing && <Spinner size="sm" />}
              Remove
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
