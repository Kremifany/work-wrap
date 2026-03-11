import { cn } from "@/lib/utils";
import type { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Textarea({ label, error, hint, className, id, ...props }: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="label-text mb-1.5 block">
          {label}
          {props.required && <span className="ml-1 text-error-700">*</span>}
        </label>
      )}
      <textarea
        id={inputId}
        className={cn(
          "fp-input min-h-25 resize-y leading-relaxed",
          error && "error",
          className
        )}
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
