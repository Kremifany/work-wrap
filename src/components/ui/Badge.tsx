import { cn } from "@/lib/utils";
import type { JobStatus, PlanType } from "@/types";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | JobStatus | PlanType;
type BadgeSize = "sm" | "md";

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
  className?: string;
}

const variantClass: Record<string, string> = {
  default:   "badge-draft",
  draft:     "badge-draft",
  completed: "badge-completed",
  sent:      "badge-sent",
  success:   "badge-completed",
  warning:   "bg-warning-100 text-warning-700",
  error:     "bg-error-100 text-error-700",
  info:      "badge-sent",
  free:      "badge-free",
  pro:       "badge-pro",
  team:      "bg-violet-100 text-violet-700",
};

const sizeClass: Record<BadgeSize, string> = {
  sm: "text-[0.65rem] px-2 py-0.5",
  md: "text-xs px-3 py-1",
};

export function Badge({ variant = "default", size, children, className }: BadgeProps) {
  return (
    <span className={cn("badge", variantClass[variant] ?? "badge-draft", size && sizeClass[size], className)}>
      {children}
    </span>
  );
}
