import React, { useId, forwardRef } from "react";
import { AlertCircle } from "lucide-react";

export const Input = forwardRef(function Input(
  {
    label,
    error,
    helperText,
    id: explicitId,
    required = false,
    className = "",
    inputClassName = "",
    disabled = false,
    type = "text",
    leftIcon: LeftIcon,
    ...props
  },
  ref
) {
  const generatedId = useId();
  const inputId = explicitId || generatedId;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  const hasError = Boolean(error);
  const describedBy = [
    hasError ? errorId : null,
    helperText ? helperId : null,
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-display font-bold text-fg mb-1 select-none"
        >
          {label}
          {required && (
            <span className="text-error ml-1" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <div className="relative">
        {LeftIcon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-fg-muted/60 transition-colors">
            <LeftIcon className="w-4 h-4" aria-hidden="true" />
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          disabled={disabled}
          required={required}
          aria-invalid={hasError}
          aria-describedby={describedBy}
          className={`w-full min-h-[42px] sm:min-h-[44px] ${LeftIcon ? "pl-10" : "px-3.5"} ${
            hasError ? "pr-10" : "pr-3.5"
          } py-2 sm:py-2.5 rounded-xl text-base md:text-sm font-body bg-bg-card border transition-all placeholder:text-fg-muted/50 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-hidden ${
            hasError
              ? "border-error focus:border-error focus:ring-3 focus:ring-error/15 text-fg"
              : "border-border hover:border-fg-muted/40 focus:border-orange focus:ring-3 focus:ring-orange/15 text-fg"
          } ${inputClassName}`}
          {...props}
        />
        {hasError && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-error">
            <AlertCircle className="w-4 h-4" aria-hidden="true" />
          </div>
        )}
      </div>

      {hasError && (
        <p
          id={errorId}
          role="alert"
          className="mt-1 text-xs font-display font-medium text-error flex items-center gap-1"
        >
          {error}
        </p>
      )}

      {!hasError && helperText && (
        <p id={helperId} className="mt-1 text-xs font-display text-fg-muted">
          {helperText}
        </p>
      )}
    </div>
  );
});
