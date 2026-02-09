"use client";

import * as React from "react";

import { cn } from "@/lib/cn";

export type ToggleProps = {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
  "aria-label"?: string;
};

export function Toggle({
  checked,
  onCheckedChange,
  disabled,
  ...props
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative w-[46px] h-[27px] rounded-[14px] transition-colors duration-200",
        "disabled:opacity-50 disabled:pointer-events-none",
        checked ? "bg-accent-primary" : "bg-bg-hover",
      )}
      {...props}
    >
      <span
        className={cn(
          "absolute top-[3px] h-[21px] w-[21px] rounded-full bg-white",
          "shadow-[0_2px_6px_rgba(0,0,0,0.4)] transition-[left] duration-200",
          checked ? "left-[22px]" : "left-[3px]",
        )}
      />
    </button>
  );
}

