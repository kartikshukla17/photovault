import * as React from "react";

import { cn } from "@/lib/cn";

export type CardProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-bg-surface border border-bg-border rounded-[var(--radius-card)]",
        className,
      )}
      {...props}
    />
  );
}

