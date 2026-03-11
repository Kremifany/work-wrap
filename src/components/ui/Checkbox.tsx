import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: string;
  error?: string;
}

export function Checkbox({ label, description, error, className, id, ...props }: CheckboxProps) {
  const checkId = id ?? `check-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="flex items-start gap-3">
      <input
        id={checkId}
        type="checkbox"
        className={cn(
          "mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-2 border-slate-300 text-brand-800",
          "accent-brand-800",
          "focus-visible:ring-2 focus-visible:ring-brand-800 focus-visible:ring-offset-2",
          error && "border-error-700",
          className
        )}
        {...props}
      />
      <label htmlFor={checkId} className="cursor-pointer">
        <span className="text-sm font-medium text-slate-900">{label}</span>
        {description && (
          <span className="mt-0.5 block text-sm text-slate-500">{description}</span>
        )}
      </label>
      {error && (
        <p className="mt-1 text-sm text-error-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
