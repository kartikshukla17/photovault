"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { IconPlus } from "@/components/vault/icons";
import { cn } from "@/lib/cn";
import { useVault } from "@/lib/vault/vault-context";

interface AddToAlbumModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (albumId: string) => void;
}

export function AddToAlbumModal({
  open,
  onClose,
  onSelect,
}: AddToAlbumModalProps) {
  const vault = useVault();
  const [showCreate, setShowCreate] = React.useState(false);
  const [newAlbumName, setNewAlbumName] = React.useState("");

  const albums = vault.albums.filter((a) => a.id !== "all");

  const handleCreate = () => {
    if (!newAlbumName.trim()) return;
    const album = vault.createAlbum(newAlbumName.trim());
    setNewAlbumName("");
    setShowCreate(false);
    onSelect(album.id);
  };

  const handleClose = () => {
    setShowCreate(false);
    setNewAlbumName("");
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[200]",
        "bg-black/88 backdrop-blur-[14px]",
        "flex items-center justify-center p-[24px]"
      )}
      onClick={handleClose}
    >
      <div
        className={cn(
          "w-full max-w-[400px]",
          "bg-[#0c0c0c] border border-bg-border rounded-[20px]",
          "shadow-[0_40px_80px_rgba(0,0,0,0.7)]",
          "animate-[pvModalIn_200ms_ease-out_both]",
          "max-h-[70vh] flex flex-col"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-bg-border">
          <h3 className="font-display text-[18px] font-bold text-text-primary">
            Add to Album
          </h3>
          <p className="mt-1 text-[12px] text-text-secondary">
            Select an album or create a new one
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {showCreate ? (
            <div className="p-2">
              <input
                type="text"
                value={newAlbumName}
                onChange={(e) => setNewAlbumName(e.target.value)}
                placeholder="Album name"
                autoFocus
                className={cn(
                  "w-full px-3 py-2.5 rounded-[10px]",
                  "bg-bg-elevated border border-bg-border",
                  "text-[14px] text-text-primary",
                  "placeholder:text-text-muted",
                  "outline-none focus:border-accent-primary/50"
                )}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") setShowCreate(false);
                }}
              />
              <div className="mt-3 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  onClick={handleCreate}
                  disabled={!newAlbumName.trim()}
                >
                  Create
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Create new album button */}
              <button
                onClick={() => setShowCreate(true)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-[12px]",
                  "bg-bg-elevated border border-dashed border-bg-border",
                  "text-accent-primary hover:border-accent-primary/30",
                  "transition-colors duration-150"
                )}
              >
                <div className="h-10 w-10 rounded-[10px] bg-accent-glow flex items-center justify-center">
                  <IconPlus className="h-5 w-5" />
                </div>
                <span className="text-[14px] font-semibold">New Album</span>
              </button>

              {/* Existing albums */}
              <div className="mt-2 space-y-1">
                {albums.map((album) => {
                  const coverPhoto = vault.photos.find(
                    (p) => p.id === album.photoIds[0]
                  );
                  return (
                    <button
                      key={album.id}
                      onClick={() => onSelect(album.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-[12px]",
                        "hover:bg-bg-elevated transition-colors duration-150",
                        "text-left"
                      )}
                    >
                      <div className="h-10 w-10 rounded-[10px] bg-bg-border overflow-hidden flex-shrink-0">
                        {coverPhoto ? (
                          <img
                            src={coverPhoto.thumbUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-text-muted text-[16px]">
                            📁
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-semibold text-text-primary truncate">
                          {album.name}
                        </div>
                        <div className="text-[12px] text-text-secondary">
                          {album.photoIds.length} photos
                        </div>
                      </div>
                    </button>
                  );
                })}

                {albums.length === 0 && (
                  <div className="py-8 text-center text-[13px] text-text-muted">
                    No albums yet
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="p-3 border-t border-bg-border">
          <Button variant="secondary" className="w-full" onClick={handleClose}>
            Cancel
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
