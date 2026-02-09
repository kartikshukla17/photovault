"use client";

import * as React from "react";

import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "md" | "sm" | "icon";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  className,
  variant = "secondary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 select-none",
        "rounded-[var(--radius-button)]",
        "transition-[transform,opacity,background-color,color,border-color] duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 focus-visible:ring-offset-0",
        "disabled:opacity-50 disabled:pointer-events-none",
        size === "md" && "h-12 px-4 text-[14px] font-semibold",
        size === "sm" && "h-9 px-3 text-[13px] font-semibold",
        size === "icon" &&
          "h-11 w-11 px-0 rounded-[14px] text-[14px] font-semibold",
        variant === "primary" &&
          "bg-[linear-gradient(135deg,#c8a97e,#9a6835)] text-white font-bold shadow-[0_4px_16px_rgba(200,169,126,0.15)] active:opacity-90 active:scale-[0.98]",
        variant === "secondary" &&
          "bg-bg-border text-text-primary active:bg-bg-hover active:scale-[0.98]",
        variant === "ghost" &&
          "bg-transparent text-text-secondary hover:bg-bg-surface active:bg-bg-border active:scale-[0.98]",
        variant === "danger" &&
          "bg-danger text-white hover:bg-danger/90 active:scale-[0.98]",
        className,
      )}
      {...props}
    />
  );
}

