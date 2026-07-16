"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createJobAction } from "@/actions/jobs";
import { createCustomerAction } from "@/actions/customers";
import PhotoUpload from "./PhotoUpload";
import { Alert, Spinner } from "@/components/ui";
import type { Customer, JobPhoto, SessionContext } from "@/types";

interface JobFormProps {
  session: SessionContext;
  customers: Customer[];
}

type CustomerMode = "existing" | "new";

export default function JobForm({ session, customers }: JobFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customerMode, setCustomerMode] = useState<CustomerMode>(
    customers.length > 0 ? "existing" : "new"
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");

  const [title, setTitle] = useState("");
  const [jobAddress, setJobAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [beforePhotos, setBeforePhotos] = useState<JobPhoto[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<JobPhoto[]>([]);

  const getCustomerDetails = () => {
    if (customerMode === "existing") {
      const cust = customers.find((c) => c.id === selectedCustomerId);
      return {
        customerId: cust?.id ?? null,
        customerName: cust?.name ?? "",
        customerEmail: cust?.email ?? "",
        customerPhone: cust?.phone ?? "",
      };
    }
    return {
      customerId: null,
      customerName: newCustomerName,
      customerEmail: newCustomerEmail,
      customerPhone: newCustomerPhone,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const { customerId, customerName, customerEmail, customerPhone } =
      getCustomerDetails();

    if (!customerName.trim()) {
      setError("Customer name is required.");
      return;
    }
    if (!title.trim()) {
      setError("Job title is required.");
      return;
    }

    setSubmitting(true);

    try {
      let resolvedCustomerId = customerId;
      if (customerMode === "new" && customerName.trim()) {
        const newCustResult = await createCustomerAction({
          name: newCustomerName.trim(),
          email: newCustomerEmail.trim(),
          phone: newCustomerPhone.trim(),
          address: jobAddress.trim(),
          notes: "",
        });
        if (newCustResult.success && newCustResult.data) {
          resolvedCustomerId = (newCustResult.data as { customerId: string }).customerId;
        }
      }

      const techId = session.tech?.id ?? session.user.uid;
      const techName =
        session.role === "owner"
          ? (session.business?.ownerName ?? "")
          : (session.tech?.name ?? "");

      const result = await createJobAction({
        techId,
        techName,
        customerId: resolvedCustomerId,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),
        title: title.trim(),
        jobAddress: jobAddress.trim(),
        notes: notes.trim(),
        beforePhotos,
        afterPhotos,
      });

      if (!result.success) {
        setError(result.error ?? "Failed to create job.");
        return;
      }

      const { jobId } = result.data as { jobId: string };
      router.push(`/jobs/${jobId}`);
    } catch {
      setError("An unexpected error occurred. Please try again.");
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

      <section className="job-form-section">
        <h2 className="section-title">Customer</h2>

        {customers.length > 0 && (
          <div className="flex gap-2 mb-4">
            {(["existing", "new"] as CustomerMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setCustomerMode(mode)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  customerMode === mode
                    ? "bg-brand-700 text-white border-brand-700"
                    : "bg-white text-neutral-600 border-neutral-300 hover:border-brand-400"
                }`}
              >
                {mode === "existing" ? "Existing customer" : "New customer"}
              </button>
            ))}
          </div>
        )}

        {customerMode === "existing" ? (
          <div>
            <label className="form-label" htmlFor="customer-select">
              Select customer <span className="text-error-500">*</span>
            </label>
            <select
              id="customer-select"
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="fp-input"
              required
            >
              <option value="">— Choose a customer —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.email ? `(${c.email})` : ""}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="form-label" htmlFor="cust-name">
                Name <span className="text-error-500">*</span>
              </label>
              <input
                id="cust-name"
                type="text"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                className="fp-input"
                placeholder="Jane Smith"
                required
                maxLength={100}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="cust-email">
                Email <span className="text-error-500">*</span>
              </label>
              <input
                id="cust-email"
                type="email"
                value={newCustomerEmail}
                onChange={(e) => setNewCustomerEmail(e.target.value)}
                className="fp-input"
                placeholder="jane@email.com"
                required
                maxLength={200}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="cust-phone">
                Phone
              </label>
              <input
                id="cust-phone"
                type="tel"
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                className="fp-input"
                placeholder="(813) 555-0100"
                maxLength={30}
              />
            </div>
          </div>
        )}
      </section>

      <section className="job-form-section">
        <h2 className="section-title">Job Details</h2>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="form-label" htmlFor="job-title">
              Job title <span className="text-error-500">*</span>
            </label>
            <input
              id="job-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="fp-input"
              placeholder="Kitchen repipe"
              required
              maxLength={200}
            />
          </div>
          <div>
            <label className="form-label" htmlFor="job-address">
              Service address
            </label>
            <input
              id="job-address"
              type="text"
              value={jobAddress}
              onChange={(e) => setJobAddress(e.target.value)}
              className="fp-input"
              placeholder="123 Oak St, Tampa FL 33602"
              maxLength={300}
            />
          </div>
        </div>
      </section>

      <section className="job-form-section">
        <h2 className="section-title">Summary Notes</h2>
        <p className="text-sm text-neutral-500 mb-2">
          Appears on the inspection report cover page. Add more detail on the job page after saving.
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="fp-input min-h-25 resize-y"
          placeholder="Replaced corroded supply lines. Pressure tested at 80 PSI — no leaks detected."
          maxLength={5000}
        />
      </section>

      <section className="job-form-section">
        <h2 className="section-title">
          Before Photos
          <span className="text-sm font-normal text-neutral-500 ml-2">optional</span>
        </h2>
        <PhotoUpload
          businessId={session.business?.id ?? ""}
          photos={beforePhotos}
          onChange={setBeforePhotos}
          storagePrefix="before"
        />
      </section>

      <section className="job-form-section">
        <h2 className="section-title">
          After Photos
          <span className="text-sm font-normal text-neutral-500 ml-2">optional</span>
        </h2>
        <PhotoUpload
          businessId={session.business?.id ?? ""}
          photos={afterPhotos}
          onChange={setAfterPhotos}
          storagePrefix="after"
        />
      </section>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="btn btn-primary flex items-center gap-2"
        >
          {submitting && <Spinner size="sm" />}
          {submitting ? "Saving…" : "Create Job"}
        </button>
        <a href="/jobs" className="btn btn-outline">
          Cancel
        </a>
      </div>
    </form>
  );
}
