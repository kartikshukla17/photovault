"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/vault/confirm-modal";
import { cn } from "@/lib/cn";
import { useUploadSheet } from "@/components/vault/use-upload-sheet";
import { useVault } from "@/lib/vault/vault-context";

const ALBUM_ICONS: Record<string, string> = {
  trips: "✈",
  family: "♥",
  work: "◈",
  screenshots: "◻",
};

function AlbumCard({
  name,
  count,
  coverUrl,
  icon,
  onClick,
  onLongPress,
}: {
  name: string;
  count: number;
  coverUrl: string;
  icon?: string;
  onClick: () => void;
  onLongPress?: () => void;
}) {
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = () => {
    if (onLongPress) {
      timerRef.current = setTimeout(() => {
        onLongPress();
      }, 500);
    }
  };

  const handleTouchEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <button
      className={cn(
        "album-tile relative overflow-hidden rounded-[14px]",
        "bg-[#0d0d0d] border border-bg-border",
        "cursor-pointer transition-all duration-220",
        "shadow-[0_4px_20px_rgba(0,0,0,0.3)]",
        "text-left"
      )}
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div className="aspect-[4/3] relative overflow-hidden">
        <img
          src={coverUrl}
          alt=""
          className="w-full h-full object-cover transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgba(0,0,0,0.75)_100%)]" />
        {icon && (
          <div
            className={cn(
              "absolute top-[10px] left-[10px]",
              "bg-black/55 backdrop-blur-[8px] rounded-[7px]",
              "px-[9px] py-[5px] text-[16px]"
            )}
          >
            {icon}
          </div>
        )}
      </div>
      <div className="px-[14px] py-[12px]">
        <div className="font-semibold text-[13px] text-text-primary mb-[2px]">
          {name}
        </div>
        <div className="text-[11px] text-text-muted">{count} photos</div>
      </div>
    </button>
  );
}

function CreateAlbumModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}) {
  const [name, setName] = React.useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await onCreate(name.trim());
      setName("");
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to create album");
    }
  };

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[200]",
        "bg-black/88 backdrop-blur-[14px]",
        "flex items-center justify-center p-[24px]"
      )}
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full max-w-[400px]",
          "bg-[#0c0c0c] border border-bg-border rounded-[20px]",
          "shadow-[0_40px_80px_rgba(0,0,0,0.7)]"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-[26px] pt-[22px] pb-[18px] border-b border-bg-border">
          <div className="font-display text-[19px] text-text-primary tracking-[-0.3px]">
            New Album
          </div>
          <div className="text-[11px] text-text-muted mt-[2px]">
            Give your album a name
          </div>
        </div>

        <div className="p-[24px]">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Album name"
            autoFocus
            className={cn(
              "w-full px-[12px] py-[11px] rounded-[10px]",
              "bg-bg-elevated border border-bg-border",
              "text-[14px] text-text-primary",
              "placeholder:text-text-muted",
              "outline-none focus:border-accent-primary/40"
            )}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") onClose();
            }}
          />

          <div className="mt-[14px] flex gap-[10px]">
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleCreate}
              disabled={!name.trim()}
            >
              Create Album
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AlbumsClient() {
  const router = useRouter();
  const vault = useVault();
  const { openSheet } = useUploadSheet();
  const [showCreate, setShowCreate] = React.useState(false);
  const [albumToDelete, setAlbumToDelete] = React.useState<string | null>(null);

  const albums = vault.albums.filter((a) => a.id !== "all");
  const photosById = new Map(vault.photos.map((p) => [p.id, p]));

  const handleAlbumClick = (albumId: string) => {
    router.push(`/gallery?album=${albumId}`);
  };

  const handleCreateAlbum = async (name: string) => {
    await vault.createAlbum(name);
  };

  const handleDeleteAlbum = () => {
    if (albumToDelete) {
      vault.deleteAlbum(albumToDelete);
      setAlbumToDelete(null);
    }
  };

  const albumToDeleteName = albumToDelete
    ? albums.find((a) => a.id === albumToDelete)?.name
    : "";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 px-4 md:px-[26px] py-3 md:py-[14px] border-b border-bg-elevated bg-[#090909] flex items-center justify-between">
        <div className="font-display text-[18px] md:text-[20px] text-text-primary tracking-[-0.3px]">
          Albums
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className={cn(
            "px-3 md:px-[14px] py-2 md:py-[7px] rounded-[8px]",
            "bg-bg-elevated border border-bg-border",
            "text-text-muted text-[12px]",
            "hover:border-accent-primary/30 hover:text-accent-primary",
            "transition-all"
          )}
        >
          + New
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 md:p-[26px]">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3 md:gap-[14px]">
          {albums.map((album) => {
            const cover = photosById.get(album.photoIds[0] ?? "");
            const icon = ALBUM_ICONS[album.name.toLowerCase()];
            return (
              <div key={album.id} className="relative">
                <AlbumCard
                  name={album.name}
                  count={album.photoIds.length}
                  coverUrl={
                    cover?.thumbUrl ?? "https://picsum.photos/seed/999/400/400"
                  }
                  icon={icon}
                  onClick={() => handleAlbumClick(album.id)}
                  onLongPress={() => setAlbumToDelete(album.id)}
                />
                <button
                  type="button"
                  onClick={() => openSheet("idle", { albumId: album.id })}
                  className="absolute bottom-[16px] right-[16px] rounded-[10px] bg-black/70 px-[10px] py-[6px] text-[11px] text-white border border-white/20"
                >
                  ⬆ Upload
                </button>
              </div>
            );
          })}

          {/* New Album Card */}
          <button
            onClick={() => setShowCreate(true)}
            className={cn(
              "rounded-[14px] border-2 border-dashed border-bg-border",
              "flex flex-col items-center justify-center min-h-[160px]",
              "text-text-caption gap-[6px]",
              "cursor-pointer transition-colors duration-200",
              "hover:border-accent-primary/30 hover:text-accent-primary"
            )}
          >
            <div className="text-[26px]">+</div>
            <div className="text-[11px]">New Album</div>
          </button>
        </div>
      </div>

      <CreateAlbumModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreateAlbum}
      />

      <ConfirmModal
        open={Boolean(albumToDelete)}
        title="Delete Album"
        message={`Are you sure you want to delete "${albumToDeleteName}"? The photos will not be deleted.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteAlbum}
        onCancel={() => setAlbumToDelete(null)}
      />
    </div>
  );
}
