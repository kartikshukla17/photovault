"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Virtuoso } from "react-virtuoso";

import { PhotoThumb } from "@/components/vault/gallery/photo-thumb";
import { PhotoViewer } from "@/components/vault/gallery/photo-viewer";
import { SelectionToolbar } from "@/components/vault/gallery/selection-toolbar";
import { useUploadSheet } from "@/components/vault/use-upload-sheet";
import { cn } from "@/lib/cn";
import { withSearchParams } from "@/lib/search-params";
import { groupPhotosByMonth } from "@/lib/vault/group-by-month";
import { useVault } from "@/lib/vault/vault-context";
import { AddToAlbumModal } from "@/components/vault/add-to-album-modal";
import { ConfirmModal } from "@/components/vault/confirm-modal";
import type { VaultPhoto } from "@/lib/vault/types";

export default function GalleryClient() {
  const { openSheet } = useUploadSheet();
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const vault = useVault();

  const [query, setQuery] = React.useState("");
  const [selectMode, setSelectMode] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set());
  const [showAddToAlbum, setShowAddToAlbum] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [photoToDelete, setPhotoToDelete] = React.useState<string | null>(null);
  const [columnsPerRow, setColumnsPerRow] = React.useState(4);

  const photoId = params.get("photo");
  const infoMode = params.get("info") === "1";
  const albumParam = params.get("album");
  const viewerOpen = Boolean(photoId);
  const uploadLabel = albumParam && albumParam !== "all" ? "Upload to album" : "Upload";

  // Set selected album from URL param
  React.useEffect(() => {
    vault.setSelectedAlbum(albumParam);
  }, [albumParam, vault]);

  const allPhotos = vault.photos;
  const filteredByAlbum = vault.getFilteredPhotos();

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return filteredByAlbum;
    return filteredByAlbum.filter(
      (p) =>
        p.filename.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        p.device.toLowerCase().includes(q)
    );
  }, [filteredByAlbum, query]);

  const groups = groupPhotosByMonth(filtered);

  // Build virtualized rows: headers + photo rows
  type VirtualRow =
    | { type: "header"; key: string; label: string; count: number }
    | { type: "photos"; key: string; photos: VaultPhoto[] };

  const virtualRows = React.useMemo(() => {
    const rows: VirtualRow[] = [];
    for (const group of groups) {
      rows.push({
        type: "header",
        key: `header-${group.key}`,
        label: group.label,
        count: group.photos.length,
      });
      // Split photos into rows based on columnsPerRow
      for (let i = 0; i < group.photos.length; i += columnsPerRow) {
        rows.push({
          type: "photos",
          key: `row-${group.key}-${i}`,
          photos: group.photos.slice(i, i + columnsPerRow),
        });
      }
    }
    return rows;
  }, [groups, columnsPerRow]);

  // Update columns based on container width
  const containerRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const updateColumns = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth - 52; // account for padding
      if (width < 400) setColumnsPerRow(3);
      else if (width < 600) setColumnsPerRow(4);
      else if (width < 900) setColumnsPerRow(5);
      else if (width < 1200) setColumnsPerRow(6);
      else setColumnsPerRow(Math.floor(width / 160));
    };
    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, []);

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const closeViewer = () => {
    router.replace(
      withSearchParams(pathname, params, { photo: null, info: null }),
      { scroll: false }
    );
  };

  const openViewer = (id: string) => {
    router.replace(withSearchParams(pathname, params, { photo: id }), {
      scroll: false,
    });
  };

  const setViewerPhotoId = (id: string) => {
    router.replace(withSearchParams(pathname, params, { photo: id }), {
      scroll: false,
    });
  };

  const toggleInfo = () => {
    router.replace(
      withSearchParams(pathname, params, { info: infoMode ? null : "1" }),
      { scroll: false }
    );
  };

  const clearSelection = () => {
    setSelected(new Set());
    setSelectMode(false);
  };

  const setAlbumFilter = (albumId: string | null) => {
    router.replace(
      withSearchParams(pathname, params, {
        album: albumId === "all" ? null : albumId,
      }),
      { scroll: false }
    );
  };

  const handleDeleteSelected = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteError = (error: unknown) => {
    console.error("Delete error:", error);
    alert(error instanceof Error ? error.message : "Failed to delete photo(s)");
  };

  const confirmDeleteSelected = () => {
    setShowDeleteConfirm(false);
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    vault
      .deletePhotos(ids)
      .then(() => {
        clearSelection();
      })
      .catch(handleDeleteError);
  };

  const handleDeletePhoto = (id: string) => {
    setPhotoToDelete(id);
  };

  const confirmDeletePhoto = () => {
    if (!photoToDelete) return;
    const id = photoToDelete;
    vault
      .deletePhoto(id)
      .then(() => {
        setPhotoToDelete(null);
        closeViewer();
      })
      .catch(handleDeleteError);
  };

  const handleAddToAlbum = () => {
    setShowAddToAlbum(true);
  };

  const handleAddPhotosToAlbum = (albumId: string) => {
    if (photoId) {
      vault.addPhotosToAlbum(albumId, [photoId]);
    } else if (selected.size > 0) {
      vault.addPhotosToAlbum(albumId, Array.from(selected));
      clearSelection();
    }
    setShowAddToAlbum(false);
  };

  // Album pills data
  const albumPills = [
    { id: "all", name: "All Photos", count: allPhotos.length },
    ...vault.albums
      .filter((a) => a.id !== "all")
      .map((a) => ({
        id: a.id,
        name: a.name,
        count: a.photoIds.length,
      })),
  ];

  const currentAlbumId = albumParam ?? "all";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top Header Bar */}
      <header className="flex-shrink-0 px-4 md:px-[26px] py-3 md:py-[14px] border-b border-bg-elevated bg-[#090909]">
        {/* Mobile: Title + Actions Row */}
        <div className="flex items-center justify-between gap-3 md:hidden mb-3">
          <h1 className="font-display text-[18px] text-text-primary">Photos</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectMode((v) => !v);
                setSelected(new Set());
              }}
              className={cn(
                "px-3 py-2 rounded-lg text-[12px] transition-all",
                selectMode
                  ? "bg-accent-glow border border-accent-primary/25 text-accent-primary"
                  : "bg-bg-elevated border border-bg-border text-text-muted"
              )}
            >
              {selectMode ? `✓ ${selected.size}` : "Select"}
            </button>
            <button
              onClick={() => openSheet("idle")}
              className={cn(
                "p-2 rounded-lg",
                "bg-[linear-gradient(135deg,#c8a97e,#9a6835)]",
                "text-white text-[16px]",
                "shadow-[0_4px_16px_rgba(200,169,126,0.15)]",
                "active:scale-[0.98]"
              )}
            >
              ⬆
            </button>
          </div>
        </div>

        {/* Search - Full width on mobile */}
        <div className="flex items-center gap-3 md:gap-[14px]">
          <div className="flex-1 relative md:max-w-[380px]">
            <span className="absolute left-[11px] top-1/2 -translate-y-1/2 text-text-caption text-[14px] pointer-events-none">
              ⌕
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className={cn(
                "w-full py-[8px] pl-[32px] pr-[12px]",
                "bg-bg-elevated border border-bg-border rounded-[9px]",
                "text-[12px] text-text-secondary placeholder:text-text-muted",
                "outline-none focus:border-accent-primary/40 transition-colors"
              )}
            />
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-[7px]">
            {selectMode && selected.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                className={cn(
                  "px-[14px] py-[7px] rounded-[8px]",
                  "bg-danger/10 border border-danger/25",
                  "text-danger text-[12px]"
                )}
              >
                Delete {selected.size}
              </button>
            )}

            <button
              onClick={() => {
                setSelectMode((v) => !v);
                setSelected(new Set());
              }}
              className={cn(
                "px-[12px] py-[7px] rounded-[8px] text-[12px] transition-all",
                selectMode
                  ? "bg-accent-glow border border-accent-primary/25 text-accent-primary"
                  : "bg-bg-elevated border border-bg-border text-text-muted"
              )}
            >
              {selectMode ? `✓ ${selected.size} selected` : "Select"}
            </button>

            <button
              onClick={() =>
                openSheet(
                  "idle",
                  albumParam && albumParam !== "all" ? { albumId: albumParam } : undefined,
                )
              }
              className={cn(
                "px-[16px] py-[8px] rounded-[8px]",
                "bg-[linear-gradient(135deg,#c8a97e,#9a6835)]",
                "text-white text-[12px] font-bold",
                "flex items-center gap-[5px]",
                "shadow-[0_4px_16px_rgba(200,169,126,0.15)]",
                "active:scale-[0.98]"
              )}
            >
              ⬆ {uploadLabel}
            </button>
          </div>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Album Filter Pills */}
        <div className="px-4 md:px-[26px] pt-3 md:pt-[14px] pb-[2px] flex gap-2 md:gap-[7px] overflow-x-auto scrollbar-hide">
          {albumPills.map((album) => (
            <button
              key={album.id}
              onClick={() => setAlbumFilter(album.id)}
              className={cn(
                "pill flex-shrink-0 px-3 md:px-[13px] py-[5px] rounded-[20px] text-[11px] md:text-[12px]",
                "border transition-all whitespace-nowrap",
                currentAlbumId === album.id
                  ? "bg-accent-glow border-accent-primary/35 text-accent-primary"
                  : "bg-transparent border-bg-border text-text-muted"
              )}
            >
              {album.name} <span className="opacity-50">{album.count}</span>
            </button>
          ))}
        </div>

        {/* Selection Toolbar */}
        {selectMode && selected.size > 0 && (
          <div className="px-4 md:px-[26px] pt-4 md:pt-[16px]">
            <SelectionToolbar
              count={selected.size}
              onClear={clearSelection}
              onDelete={handleDeleteSelected}
              onAddToAlbum={handleAddToAlbum}
            />
          </div>
        )}

        {/* Photo Grid - Virtualized */}
        <div ref={containerRef} className="flex-1 min-h-0">
          {filtered.length === 0 ? (
            <div className="px-4 md:px-[26px] py-[60px] md:py-[80px] text-center text-text-caption">
              <div className="text-[40px] mb-[12px]">⌕</div>
              <div className="text-[14px]">
                {query
                  ? `No photos match "${query}"`
                  : currentAlbumId !== "all"
                  ? "No photos in this album"
                  : "No photos yet"}
              </div>
            </div>
          ) : (
            <Virtuoso
              style={{ height: "100%" }}
              totalCount={virtualRows.length}
              overscan={200}
              itemContent={(index) => {
                const row = virtualRows[index];
                if (row.type === "header") {
                  return (
                    <div className="flex items-baseline gap-[9px] pt-4 md:pt-[22px] mb-2 md:mb-[12px] px-4 md:px-[26px]">
                      <div className="font-display text-[14px] md:text-[16px] text-text-primary tracking-[-0.2px]">
                        {row.label}
                      </div>
                      <div className="text-[10px] md:text-[11px] text-text-caption">
                        {row.count} photos
                      </div>
                    </div>
                  );
                }
                return (
                  <div
                    className="grid gap-[2px] md:gap-[3px] px-2 md:px-[26px]"
                    style={{
                      gridTemplateColumns: `repeat(${columnsPerRow}, 1fr)`,
                    }}
                  >
                    {row.photos.map((photo) => (
                      <PhotoThumb
                        key={photo.id}
                        photo={photo}
                        selectMode={selectMode}
                        selected={selected.has(photo.id)}
                        onToggleSelect={() => toggleSelected(photo.id)}
                        onOpen={() => openViewer(photo.id)}
                      />
                    ))}
                  </div>
                );
              }}
            />
          )}
        </div>
      </div>

      {/* Photo Viewer */}
      <PhotoViewer
        open={viewerOpen}
        photos={filtered}
        photoId={photoId}
        infoMode={infoMode}
        onClose={closeViewer}
        onSetPhotoId={setViewerPhotoId}
        onToggleInfo={toggleInfo}
        onDelete={handleDeletePhoto}
        onAddToAlbum={() => setShowAddToAlbum(true)}
      />

      {/* Modals */}
      <AddToAlbumModal
        open={showAddToAlbum}
        onClose={() => setShowAddToAlbum(false)}
        onSelect={handleAddPhotosToAlbum}
      />

      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete Photos"
        message={`Are you sure you want to delete ${selected.size} photo${selected.size > 1 ? "s" : ""}? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={confirmDeleteSelected}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ConfirmModal
        open={Boolean(photoToDelete)}
        title="Delete Photo"
        message="Are you sure you want to delete this photo? This action cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={confirmDeletePhoto}
        onCancel={() => setPhotoToDelete(null)}
      />
    </div>
  );
}
