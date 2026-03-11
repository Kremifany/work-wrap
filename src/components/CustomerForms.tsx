"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createCustomerAction,
  updateCustomerAction,
  deleteCustomerAction,
} from "@/actions/customers";
import { Alert, Modal, Spinner } from "@/components/ui";
import { Trash2, Save } from "lucide-react";
import type { Customer } from "@/types";

// ─── New Customer form (used on /customers/new) ────────────────────────────

export function NewCustomerForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createCustomerAction({
        name: String(fd.get("name") ?? ""),
        email: String(fd.get("email") ?? ""),
        phone: String(fd.get("phone") ?? ""),
        address: String(fd.get("address") ?? ""),
        notes: String(fd.get("notes") ?? ""),
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
      <CustomerFields />
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
        address: String(fd.get("address") ?? ""),
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
        <CustomerFields customer={customer} />
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

// ─── Shared input fields ─────────────────────────────────────────────────

function CustomerFields({ customer }: { customer?: Customer }) {
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
        <input
          id="c-phone"
          name="phone"
          type="tel"
          defaultValue={customer?.phone ?? ""}
          className="fp-input"
          maxLength={30}
        />
      </div>
      <div className="sm:col-span-2">
        <label className="form-label" htmlFor="c-address">
          Address
        </label>
        <input
          id="c-address"
          name="address"
          type="text"
          defaultValue={customer?.address ?? ""}
          className="fp-input"
          maxLength={300}
          placeholder="123 Main St, Tampa, FL 33602"
        />
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
