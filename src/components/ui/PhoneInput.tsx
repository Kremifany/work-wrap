"use client";

import { formatPhoneNumber } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

type PhoneInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "inputMode"
> & {
  value: string;
  onChange: (formatted: string) => void;
};

export function PhoneInput({
  value,
  onChange,
  className = "fp-input",
  placeholder = "(813) 555-0100",
  maxLength = 14,
  ...props
}: PhoneInputProps) {
  return (
    <input
      {...props}
      type="tel"
      inputMode="numeric"
      autoComplete="tel"
      className={className}
      placeholder={placeholder}
      maxLength={maxLength}
      value={formatPhoneNumber(value)}
      onChange={(e) => onChange(formatPhoneNumber(e.target.value))}
    />
  );
}
