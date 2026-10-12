"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createJobAction } from "@/actions/jobs";
import { createCustomerAction } from "@/actions/customers";
import PhotoUpload from "./PhotoUpload";
import { JobTechMultiSelect } from "./JobTechMultiSelect";
import { Alert, PhoneInput, Spinner } from "@/components/ui";
import {
  getPrimaryAddress,
  getPrimaryAddressLine,
  normalizeCustomer,
} from "@/lib/customer-utils";
import type { Customer, JobPhoto, SessionContext, Tech } from "@/types";

interface JobFormProps {
  session: SessionContext;
  customers: Customer[];
  techs: Tech[];
  initialCustomerId?: string;
  initialJobAddress?: string;
}

type CustomerMode = "existing" | "new";
const CUSTOM_ADDRESS_VALUE = "__custom__";

function addressOptionLabel(label: string, line1: string, isPrimary: boolean): string {
  const name = label.trim() || (isPrimary ? "Primary" : "Address");
  return `${name} — ${line1}`;
}

export default function JobForm({
  session,
  customers,
  techs,
  initialCustomerId,
  initialJobAddress,
}: JobFormProps) {
  const router = useRouter();
  const draftKeyRef = useRef(
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `job${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`
  );
  const submitLock = useRef(false);
  const normalizedCustomers = customers.map((c) => normalizeCustomer(c));

  const defaultTechIds = (() => {
    if (techs.length === 0) return [];
    const selfId =
      session.tech?.id ??
      techs.find((t) => t.uid === session.user.uid)?.id ??
      techs.find((t) => t.role === "owner")?.id ??
      techs[0]?.id;
    return selfId ? [selfId] : [techs[0].id];
  })();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTechIds, setSelectedTechIds] = useState<string[]>(defaultTechIds);

  const [customerMode, setCustomerMode] = useState<CustomerMode>(
    normalizedCustomers.length > 0 || initialCustomerId ? "existing" : "new"
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    initialCustomerId ?? ""
  );
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");

  const [title, setTitle] = useState("");
  const [jobAddress, setJobAddress] = useState(initialJobAddress ?? "");
  const [selectedAddressId, setSelectedAddressId] = useState<string>(() => {
    if (!initialCustomerId) return "";
    const cust = normalizedCustomers.find((c) => c.id === initialCustomerId);
    if (!cust) return "";
    if (initialJobAddress) {
      const match = cust.serviceAddresses.find(
        (a) => a.line1.trim().toLowerCase() === initialJobAddress.trim().toLowerCase()
      );
      if (match) return match.id;
    }
    return getPrimaryAddress(cust)?.id ?? "";
  });
  const [notes, setNotes] = useState("");
  const [beforePhotos, setBeforePhotos] = useState<JobPhoto[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<JobPhoto[]>([]);

  const selectedCustomer = normalizedCustomers.find((c) => c.id === selectedCustomerId);
  const customerAddresses = selectedCustomer?.serviceAddresses ?? [];
  const showAddressPicker =
    customerMode === "existing" && !!selectedCustomerId && customerAddresses.length > 0;
  const usingCustomAddress =
    !showAddressPicker ||
    selectedAddressId === CUSTOM_ADDRESS_VALUE ||
    !selectedAddressId;

  const applyCustomerAddresses = (customerId: string) => {
    const cust = normalizedCustomers.find((c) => c.id === customerId);
    if (!cust) {
      setSelectedAddressId("");
      setJobAddress("");
      return;
    }
    const primary = getPrimaryAddress(cust);
    if (primary) {
      setSelectedAddressId(primary.id);
      setJobAddress(primary.line1);
      return;
    }
    setSelectedAddressId(CUSTOM_ADDRESS_VALUE);
    setJobAddress(getPrimaryAddressLine(cust));
  };

  const getCustomerDetails = () => {
    if (customerMode === "existing") {
      const cust = normalizedCustomers.find((c) => c.id === selectedCustomerId);
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
    if (submitLock.current) return;
    submitLock.current = true;
    setError(null);

    const { customerId, customerName, customerEmail, customerPhone } =
      getCustomerDetails();

    if (!customerName.trim()) {
      submitLock.current = false;
      setError("Customer name is required.");
      return;
    }
    if (!title.trim()) {
      submitLock.current = false;
      setError("Job title is required.");
      return;
    }

    const assignedTechs =
      techs.length > 0
        ? techs
            .filter((t) => selectedTechIds.includes(t.id))
            .map((t) => ({ id: t.id, name: t.name }))
        : [
            {
              id: session.tech?.id ?? session.user.uid,
              name:
                session.role === "owner"
                  ? (session.business?.ownerName ?? "Owner")
                  : (session.tech?.name ?? "Technician"),
            },
          ];

    if (assignedTechs.length === 0) {
      submitLock.current = false;
      setError("Select at least one technician who worked this job.");
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
        if (!newCustResult.success || !newCustResult.data) {
          submitLock.current = false;
          setError(newCustResult.error ?? "Failed to save customer to CRM.");
          return;
        }
        resolvedCustomerId = (newCustResult.data as { customerId: string }).customerId;
      }

      const primary = assignedTechs[0];
      const result = await createJobAction({
        draftKey: draftKeyRef.current,
        techId: primary.id,
        techName: primary.name,
        techs: assignedTechs,
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
        submitLock.current = false;
        setError(result.error ?? "Failed to create job.");
        return;
      }

      const { jobId } = result.data as { jobId: string };
      router.push(`/jobs/${jobId}`);
    } catch {
      submitLock.current = false;
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
                onClick={() => {
                  setCustomerMode(mode);
                  if (mode === "new") {
                    setSelectedAddressId(CUSTOM_ADDRESS_VALUE);
                  } else if (selectedCustomerId) {
                    applyCustomerAddresses(selectedCustomerId);
                  }
                }}
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
              onChange={(e) => {
                const id = e.target.value;
                setSelectedCustomerId(id);
                applyCustomerAddresses(id);
              }}
              className="fp-input"
              required
            >
              <option value="">— Choose a customer —</option>
              {normalizedCustomers.map((c) => (
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
              <PhoneInput
                id="cust-phone"
                value={newCustomerPhone}
                onChange={setNewCustomerPhone}
              />
            </div>
          </div>
        )}
      </section>

      <section className="job-form-section">
        <h2 className="section-title">Technicians</h2>
        <p className="text-sm text-neutral-500 mb-3">
          Select everyone who worked on this job. They appear on the completion report.
        </p>
        <JobTechMultiSelect
          techs={techs}
          selectedIds={selectedTechIds}
          onChange={setSelectedTechIds}
        />
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

          {showAddressPicker ? (
            <div>
              <label className="form-label" htmlFor="job-address-select">
                Service address <span className="text-error-500">*</span>
              </label>
              <select
                id="job-address-select"
                value={selectedAddressId || CUSTOM_ADDRESS_VALUE}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedAddressId(id);
                  if (id === CUSTOM_ADDRESS_VALUE) {
                    setJobAddress("");
                    return;
                  }
                  const addr = customerAddresses.find((a) => a.id === id);
                  setJobAddress(addr?.line1 ?? "");
                }}
                className="fp-input"
                required
              >
                {customerAddresses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {addressOptionLabel(a.label, a.line1, a.isPrimary)}
                  </option>
                ))}
                <option value={CUSTOM_ADDRESS_VALUE}>Other / custom address…</option>
              </select>
              {usingCustomAddress && (
                <input
                  id="job-address"
                  type="text"
                  value={jobAddress}
                  onChange={(e) => setJobAddress(e.target.value)}
                  className="fp-input mt-2"
                  placeholder="123 Main St, Anytown, USA"
                  required
                  maxLength={300}
                />
              )}
            </div>
          ) : (
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
                placeholder="123 Main St, Anytown, USA"
                maxLength={300}
              />
              {customerMode === "existing" && selectedCustomerId && (
                <p className="mt-1 text-sm text-neutral-500">
                  This customer has no saved addresses yet. Enter one here, or add
                  addresses on their customer page.
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="job-form-section">
        <h2 className="section-title">Summary Notes</h2>
        <p className="text-sm text-neutral-500 mb-2">
          Appears on the job completion report cover page. Add more detail on the job page after saving.
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

      <div className="pt-2 space-y-3">
        <p className="text-sm text-neutral-500">
          Saves as a draft. Photos are optional — you can add them later, then generate
          or send the report from the job page.
        </p>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary flex items-center gap-2"
          >
            {submitting && <Spinner size="sm" />}
            {submitting ? "Saving…" : "Save Job"}
          </button>
          <a href="/jobs" className="btn btn-outline">
            Cancel
          </a>
        </div>
      </div>
    </form>
  );
}
