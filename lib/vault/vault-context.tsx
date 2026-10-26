"use client";

import * as React from "react";
import type { VaultPhoto, VaultAlbum } from "./types";

type PhotoApiResponse = {
  photos?: Array<{
    id: string;
    filename: string;
    sizeBytes: number;
    takenAt: string;
    device: string;
    location: string;
    width: number;
    height: number;
    backedUp: boolean;
    thumbUrl?: string;
    previewUrl?: string;
    originalUrl?: string;
    processingStatus?: string;
  }>;
};

interface VaultState {
  photos: VaultPhoto[];
  albums: VaultAlbum[];
  selectedAlbum: string | null;
  loading: boolean;
}

interface VaultContextValue extends VaultState {
  // Photo actions
  deletePhoto: (id: string) => Promise<void>;
  deletePhotos: (ids: string[]) => Promise<void>;

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
  const photosRef = React.useRef<VaultPhoto[]>([]);

  React.useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  const fetchPhotos = React.useCallback(async () => {
    try {
      const res = await fetch("/api/photos");
      if (!res.ok) throw new Error("Failed to load photos");
      const data = (await res.json()) as PhotoApiResponse;
      const fetched = (data.photos || []).map((p) => ({
        ...p,
        takenAt: new Date(p.takenAt),
        thumbUrl: p.thumbUrl ?? "",
        previewUrl: p.previewUrl ?? "",
        originalUrl: p.originalUrl ?? "",
        processingStatus: p.processingStatus ?? "completed",
      }));
      setPhotos(fetched);
    } catch (error) {
      console.error("Error fetching photos:", error);
    }
  }, []);

  const fetchAlbums = React.useCallback(async () => {
    try {
      const res = await fetch("/api/albums");
      if (!res.ok) throw new Error("Failed to load albums");
      const data = await res.json();
      setAlbums([
        { id: "all", name: "All Photos", photoIds: photosRef.current.map((p) => p.id) },
        ...(data.albums || []),
      ]);
    } catch (error) {
      console.error("Error fetching albums:", error);
    }
  }, []);

  // Fetch photos and albums from API on mount
  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      await Promise.all([fetchPhotos(), fetchAlbums()]);
      if (mounted) setLoading(false);
    };
    load();
    return () => {
      mounted = false;
    };
  }, [fetchPhotos, fetchAlbums]);

  // Keep the synthetic "All Photos" album in sync with the photo library without refetching.
  React.useEffect(() => {
    setAlbums((prev) => {
      const allAlbum: VaultAlbum = {
        id: "all",
        name: "All Photos",
        photoIds: photos.map((p) => p.id),
      };
      const rest = prev.filter((a) => a.id !== "all");
      return [allAlbum, ...rest];
    });
  }, [photos]);

  React.useEffect(() => {
    const onPhotoAdded = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (!detail?.photo) return;
      // The upload flow may dispatch a raw DB row (snake_case + taken_at string).
      // Avoid inserting inconsistent shapes into state (can crash grouping/render).
      // Instead, re-fetch the library which normalizes dates + signed URLs.
      fetchPhotos();
    };

    const onAlbumUpdated = () => {
      fetchAlbums();
    };

    window.addEventListener("pv:photo-added", onPhotoAdded);
    window.addEventListener("pv:album-updated", onAlbumUpdated);

    return () => {
      window.removeEventListener("pv:photo-added", onPhotoAdded);
      window.removeEventListener("pv:album-updated", onAlbumUpdated);
    };
  }, [fetchAlbums, fetchPhotos]);

  const deletePhoto = React.useCallback(async (id: string) => {
    const response = await fetch(`/api/photos/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Failed to delete photo" }));
      throw new Error(payload.error ?? "Failed to delete photo");
    }

    setPhotos((prev) => prev.filter((p) => p.id !== id));
    setAlbums((prev) =>
      prev.map((a) => ({
        ...a,
        photoIds: a.photoIds.filter((pid) => pid !== id),
      }))
    );
  }, []);

  const deletePhotos = React.useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    const results = await Promise.allSettled(ids.map((id) => deletePhoto(id)));
    const rejection = results.find((result) => result.status === "rejected");
    if (rejection && rejection.status === "rejected") {
      throw rejection.reason;
    }
  }, [deletePhoto]);

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
