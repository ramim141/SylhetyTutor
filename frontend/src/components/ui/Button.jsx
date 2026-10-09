import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

const variants = {
  primary: "bg-orange text-on-orange hover:bg-orange-hover",
  secondary: "bg-navy text-on-navy hover:bg-navy-light",
  outline: "border-2 border-orange text-orange-text hover:bg-orange-pale",
  ghost: "border border-border text-fg-secondary hover:bg-bg-subtle",
  danger: "bg-error text-on-error hover:opacity-90",
};

const sizes = {
  sm: "min-h-9 px-4 text-xs",
  md: "min-h-11 px-6 text-sm",
  lg: "min-h-13 px-8 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className = "",
  children,
  disabled = false,
  ...rest
}) {
  return (
    <button
      className={twMerge(
        clsx(
          "inline-flex items-center justify-center gap-2 rounded-md font-display font-semibold transition-colors duration-200 cursor-pointer select-none",
          "focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          variants[variant] || variants.primary,
          sizes[size] || sizes.md,
          className
        )
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && (
        <span
          className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
          aria-hidden
        />
      )}
      {children}
    </button>
  );
}
