"use client";

import Image from "next/image";
import type { VaultPhoto } from "@/lib/vault/types";
import { cn } from "@/lib/cn";

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
      <Image
        src={photo.thumbUrl}
        alt=""
        fill
        sizes="(max-width: 430px) 33vw, 143px"
        className="object-cover"
      />

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
    </button>
  );
}
