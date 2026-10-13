import React from "react";
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { useTranslation } from "../../i18n";

export function Alert({
  variant = "info",
  title,
  children,
  onClose,
  className = "",
}) {
  const { t } = useTranslation();
  const config = {
    error: {
      bg: "bg-error-bg border-error/30 text-error",
      icon: AlertCircle,
      role: "alert",
      iconColor: "text-error",
    },
    success: {
      bg: "bg-success-bg border-success/30 text-success",
      icon: CheckCircle2,
      role: "status",
      iconColor: "text-success",
    },
    warning: {
      bg: "bg-warning-bg border-warning/30 text-warning",
      icon: AlertTriangle,
      role: "alert",
      iconColor: "text-warning",
    },
    info: {
      bg: "bg-info-bg border-info/30 text-info",
      icon: Info,
      role: "status",
      iconColor: "text-info",
    },
  }[variant] || {
    bg: "bg-info-bg border-info/30 text-info",
    icon: Info,
    role: "status",
    iconColor: "text-info",
  };

  const Icon = config.icon;

  return (
    <div
      role={config.role}
      aria-live="polite"
      className={`flex items-start gap-3 p-3.5 rounded-xl border text-sm font-body transition-colors ${config.bg} ${className}`}
    >
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${config.iconColor}`} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className="font-display font-bold text-sm tracking-tight mb-0.5">
            {title}
          </h4>
        )}
        <div className="text-xs md:text-sm leading-relaxed opacity-90">{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.dismiss")}
          className="p-1 -mr-1 -mt-1 rounded-md opacity-70 hover:opacity-100 transition-opacity cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-current"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
