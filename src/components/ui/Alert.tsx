import { cn } from "@/lib/utils";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";

type AlertVariant = "success" | "error" | "warning" | "info";

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

const config: Record<AlertVariant, { cls: string; Icon: React.ComponentType<{ className?: string }> }> = {
  success: { cls: "alert-success", Icon: CheckCircle },
  error:   { cls: "alert-error",   Icon: XCircle },
  warning: { cls: "alert-warning", Icon: AlertTriangle },
  info:    { cls: "alert-info",    Icon: Info },
};

export function Alert({
  variant = "info",
  title,
  children,
  onClose,
  className,
}: AlertProps) {
  const { cls, Icon } = config[variant];
  return (
    <div className={cn("alert", cls, className)} role="alert">
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="flex-1">
        {title && <p className="font-semibold">{title}</p>}
        <div className={cn(title && "mt-0.5")}>{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="shrink-0 rounded p-0.5 hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
