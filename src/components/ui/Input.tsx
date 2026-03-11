import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="label-text mb-1.5 block"
        >
          {label}
          {props.required && <span className="ml-1 text-error-700">*</span>}
        </label>
      )}
      <input
        id={inputId}
        className={cn("fp-input", error && "error", className)}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-error-700" role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="mt-1 text-sm text-slate-500">{hint}</p>
      )}
    </div>
  );
}
