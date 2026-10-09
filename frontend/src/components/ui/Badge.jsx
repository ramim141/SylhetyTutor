import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

const badgeVariants = {
  featured: "border border-success bg-success-bg text-success",
  verified: "border border-info/30 bg-info-bg text-info",
  pro: "border border-badge-pro/20 bg-badge-pro/10 text-badge-pro",
  premium: "border border-badge-premium/20 bg-orange-light text-badge-premium",
  free: "border border-border bg-bg-subtle text-fg-muted",
  founding: "bg-navy text-on-navy",
  tag: "border border-border bg-transparent text-fg-secondary rounded-sm",
};

export function Badge({
  variant = "tag",
  icon = null,
  className = "",
  children,
  ...rest
}) {
  return (
    <span
      className={twMerge(
        clsx(
          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-display font-semibold",
          badgeVariants[variant] || badgeVariants.tag,
          className
        )
      )}
      {...rest}
    >
      {icon}
      {children}
    </span>
  );
}
