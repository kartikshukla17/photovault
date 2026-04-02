"use client";

import * as React from "react";
import type { VaultPhoto } from "@/lib/vault/types";
import { cn } from "@/lib/cn";

const VIDEO_EXTENSIONS = [".mp4", ".mov", ".avi", ".webm", ".mkv", ".3gp", ".m4v"];

function isVideoFile(filename: string): boolean {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  return VIDEO_EXTENSIONS.includes(ext);
}

export function PhotoThumb({
  photo,
  selectMode,
  selected,
  onToggleSelect,
  onOpen,
}: {
  photo: VaultPhoto;
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
}) {
  const [imgError, setImgError] = React.useState(false);
  const isVideo = isVideoFile(photo.filename);

  return (
    <button
      type="button"
      className={cn(
        "photo-cell relative aspect-square w-full overflow-hidden rounded-[4px]",
        "cursor-pointer transition-all duration-150",
        selected && "ring-2 ring-accent-primary"
      )}
      onClick={selectMode ? onToggleSelect : onOpen}
      aria-label={photo.filename}
    >
      {imgError || (isVideo && photo.processingStatus !== "completed") ? (
        <div className="h-full w-full bg-[#1a1a1a] flex items-center justify-center text-[24px]">
          {isVideo ? "🎬" : "🖼"}
        </div>
      ) : (
        <img
          src={photo.thumbUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      )}

      {/* Hover overlay with location */}
      <div
        className={cn(
          "cell-overlay absolute inset-0 opacity-0 transition-opacity duration-200",
          "bg-[linear-gradient(180deg,rgba(0,0,0,0.25)_0%,transparent_35%,transparent_55%,rgba(0,0,0,0.5)_100%)]"
        )}
      >
        <div
          className={cn(
            "absolute bottom-[6px] left-[7px] right-[7px]",
            "text-[10px] text-white/65",
            "overflow-hidden text-ellipsis whitespace-nowrap"
          )}
        >
          {photo.location}
        </div>
      </div>

      {/* Pending backup indicator */}
      {!photo.backedUp && (
        <span
          className={cn(
            "absolute right-[5px] top-[5px]",
            "h-2 w-2 rounded-full bg-warning",
            "border-[1.5px] border-bg-base"
          )}
          aria-label="Pending backup"
        />
      )}

      {/* Select mode overlay */}
      {selectMode && (
        <>
          <span
            className={cn(
              "absolute inset-0 transition-colors",
              selected ? "bg-accent-primary/35" : "bg-black/10"
            )}
            aria-hidden
          />
          <span
            className={cn(
              "absolute right-[6px] top-[6px]",
              "flex h-[18px] w-[18px] items-center justify-center rounded-full",
              "text-[10px] font-bold",
              selected
                ? "bg-accent-primary text-black"
                : "border border-white/60 text-transparent"
            )}
            aria-hidden
          >
            ✓
          </span>
        </>
      )}

      {photo.processingStatus !== "completed" && (
        <span
          className="absolute left-[6px] bottom-[6px] rounded-[6px] bg-black/70 px-[6px] py-[2px] text-[9px] text-white uppercase tracking-[0.4px]"
        >
          Processing
        </span>
      )}

      {/* Video indicator */}
      {isVideoFile(photo.filename) && (
        <span
          className={cn(
            "absolute left-[6px] top-[6px]",
            "flex h-[22px] w-[22px] items-center justify-center rounded-full",
            "bg-black/60 text-white text-[10px]"
          )}
          aria-label="Video"
        >
          ▶
        </span>
      )}
    </button>
  );
}
