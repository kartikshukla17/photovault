"use client";

import * as React from "react";
import type { VaultPhoto, VaultAlbum } from "./types";

interface VaultState {
  photos: VaultPhoto[];
  albums: VaultAlbum[];
  selectedAlbum: string | null;
  loading: boolean;
}

interface VaultContextValue extends VaultState {
  // Photo actions
  deletePhoto: (id: string) => void;
  deletePhotos: (ids: string[]) => void;

  // Album actions
  setSelectedAlbum: (albumId: string | null) => void;
  createAlbum: (name: string) => Promise<VaultAlbum>;
  deleteAlbum: (id: string) => void;
  addPhotosToAlbum: (albumId: string, photoIds: string[]) => void;
  removePhotoFromAlbum: (albumId: string, photoId: string) => void;

  // Computed
  getFilteredPhotos: () => VaultPhoto[];
  getAlbumById: (id: string) => VaultAlbum | undefined;
  getPendingPhotos: () => VaultPhoto[];
  getBackedUpCount: () => number;
}

const VaultContext = React.createContext<VaultContextValue | null>(null);

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [photos, setPhotos] = React.useState<VaultPhoto[]>([]);
  const [albums, setAlbums] = React.useState<VaultAlbum[]>([]);
  const [selectedAlbum, setSelectedAlbum] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Fetch photos and albums from API on mount
  React.useEffect(() => {
    async function fetchData() {
      try {
        const [photosRes, albumsRes] = await Promise.all([
          fetch("/api/photos"),
          fetch("/api/albums"),
        ]);

        if (photosRes.ok) {
          const data = await photosRes.json();
          // Parse takenAt strings into Date objects
          const photos = (data.photos || []).map((p: Record<string, unknown>) => ({
            ...p,
            takenAt: new Date(p.takenAt as string),
          }));
          setPhotos(photos);
        }

        if (albumsRes.ok) {
          const data = await albumsRes.json();
          // Add "All Photos" album at the beginning
          setAlbums([
            { id: "all", name: "All Photos", photoIds: [] },
            ...(data.albums || []),
          ]);
        }
      } catch (error) {
        console.error("Error fetching vault data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const deletePhoto = React.useCallback((id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    setAlbums((prev) =>
      prev.map((a) => ({
        ...a,
        photoIds: a.photoIds.filter((pid) => pid !== id),
      }))
    );
  }, []);

  const deletePhotos = React.useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setPhotos((prev) => prev.filter((p) => !idSet.has(p.id)));
    setAlbums((prev) =>
      prev.map((a) => ({
        ...a,
        photoIds: a.photoIds.filter((pid) => !idSet.has(pid)),
      }))
    );
  }, []);

  const createAlbum = React.useCallback(async (name: string): Promise<VaultAlbum> => {
    if (!name.trim()) {
      throw new Error("Album name is required");
    }

    const response = await fetch("/api/albums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const payload = await response.json();
      throw new Error(payload.error || "Failed to create album");
    }

    const { album } = await response.json();
    setAlbums((prev) => [...prev, album]);
    return album;
  }, []);

  const deleteAlbum = React.useCallback((id: string) => {
    if (id === "all") return; // Can't delete "All Photos"
    setAlbums((prev) => prev.filter((a) => a.id !== id));
    if (selectedAlbum === id) {
      setSelectedAlbum(null);
    }
  }, [selectedAlbum]);

  const addPhotosToAlbum = React.useCallback((albumId: string, photoIds: string[]) => {
    setAlbums((prev) =>
      prev.map((a) => {
        if (a.id !== albumId) return a;
        const existing = new Set(a.photoIds);
        const newIds = photoIds.filter((id) => !existing.has(id));
        return { ...a, photoIds: [...a.photoIds, ...newIds] };
      })
    );
  }, []);

  const removePhotoFromAlbum = React.useCallback((albumId: string, photoId: string) => {
    setAlbums((prev) =>
      prev.map((a) => {
        if (a.id !== albumId) return a;
        return { ...a, photoIds: a.photoIds.filter((id) => id !== photoId) };
      })
    );
  }, []);

  const getFilteredPhotos = React.useCallback(() => {
    if (!selectedAlbum || selectedAlbum === "all") {
      return photos;
    }
    const album = albums.find((a) => a.id === selectedAlbum);
    if (!album) return photos;
    const photoIdSet = new Set(album.photoIds);
    return photos.filter((p) => photoIdSet.has(p.id));
  }, [photos, albums, selectedAlbum]);

  const getAlbumById = React.useCallback(
    (id: string) => albums.find((a) => a.id === id),
    [albums]
  );

  const getPendingPhotos = React.useCallback(
    () => photos.filter((p) => !p.backedUp),
    [photos]
  );

  const getBackedUpCount = React.useCallback(
    () => photos.filter((p) => p.backedUp).length,
    [photos]
  );

  const value: VaultContextValue = {
    photos,
    albums,
    selectedAlbum,
    loading,
    deletePhoto,
    deletePhotos,
    setSelectedAlbum,
    createAlbum,
    deleteAlbum,
    addPhotosToAlbum,
    removePhotoFromAlbum,
    getFilteredPhotos,
    getAlbumById,
    getPendingPhotos,
    getBackedUpCount,
  };

  return (
    <VaultContext.Provider value={value}>{children}</VaultContext.Provider>
  );
}

export function useVault() {
  const context = React.useContext(VaultContext);
  if (!context) {
    throw new Error("useVault must be used within a VaultProvider");
  }
  return context;
}
