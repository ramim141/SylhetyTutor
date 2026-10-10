import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

const variants = {
  primary: "bg-orange text-on-orange hover:bg-orange-hover shadow-sm hover:shadow-md hover:shadow-orange/20 active:scale-[0.99]",
  secondary: "bg-navy text-on-navy hover:bg-navy-light shadow-sm active:scale-[0.99]",
  outline: "border border-border hover:border-orange text-fg hover:text-orange-text hover:bg-orange-pale/40 active:scale-[0.99]",
  ghost: "border border-border/80 text-fg-secondary hover:text-fg hover:bg-bg-subtle active:scale-[0.99]",
  danger: "bg-error text-on-error hover:opacity-95 shadow-sm active:scale-[0.99]",
};

const sizes = {
  sm: "min-h-9 px-3.5 text-xs rounded-lg",
  md: "min-h-11 px-5 text-sm rounded-xl",
  lg: "min-h-12 px-6 text-base rounded-xl font-semibold",
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
          "inline-flex items-center justify-center gap-2 rounded-xl font-display font-semibold transition-all duration-150 cursor-pointer select-none",
          "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-orange/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:transform-none",
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
