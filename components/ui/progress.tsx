import * as React from "react";

import { cn } from "@/lib/cn";

export type ProgressProps = {
  value: number;
  className?: string;
};

export function Progress({ value, className }: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn(
        "h-2 rounded-full bg-bg-elevated overflow-hidden",
        className,
      )}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
    >
      <div
        className="h-full rounded-full bg-[linear-gradient(90deg,var(--pv-accent-primary),var(--pv-accent-light))] transition-[width] duration-200"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

