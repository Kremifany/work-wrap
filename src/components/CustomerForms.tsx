"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createCustomerAction,
  updateCustomerAction,
  deleteCustomerAction,
  addCustomerAddressAction,
  updateCustomerAddressAction,
  removeCustomerAddressAction,
  setPrimaryCustomerAddressAction,
} from "@/actions/customers";
import { normalizeCustomer } from "@/lib/customer-utils";
import { Alert, Badge, Modal, PhoneInput, Spinner } from "@/components/ui";
import { formatPhoneNumber } from "@/lib/utils";
import { MapPin, Plus, Star, Trash2, Save } from "lucide-react";
import type { Customer, CustomerServiceAddress } from "@/types";

// ─── New Customer form (used on /customers/new) ────────────────────────────

export function NewCustomerForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [addressRows, setAddressRows] = useState<Array<{ label: string; line1: string }>>([
    { label: "Primary", line1: "" },
  ]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const serviceAddresses = addressRows
      .map((row, index) => ({
        label: row.label.trim(),
        line1: row.line1.trim(),
        isPrimary: index === 0,
      }))
      .filter((row) => row.line1.length > 0);

    startTransition(async () => {
      const result = await createCustomerAction({
        name: String(fd.get("name") ?? ""),
        email: String(fd.get("email") ?? ""),
        phone: String(fd.get("phone") ?? ""),
        notes: String(fd.get("notes") ?? ""),
        serviceAddresses,
      });
      if (!result.success) {
        setError(result.error ?? "Failed to create customer.");
      } else {
        const { customerId } = result.data as { customerId: string };
        router.push(`/customers/${customerId}`);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      <CustomerContactFields />
      <ServiceAddressDraftRows rows={addressRows} onChange={setAddressRows} />
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="btn btn-primary flex items-center gap-2"
        >
          {pending && <Spinner size="sm" />}
          {pending ? "Saving…" : "Create Customer"}
        </button>
        <a href="/customers" className="btn btn-outline">
          Cancel
        </a>
      </div>
    </form>
  );
}

// ─── Edit Customer form ───────────────────────────────────────────────────

interface EditCustomerFormProps {
  customer: Customer;
}

export function EditCustomerForm({ customer }: EditCustomerFormProps) {
  const router = useRouter();
  const normalized = normalizeCustomer(customer);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [saving, startSave] = useTransition();
  const [deleting, startDelete] = useTransition();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const fd = new FormData(e.currentTarget);
    startSave(async () => {
      const result = await updateCustomerAction(customer.id, {
        name: String(fd.get("name") ?? ""),
        email: String(fd.get("email") ?? ""),
        phone: String(fd.get("phone") ?? ""),
        notes: String(fd.get("notes") ?? ""),
      });
      if (!result.success) {
        setError(result.error ?? "Update failed.");
      } else {
        setSuccess(true);
        router.refresh();
      }
    });
  };

  const handleDelete = () => {
    startDelete(async () => {
      const result = await deleteCustomerAction(customer.id);
      if (!result.success) {
        setError(result.error ?? "Delete failed.");
        setShowDelete(false);
      } else {
        router.push("/customers");
      }
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert variant="success" onClose={() => setSuccess(false)}>
            Customer updated successfully.
          </Alert>
        )}
        <CustomerContactFields customer={normalized} />
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary flex items-center gap-2"
          >
            {saving ? <Spinner size="sm" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={() => setShowDelete(true)}
            className="btn btn-destructive flex items-center gap-2 ml-auto"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </form>

      <Modal
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        title="Delete Customer"
      >
        <div className="space-y-4">
          <p className="text-neutral-600">
            Delete <strong>{customer.name}</strong>? Their job history will be
            preserved, but the customer record will be removed.
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
              Delete Customer
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ─── Service addresses subtable (customer detail) ─────────────────────────

export function CustomerServiceAddressesTable({ customer }: { customer: Customer }) {
  const router = useRouter();
  const normalized = normalizeCustomer(customer);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftLine1, setDraftLine1] = useState("");
  const [draftPrimary, setDraftPrimary] = useState(false);

  const resetDraft = () => {
    setDraftLabel("");
    setDraftLine1("");
    setDraftPrimary(false);
    setShowAdd(false);
    setEditingId(null);
  };

  const startEdit = (address: CustomerServiceAddress) => {
    setEditingId(address.id);
    setShowAdd(false);
    setDraftLabel(address.label);
    setDraftLine1(address.line1);
    setDraftPrimary(address.isPrimary);
    setError(null);
  };

  const handleAdd = () => {
    setError(null);
    startTransition(async () => {
      const result = await addCustomerAddressAction(customer.id, {
        label: draftLabel,
        line1: draftLine1,
        isPrimary: draftPrimary || normalized.serviceAddresses.length === 0,
      });
      if (!result.success) {
        setError(result.error ?? "Failed to add address.");
        return;
      }
      resetDraft();
      router.refresh();
    });
  };

  const handleUpdate = () => {
    if (!editingId) return;
    setError(null);
    startTransition(async () => {
      const result = await updateCustomerAddressAction(customer.id, editingId, {
        label: draftLabel,
        line1: draftLine1,
        isPrimary: draftPrimary,
      });
      if (!result.success) {
        setError(result.error ?? "Failed to update address.");
        return;
      }
      resetDraft();
      router.refresh();
    });
  };

  const handleSetPrimary = (addressId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await setPrimaryCustomerAddressAction(customer.id, addressId);
      if (!result.success) {
        setError(result.error ?? "Failed to set primary address.");
        return;
      }
      router.refresh();
    });
  };

  const handleRemove = (addressId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await removeCustomerAddressAction(customer.id, addressId);
      if (!result.success) {
        setError(result.error ?? "Failed to remove address.");
        return;
      }
      if (editingId === addressId) resetDraft();
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {normalized.serviceAddresses.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-200 px-4 py-8 text-center">
          <MapPin className="mx-auto mb-2 h-8 w-8 text-neutral-300" />
          <p className="text-sm text-neutral-500">No service addresses yet.</p>
          <p className="mt-1 text-xs text-neutral-400">
            Add home, office, or other job site locations for this customer.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile: stacked list */}
          <ul className="md:hidden divide-y divide-neutral-100 rounded-lg border border-neutral-200 overflow-hidden">
            {normalized.serviceAddresses.map((address) => (
              <li key={address.id} className="px-4 py-3.5 space-y-2 bg-white">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-neutral-900 truncate">
                      {address.label || "Address"}
                    </p>
                    <p className="text-sm text-neutral-500 mt-0.5 break-words">
                      {address.line1}
                    </p>
                  </div>
                  {address.isPrimary ? (
                    <Badge variant="info" size="sm">
                      Primary
                    </Badge>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {!address.isPrimary && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => handleSetPrimary(address.id)}
                      className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
                    >
                      <Star className="w-3.5 h-3.5" />
                      Make primary
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => startEdit(address)}
                    className="text-xs font-medium text-brand-600 hover:text-brand-700"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => handleRemove(address.id)}
                    className="text-xs font-medium text-error-600 hover:text-error-700"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="fp-table">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Service address</th>
                  <th>Primary</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {normalized.serviceAddresses.map((address) => (
                  <tr key={address.id}>
                    <td className="font-medium text-sm">
                      {address.label || <span className="text-neutral-400">—</span>}
                    </td>
                    <td className="text-sm text-neutral-700 max-w-md">
                      {address.line1}
                    </td>
                    <td>
                      {address.isPrimary ? (
                        <Badge variant="info">Primary</Badge>
                      ) : (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => handleSetPrimary(address.id)}
                          className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
                        >
                          <Star className="w-3.5 h-3.5" />
                          Make primary
                        </button>
                      )}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => startEdit(address)}
                        className="text-sm font-medium text-brand-600 hover:text-brand-700 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => handleRemove(address.id)}
                        className="text-sm font-medium text-error-600 hover:text-error-700"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {(showAdd || editingId) && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 space-y-3">
          <p className="text-sm font-semibold text-neutral-800">
            {editingId ? "Edit service address" : "Add service address"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="form-label">Label</label>
              <input
                type="text"
                value={draftLabel}
                onChange={(e) => setDraftLabel(e.target.value)}
                className="fp-input"
                placeholder="Home, Office…"
                maxLength={80}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">
                Address <span className="text-error-500">*</span>
              </label>
              <input
                type="text"
                value={draftLine1}
                onChange={(e) => setDraftLine1(e.target.value)}
                className="fp-input"
                placeholder="123 Main St, Anytown, USA"
                maxLength={500}
                required
              />
            </div>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={draftPrimary}
              onChange={(e) => setDraftPrimary(e.target.checked)}
            />
            Set as primary address
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending || !draftLine1.trim()}
              onClick={editingId ? handleUpdate : handleAdd}
              className="btn btn-primary flex items-center gap-2"
            >
              {pending && <Spinner size="sm" />}
              {editingId ? "Save address" : "Add address"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={resetDraft}
              className="btn btn-outline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!showAdd && !editingId && (
        <button
          type="button"
          onClick={() => {
            setShowAdd(true);
            setDraftLabel("");
            setDraftLine1("");
            setDraftPrimary(normalized.serviceAddresses.length === 0);
            setError(null);
          }}
          className="btn btn-outline flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add service address
        </button>
      )}
    </div>
  );
}

// ─── Shared contact fields (no address — addresses are a subtable) ────────

function CustomerContactFields({ customer }: { customer?: Customer }) {
  const [phone, setPhone] = useState(formatPhoneNumber(customer?.phone ?? ""));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <label className="form-label" htmlFor="c-name">
          Name <span className="text-error-500">*</span>
        </label>
        <input
          id="c-name"
          name="name"
          type="text"
          defaultValue={customer?.name ?? ""}
          className="fp-input"
          required
          maxLength={100}
        />
      </div>
      <div>
        <label className="form-label" htmlFor="c-email">
          Email
        </label>
        <input
          id="c-email"
          name="email"
          type="email"
          defaultValue={customer?.email ?? ""}
          className="fp-input"
          maxLength={200}
        />
      </div>
      <div>
        <label className="form-label" htmlFor="c-phone">
          Phone
        </label>
        <input type="hidden" name="phone" value={phone} />
        <PhoneInput id="c-phone" value={phone} onChange={setPhone} />
      </div>
      <div className="sm:col-span-2">
        <label className="form-label" htmlFor="c-notes">
          Notes
        </label>
        <textarea
          id="c-notes"
          name="notes"
          defaultValue={customer?.notes ?? ""}
          className="fp-input min-h-20 resize-y"
          maxLength={2000}
          placeholder="Preferred contact method, gate code, special instructions…"
        />
      </div>
    </div>
  );
}

function ServiceAddressDraftRows({
  rows,
  onChange,
}: {
  rows: Array<{ label: string; line1: string }>;
  onChange: (rows: Array<{ label: string; line1: string }>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-neutral-800">Service addresses</p>
          <p className="text-xs text-neutral-500">
            First row is the primary address. Add more locations after creating if needed.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline text-sm px-3 py-1.5 flex items-center gap-1"
          onClick={() => onChange([...rows, { label: "", line1: "" }])}
        >
          <Plus className="w-3.5 h-3.5" />
          Add row
        </button>
      </div>
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div
            key={index}
            className="grid grid-cols-1 sm:grid-cols-[140px_1fr_auto] gap-2 items-end"
          >
            <div>
              <label className="form-label">Label</label>
              <input
                type="text"
                value={row.label}
                onChange={(e) => {
                  const next = [...rows];
                  next[index] = { ...next[index], label: e.target.value };
                  onChange(next);
                }}
                className="fp-input"
                placeholder={index === 0 ? "Primary" : "Office"}
                maxLength={80}
              />
            </div>
            <div>
              <label className="form-label">
                Address {index === 0 ? <span className="text-neutral-400">(primary)</span> : null}
              </label>
              <input
                type="text"
                value={row.line1}
                onChange={(e) => {
                  const next = [...rows];
                  next[index] = { ...next[index], line1: e.target.value };
                  onChange(next);
                }}
                className="fp-input"
                placeholder="123 Main St, Anytown, USA"
                maxLength={500}
              />
            </div>
            <button
              type="button"
              className="btn btn-outline px-3 py-2 mb-0.5"
              disabled={rows.length === 1}
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
              aria-label="Remove address row"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
