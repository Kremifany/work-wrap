"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateJobAction } from "@/actions/jobs";
import { JobTechMultiSelect } from "@/components/job/JobTechMultiSelect";
import { Alert, Spinner } from "@/components/ui";
import {
  getPrimaryAddress,
  getPrimaryAddressLine,
  normalizeCustomer,
} from "@/lib/customer-utils";
import { getJobTitle, resolveJobTechSelectionIds } from "@/lib/job-utils";
import type { Customer, Job, Tech } from "@/types";

const CUSTOM_ADDRESS_VALUE = "__custom__";

interface JobEditFormProps {
  job: Job;
  customers: Customer[];
  techs: Tech[];
}

export default function JobEditForm({ job, customers, techs }: JobEditFormProps) {
  const router = useRouter();
  const normalizedCustomers = customers.map((c) => normalizeCustomer(c));

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [title, setTitle] = useState(getJobTitle(job));
  const [selectedCustomerId, setSelectedCustomerId] = useState(job.customerId ?? "");
  const [jobAddress, setJobAddress] = useState(job.jobAddress ?? "");
  const [selectedAddressId, setSelectedAddressId] = useState(() => {
    if (!job.customerId) return CUSTOM_ADDRESS_VALUE;
    const cust = normalizedCustomers.find((c) => c.id === job.customerId);
    if (!cust) return CUSTOM_ADDRESS_VALUE;
    const match = cust.serviceAddresses.find(
      (a) => a.line1.trim().toLowerCase() === (job.jobAddress ?? "").trim().toLowerCase()
    );
    return match?.id ?? (job.jobAddress ? CUSTOM_ADDRESS_VALUE : getPrimaryAddress(cust)?.id ?? "");
  });
  const [selectedTechIds, setSelectedTechIds] = useState<string[]>(() =>
    resolveJobTechSelectionIds(job, techs)
  );

  const selectedCustomer = normalizedCustomers.find((c) => c.id === selectedCustomerId);
  const customerAddresses = selectedCustomer?.serviceAddresses ?? [];
  const showAddressPicker = !!selectedCustomerId && customerAddresses.length > 0;
  const usingCustomAddress =
    !showAddressPicker ||
    selectedAddressId === CUSTOM_ADDRESS_VALUE ||
    !selectedAddressId;

  const applyCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const cust = normalizedCustomers.find((c) => c.id === customerId);
    if (!cust) {
      setSelectedAddressId("");
      return;
    }
    const primary = getPrimaryAddress(cust);
    setSelectedAddressId(primary?.id ?? "");
    setJobAddress(getPrimaryAddressLine(cust));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const assigned = techs
      .filter((t) => selectedTechIds.includes(t.id))
      .map((t) => ({ id: t.id, name: t.name }));
    if (assigned.length === 0 && techs.length > 0) {
      setError("Select at least one technician.");
      return;
    }
    if (!title.trim()) {
      setError("Job title is required.");
      return;
    }

    const cust = selectedCustomerId
      ? normalizedCustomers.find((c) => c.id === selectedCustomerId)
      : null;

    setSubmitting(true);
    try {
      const result = await updateJobAction(job.id, {
        title: title.trim(),
        jobAddress: jobAddress.trim(),
        customerId: cust?.id ?? job.customerId ?? null,
        customerName: cust?.name ?? job.customerName,
        customerEmail: cust?.email ?? job.customerEmail,
        customerPhone: cust?.phone ?? job.customerPhone,
        ...(assigned.length > 0 ? { techs: assigned } : {}),
      });
      if (!result.success) {
        setError(result.error ?? "Failed to update job.");
        return;
      }
      setSuccess("Job updated. Returning…");
      window.setTimeout(() => {
        router.push(`/jobs/${job.id}`);
        router.refresh();
      }, 600);
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && <Alert variant="success">{success}</Alert>}

      <section className="job-form-section space-y-4">
        <h2 className="section-title">Job details</h2>
        <div>
          <label className="fp-label" htmlFor="edit-title">
            Job title
          </label>
          <input
            id="edit-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="fp-input"
            maxLength={200}
            required
          />
        </div>

        {normalizedCustomers.length > 0 && (
          <div>
            <label className="fp-label" htmlFor="edit-customer">
              Customer
            </label>
            <select
              id="edit-customer"
              value={selectedCustomerId}
              onChange={(e) => applyCustomer(e.target.value)}
              className="fp-input"
            >
              <option value="">— Keep / select customer —</option>
              {normalizedCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.email ? ` (${c.email})` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {showAddressPicker && (
          <div>
            <label className="fp-label" htmlFor="edit-address-pick">
              Service address
            </label>
            <select
              id="edit-address-pick"
              value={selectedAddressId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedAddressId(id);
                if (id === CUSTOM_ADDRESS_VALUE) return;
                const addr = customerAddresses.find((a) => a.id === id);
                if (addr) setJobAddress(addr.line1);
              }}
              className="fp-input"
            >
              {customerAddresses.map((a) => (
                <option key={a.id} value={a.id}>
                  {(a.label.trim() || (a.isPrimary ? "Primary" : "Address")) +
                    ` — ${a.line1}`}
                </option>
              ))}
              <option value={CUSTOM_ADDRESS_VALUE}>Custom address…</option>
            </select>
          </div>
        )}

        {usingCustomAddress && (
          <div>
            <label className="fp-label" htmlFor="edit-address">
              Service address
            </label>
            <input
              id="edit-address"
              type="text"
              value={jobAddress}
              onChange={(e) => setJobAddress(e.target.value)}
              className="fp-input"
              placeholder="123 Main St, Anytown, USA"
              maxLength={500}
            />
          </div>
        )}
      </section>

      <section className="job-form-section space-y-3">
        <h2 className="section-title">Technicians</h2>
        <JobTechMultiSelect
          techs={techs}
          selectedIds={selectedTechIds}
          onChange={setSelectedTechIds}
        />
      </section>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="btn btn-primary flex items-center gap-2"
        >
          {submitting && <Spinner size="sm" />}
          {submitting ? "Saving…" : "Save changes"}
        </button>
        <Link href={`/jobs/${job.id}`} className="btn btn-outline">
          Cancel
        </Link>
      </div>
    </form>
  );
}
