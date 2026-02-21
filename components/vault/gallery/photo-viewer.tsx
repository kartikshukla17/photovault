"use client";

import * as React from "react";

import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/format";
import type { VaultPhoto } from "@/lib/vault/types";

export function PhotoViewer({
  open,
  photos,
  photoId,
  infoMode,
  onClose,
  onSetPhotoId,
  onToggleInfo,
  onDelete,
  onAddToAlbum,
}: {
  open: boolean;
  photos: VaultPhoto[];
  photoId: string | null;
  infoMode: boolean;
  onClose: () => void;
  onSetPhotoId: (next: string) => void;
  onToggleInfo: () => void;
  onDelete?: (id: string) => void;
  onAddToAlbum?: () => void;
}) {
  const index = photoId
    ? Math.max(
        0,
        photos.findIndex((p) => p.id === photoId)
      )
    : 0;
  const photo = photos[index];

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && index > 0)
        onSetPhotoId(photos[index - 1]!.id);
      if (event.key === "ArrowRight" && index < photos.length - 1)
        onSetPhotoId(photos[index + 1]!.id);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, index, onClose, onSetPhotoId, photos]);

  const handleShare = async () => {
    const url = typeof window === "undefined" ? "" : window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ url, title: photo?.filename ?? "Photo" });
        return;
      }
    } catch {
      // ignore
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // ignore
    }
  };

  const handleDownload = async () => {
    if (!photo) return;
    try {
      let urlToDownload = photo.originalUrl;
      if (!urlToDownload) {
        const res = await fetch(`/api/photos/${photo.id}`);
        if (res.ok) {
          const data = (await res.json()) as { photo?: { originalUrl?: string } };
          urlToDownload = data.photo?.originalUrl;
        }
      }

      if (!urlToDownload) {
        urlToDownload = photo.previewUrl;
      }

      const response = await fetch(urlToDownload);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = photo.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      window.open(photo.originalUrl ?? photo.previewUrl, "_blank");
    }
  };

  const handleDelete = () => {
    if (photo && onDelete) {
      onDelete(photo.id);
    }
  };

  const handleAddToAlbum = () => {
    onAddToAlbum?.();
  };

  if (!open || !photo) return null;

  return (
    <div
      className="fixed inset-0 z-[150] bg-black flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
    >
      {/* Top Bar */}
      <div
        className={cn(
          "flex items-center justify-between px-[22px] py-[14px]",
          "bg-[linear-gradient(180deg,rgba(0,0,0,0.9)_0%,transparent_100%)]",
          "absolute top-0 left-0 right-0 z-10"
        )}
      >
        <button
          onClick={onClose}
          className={cn(
            "px-[14px] py-[7px] rounded-[20px]",
            "bg-white/10 border border-white/10",
            "text-white text-[12px]",
            "active:scale-[0.98]"
          )}
        >
          ← Back
        </button>

        <div className="font-display text-white/50 text-[13px]">
          {index + 1} / {photos.length}
        </div>

        <div className="flex gap-[8px]">
          <button
            onClick={onToggleInfo}
            className={cn(
              "px-[14px] py-[7px] rounded-[20px] text-[12px]",
              "active:scale-[0.98]",
              infoMode
                ? "bg-accent-glow border border-accent-primary/35 text-accent-primary"
                : "bg-white/10 border border-white/10 text-white"
            )}
          >
            ⓘ Info
          </button>
          <button
            onClick={handleShare}
            className={cn(
              "px-[14px] py-[7px] rounded-[20px]",
              "bg-white/10 border border-white/10",
              "text-white text-[12px]",
              "active:scale-[0.98]"
            )}
          >
            ↗ Share
          </button>
          <button
            onClick={handleAddToAlbum}
            className={cn(
              "px-[14px] py-[7px] rounded-[20px]",
              "bg-white/10 border border-white/10",
              "text-white text-[12px]",
              "active:scale-[0.98]"
            )}
          >
            ＋ Album
          </button>
          <button
            onClick={handleDownload}
            className={cn(
              "px-[14px] py-[7px] rounded-[20px]",
              "bg-white/10 border border-white/10",
              "text-white text-[12px]",
              "active:scale-[0.98]"
            )}
          >
            ⬇ Download Original
          </button>
          <button
            onClick={handleDelete}
            className={cn(
              "px-[14px] py-[7px] rounded-[20px]",
              "bg-danger/10 border border-danger/25",
              "text-danger text-[12px]",
              "active:scale-[0.98]"
            )}
          >
            ✕ Delete
          </button>
        </div>
      </div>

      {/* Image Area */}
      <div
        className={cn(
          "flex-1 flex items-center justify-center relative",
          "transition-[padding] duration-250",
          infoMode && "pr-[280px]"
        )}
      >
        {/* Previous Button */}
        <button
          onClick={() => index > 0 && onSetPhotoId(photos[index - 1]!.id)}
          className={cn(
            "absolute left-[20px] z-5",
            "w-[42px] h-[42px] rounded-full",
            "bg-white/10 border border-white/10",
            "text-white text-[20px]",
            "active:scale-[0.98] transition-opacity",
            index === 0 ? "opacity-20 pointer-events-none" : "opacity-100"
          )}
        >
          ‹
        </button>

        {/* Main Image */}
        <img
          src={photo.previewUrl}
          alt={photo.filename}
          className={cn(
            "max-w-[calc(100%-130px)] max-h-[calc(100vh-150px)]",
            "object-contain rounded-[4px]",
            "shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
          )}
        />

        {/* Next Button */}
        <button
          onClick={() =>
            index < photos.length - 1 && onSetPhotoId(photos[index + 1]!.id)
          }
          className={cn(
            "absolute z-5",
            "w-[42px] h-[42px] rounded-full",
            "bg-white/10 border border-white/10",
            "text-white text-[20px]",
            "active:scale-[0.98] transition-all duration-250",
            index === photos.length - 1
              ? "opacity-20 pointer-events-none"
              : "opacity-100",
            infoMode ? "right-[300px]" : "right-[20px]"
          )}
        >
          ›
        </button>
      </div>

      {/* Info Panel */}
      {infoMode && (
        <div
          className={cn(
            "absolute right-0 top-0 bottom-0 w-[270px]",
            "bg-[#0a0a0a] border-l border-bg-border",
            "px-[22px] pt-[80px] pb-[24px] overflow-y-auto"
          )}
        >
          <div className="font-display text-[17px] text-text-primary mb-[18px]">
            Details
          </div>
          {[
            ["Filename", photo.filename],
            ["File size", formatBytes(photo.sizeBytes)],
            ["Dimensions", `${photo.width} × ${photo.height}`],
            [
              "Date taken",
              photo.takenAt.toLocaleDateString(undefined, {
                day: "numeric",
                month: "long",
                year: "numeric",
              }),
            ],
            ["Device", photo.device],
            ["Location", photo.location],
            ["Storage tier", "AWS S3 · Original"],
            ["Format", "JPEG · sRGB"],
          ].map(([k, v]) => (
            <div
              key={k}
              className="mb-[14px] pb-[14px] border-b border-bg-elevated"
            >
              <div className="text-[10px] text-text-muted uppercase tracking-[0.8px] mb-[3px]">
                {k}
              </div>
              <div className="text-[12px] text-text-secondary">{v}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filmstrip */}
      <div
        className={cn(
          "px-[22px] py-[10px]",
          "bg-[linear-gradient(0deg,rgba(0,0,0,0.92)_0%,transparent_100%)]",
          "flex gap-[5px] justify-center overflow-x-auto flex-shrink-0"
        )}
      >
        {photos.slice(Math.max(0, index - 5), index + 7).map((p, i) => {
          const realIndex = Math.max(0, index - 5) + i;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSetPhotoId(p.id)}
              className={cn(
                "relative w-[44px] h-[44px] rounded-[5px] overflow-hidden",
                "cursor-pointer flex-shrink-0 transition-all duration-150",
                realIndex === index
                  ? "border-2 border-accent-primary opacity-100"
                  : "border-2 border-transparent opacity-45"
              )}
              aria-label={`Open ${p.filename}`}
            >
              <img src={p.thumbUrl} alt="" className="h-full w-full object-cover" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
