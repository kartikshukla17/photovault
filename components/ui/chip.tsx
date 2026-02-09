import * as React from "react";

import { cn } from "@/lib/cn";

type ChipVariant = "success" | "warning" | "accent" | "neutral";

export type ChipProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: ChipVariant;
};

export function Chip({ className, variant = "neutral", ...props }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium",
        variant === "success" && "bg-success/15 text-success",
        variant === "warning" && "bg-warning/15 text-warning",
        variant === "accent" && "bg-accent-primary/15 text-accent-light",
        variant === "neutral" && "bg-bg-elevated text-text-secondary",
        className,
      )}
      {...props}
    />
  );
}

