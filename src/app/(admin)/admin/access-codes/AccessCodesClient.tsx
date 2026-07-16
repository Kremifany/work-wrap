"use client";

import { useState, useTransition } from "react";
import { createAccessCodeAction, toggleAccessCodeAction } from "@/actions/access-codes";
import { Alert, Spinner } from "@/components/ui";
import type { BetaAccessCode } from "@/types";

interface AccessCodesClientProps {
  initialCodes: BetaAccessCode[];
}

export default function AccessCodesClient({ initialCodes }: AccessCodesClientProps) {
  const [codes, setCodes] = useState(initialCodes);
  const [label, setLabel] = useState("");
  const [maxUses, setMaxUses] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNewCode(null);
    startTransition(async () => {
      const result = await createAccessCodeAction({ label: label.trim(), maxUses });
      if (!result.success) {
        setError(result.error ?? "Failed to create code.");
        return;
      }
      const code = (result.data as { code: string }).code;
      setNewCode(code);
      setLabel("");
      setCodes((prev) => [
        {
          id: `temp-${Date.now()}`,
          code,
          label: label.trim() || "Beta invite",
          maxUses,
          useCount: 0,
          active: true,
          createdAt: new Date().toISOString(),
          expiresAt: null,
        },
        ...prev,
      ]);
    });
  };

  const handleToggle = (codeId: string, active: boolean) => {
    startTransition(async () => {
      const result = await toggleAccessCodeAction(codeId, active);
      if (result.success) {
        setCodes((prev) => prev.map((c) => (c.id === codeId ? { ...c, active } : c)));
      }
    });
  };

  return (
    <div className="mt-8 space-y-8">
      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {newCode && (
        <Alert variant="success">
          New code created: <strong className="font-mono">{newCode}</strong> — share with your beta
          contractor.
        </Alert>
      )}

      <form onSubmit={handleCreate} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 max-w-md">
        <h2 className="font-semibold text-slate-900">Generate Code</h2>
        <div>
          <label className="form-label" htmlFor="code-label">
            Label
          </label>
          <input
            id="code-label"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="fp-input"
            placeholder="Tampa plumber — John"
            required
          />
        </div>
        <div>
          <label className="form-label" htmlFor="max-uses">
            Max uses
          </label>
          <input
            id="max-uses"
            type="number"
            min={1}
            max={100}
            value={maxUses}
            onChange={(e) => setMaxUses(Number(e.target.value))}
            className="fp-input"
          />
        </div>
        <button type="submit" disabled={pending} className="btn btn-primary flex items-center gap-2">
          {pending && <Spinner size="sm" />}
          Generate Code
        </button>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-6 py-3">Code</th>
              <th className="px-6 py-3">Label</th>
              <th className="px-6 py-3">Uses</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {codes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                  No access codes yet.
                </td>
              </tr>
            ) : (
              codes.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-mono font-medium text-slate-900">{c.code}</td>
                  <td className="px-6 py-3 text-slate-600">{c.label}</td>
                  <td className="px-6 py-3 text-slate-600">
                    {c.useCount}/{c.maxUses}
                  </td>
                  <td className="px-6 py-3">
                    <button
                      type="button"
                      onClick={() => handleToggle(c.id, !c.active)}
                      disabled={pending || c.id.startsWith("temp-")}
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        c.active ? "bg-success-100 text-success-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {c.active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-6 py-3 text-slate-400">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
