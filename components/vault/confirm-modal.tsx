"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[200]",
        "bg-black/88 backdrop-blur-[14px]",
        "flex items-center justify-center p-[24px]"
      )}
      onClick={onCancel}
    >
      <div
        className={cn(
          "w-full max-w-[320px]",
          "bg-[#0c0c0c] border border-bg-border rounded-[20px]",
          "p-[22px] shadow-[0_40px_80px_rgba(0,0,0,0.7)]",
          "animate-[pvModalIn_200ms_ease-out_both]"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-[18px] font-bold text-text-primary">
          {title}
        </h3>
        <p className="mt-2 text-[13px] text-text-secondary leading-relaxed">
          {message}
        </p>

        <div className="mt-5 flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            className="flex-1"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes pvModalIn {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
