"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/format";
import { getMediaMetadata, isVideoFile } from "@/lib/image/metadata";
import { createImageVariants } from "@/lib/image/variants";

/* ── Types ── */

interface SharedFile {
  file: File;
  preview: string;
}

interface Album {
  id: string;
  name: string;
  photoIds: string[];
}

interface UploadInfo {
  photoId: string;
  filename: string;
  uploadUrl: string;
  uploadUrls?: { original: string; preview?: string; thumb?: string };
  keys: { original: string; preview: string; thumb: string };
}

type Step = "picking" | "uploading" | "done" | "error";

/* ── Helpers ── */

function guessContentType(filename: string): string {
  const ext = filename.slice(filename.lastIndexOf(".") + 1).toLowerCase();
  const map: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
    heic: "image/heic", heif: "image/heif", gif: "image/gif",
    mp4: "video/mp4", mov: "video/quicktime", avi: "video/x-msvideo",
    webm: "video/webm", mkv: "video/x-matroska", "3gp": "video/3gpp", m4v: "video/x-m4v",
  };
  return map[ext] || "application/octet-stream";
}

async function loadSharedFiles(): Promise<File[]> {
  const cache = await caches.open("pv-share-target");
  const metaResp = await cache.match("/share-target/meta");
  if (!metaResp) return [];

  const { count } = await metaResp.json();
  const files: File[] = [];

  for (let i = 0; i < count; i++) {
    const resp = await cache.match(`/share-target/file/${i}`);
    if (!resp) continue;
    const blob = await resp.blob();
    const filename = resp.headers.get("X-Filename") || `shared-${i}`;
    const type = resp.headers.get("Content-Type") || guessContentType(filename);
    files.push(new File([blob], filename, { type }));
  }

  // Clean up cache
  await caches.delete("pv-share-target");
  return files;
}

/* ── Component ── */

export default function ShareUploadClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sharedFiles, setSharedFiles] = React.useState<SharedFile[]>([]);
  const [albums, setAlbums] = React.useState<Album[]>([]);
  const [selectedAlbum, setSelectedAlbum] = React.useState<string | null>(null);
  const [step, setStep] = React.useState<Step>("picking");
  const [progress, setProgress] = React.useState(0);
  const [uploadedCount, setUploadedCount] = React.useState(0);
  const [errorMsg, setErrorMsg] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  // Load shared files from service worker cache + fetch albums
  React.useEffect(() => {
    const shareError = searchParams.get("share_error");
    if (shareError) {
      const message =
        shareError === "quota"
          ? "This file is too large for your device storage. Free up space or open the app and upload it directly."
          : "The share couldn't be processed by the app. Open Photo Vault and upload the file directly.";
      setErrorMsg(message);
      setStep("error");
      setLoading(false);
      return;
    }

    Promise.all([loadSharedFiles(), fetch("/api/albums").then((r) => r.json())])
      .then(([files, albumData]) => {
        if (files.length === 0) {
          // If the server fallback uploaded files directly, it redirects here
          // with ?share_uploaded=N. Forward to the gallery in that case.
          const uploaded = searchParams.get("share_uploaded");
          if (uploaded) {
            router.replace(`/gallery?share_uploaded=${uploaded}`);
            return;
          }
          router.replace("/gallery");
          return;
        }
        setSharedFiles(
          files.map((file) => ({ file, preview: URL.createObjectURL(file) })),
        );
        setAlbums(albumData.albums || []);
        setLoading(false);
      })
      .catch(() => {
        router.replace("/gallery");
      });
  }, [router, searchParams]);

  // Cleanup previews on unmount
  React.useEffect(() => {
    return () => sharedFiles.forEach((f) => URL.revokeObjectURL(f.preview));
  }, [sharedFiles]);

  const handleUpload = async () => {
    setStep("uploading");
    setProgress(0);
    setUploadedCount(0);

    try {
      const serverSideProcessing =
        (process.env.NEXT_PUBLIC_UPLOAD_SERVER_SIDE_PROCESSING ?? "false").toLowerCase() === "true";

      const filePayloads = sharedFiles.map(({ file }) => ({
        filename: file.name,
        contentType: file.type || guessContentType(file.name),
        size: file.size,
      }));

      const presignedRes = await fetch("/api/upload/presigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: filePayloads, serverSideProcessing }),
      });

      if (!presignedRes.ok) {
        const err = await presignedRes.json();
        throw new Error(err.error || "Failed to get upload URLs");
      }

      const { uploads } = (await presignedRes.json()) as { uploads: UploadInfo[] };
      const uploadedIds: string[] = [];

      for (let i = 0; i < sharedFiles.length; i++) {
        const { file } = sharedFiles[i];
        const uploadInfo = uploads[i];
        const contentType = file.type || guessContentType(file.name);
        const isVideo = isVideoFile(file);

        setProgress(Math.round(((i) / sharedFiles.length) * 100));

        const metadata = await getMediaMetadata(file);

        let variants: { preview: Blob; thumb: Blob } | undefined;
        if (!serverSideProcessing && !isVideo) {
          const v = await createImageVariants(file);
          variants = { preview: v.preview, thumb: v.thumb };
        }

        // Upload original
        const uploadOrigRes = await fetch(uploadInfo.uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": contentType },
        });
        if (!uploadOrigRes.ok) throw new Error(`S3 upload failed (${uploadOrigRes.status})`);

        // Upload variants
        if (!serverSideProcessing && !isVideo && variants) {
          const previewUrl = uploadInfo.uploadUrls?.preview;
          const thumbUrl = uploadInfo.uploadUrls?.thumb;
          if (previewUrl && thumbUrl) {
            await Promise.all([
              fetch(previewUrl, { method: "PUT", body: variants.preview, headers: { "Content-Type": "image/webp" } }),
              fetch(thumbUrl, { method: "PUT", body: variants.thumb, headers: { "Content-Type": "image/webp" } }),
            ]);
          }
        }

        const needsProcessing = serverSideProcessing || isVideo;

        const photoRes = await fetch("/api/photos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: uploadInfo.photoId,
            filename: file.name,
            sizeBytes: file.size,
            width: metadata.width,
            height: metadata.height,
            takenAt: new Date().toISOString(),
            s3KeyOriginal: uploadInfo.keys.original,
            s3KeyPreview: uploadInfo.keys.preview,
            s3KeyThumb: uploadInfo.keys.thumb,
            processingStatus: needsProcessing ? "pending" : "completed",
          }),
        });

        if (!photoRes.ok) {
          const err = await photoRes.json();
          throw new Error(err.error || "Failed to save photo");
        }

        const { photo } = await photoRes.json();
        if (photo?.id) {
          uploadedIds.push(photo.id);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("pv:photo-added", { detail: { photo } }));
          }
        }

        setUploadedCount(i + 1);
        setProgress(Math.round(((i + 1) / sharedFiles.length) * 100));
      }

      // Add to album if selected
      if (selectedAlbum && uploadedIds.length > 0) {
        await fetch(`/api/albums/${selectedAlbum}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ addPhotoIds: uploadedIds }),
        });
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("pv:album-updated", { detail: { albumId: selectedAlbum } }),
          );
        }
      }

      setStep("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Upload failed");
      setStep("error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-text-muted text-[14px]">Loading shared photos...</div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] p-4">
      <div
        className={cn(
          "w-full max-w-[440px]",
          "rounded-[20px] bg-[#0c0c0c] border border-bg-border",
          "shadow-[0_40px_80px_rgba(0,0,0,0.7)]",
        )}
      >
        {/* ── Album picker step ── */}
        {step === "picking" && (
          <div>
            <div className="px-[26px] py-[22px] border-b border-bg-border">
              <div className="font-display text-[19px] text-text-primary tracking-[-0.3px]">
                Upload {sharedFiles.length} Shared Photo{sharedFiles.length > 1 ? "s" : ""}
              </div>
              <div className="text-[11px] text-text-muted mt-[2px]">
                Choose an album or upload to your vault
              </div>
            </div>

            <div className="p-[24px]">
              {/* File previews */}
              <div className="flex gap-[8px] overflow-x-auto pb-[12px] mb-[16px]">
                {sharedFiles.map((f, i) => (
                  <div
                    key={i}
                    className="relative w-[64px] h-[64px] flex-shrink-0 rounded-[10px] overflow-hidden bg-[#181818] border border-bg-border"
                  >
                    {f.file.type.startsWith("video/") ? (
                      <div className="w-full h-full flex items-center justify-center text-[22px]">
                        🎬
                      </div>
                    ) : (
                      <Image
                        src={f.preview}
                        alt=""
                        fill
                        sizes="64px"
                        unoptimized
                        className="object-cover"
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Album selection */}
              <div className="mb-[16px]">
                <div className="text-[12px] text-text-secondary font-semibold mb-[8px]">
                  Save to album
                </div>

                {/* No album option */}
                <button
                  className={cn(
                    "w-full text-left p-[12px_14px] rounded-[10px] border mb-[6px] transition-colors cursor-pointer",
                    selectedAlbum === null
                      ? "border-accent-primary bg-accent-primary/8 text-text-primary"
                      : "border-bg-border bg-[#141414] text-text-secondary hover:bg-[#181818]",
                  )}
                  onClick={() => setSelectedAlbum(null)}
                >
                  <div className="text-[13px] font-medium">No album</div>
                  <div className="text-[11px] text-text-muted mt-[1px]">
                    Upload to vault without an album
                  </div>
                </button>

                {/* Album list */}
                {albums.length > 0 && (
                  <div className="max-h-[180px] overflow-y-auto flex flex-col gap-[4px]">
                    {albums.map((album) => (
                      <button
                        key={album.id}
                        className={cn(
                          "w-full text-left p-[12px_14px] rounded-[10px] border transition-colors cursor-pointer",
                          selectedAlbum === album.id
                            ? "border-accent-primary bg-accent-primary/8 text-text-primary"
                            : "border-bg-border bg-[#141414] text-text-secondary hover:bg-[#181818]",
                        )}
                        onClick={() => setSelectedAlbum(album.id)}
                      >
                        <div className="text-[13px] font-medium">{album.name}</div>
                        <div className="text-[11px] text-text-muted mt-[1px]">
                          {album.photoIds.length} photo{album.photoIds.length !== 1 ? "s" : ""}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {albums.length === 0 && (
                  <div className="text-[11px] text-text-muted py-[8px]">
                    No albums yet
                  </div>
                )}
              </div>

              {/* File info */}
              <div className="text-[11px] text-text-muted mb-[14px]">
                {sharedFiles.length} file{sharedFiles.length > 1 ? "s" : ""} ·{" "}
                {formatBytes(sharedFiles.reduce((s, f) => s + f.file.size, 0))}
              </div>

              <div className="flex gap-[10px]">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => router.replace("/gallery")}
                >
                  Cancel
                </Button>
                <Button variant="primary" className="flex-1" onClick={handleUpload}>
                  Upload
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Uploading step ── */}
        {step === "uploading" && (
          <div className="p-[24px]">
            <div className="font-display text-[19px] text-text-primary tracking-[-0.3px] mb-[4px]">
              Uploading...
            </div>
            <div className="text-[11px] text-text-muted mb-[18px]">
              {uploadedCount} of {sharedFiles.length} uploaded
            </div>
            <div className="h-[4px] bg-[#222] rounded-[4px] mb-[12px]">
              <div
                className="h-full rounded-[4px] bg-[linear-gradient(90deg,var(--pv-accent-primary),var(--pv-accent-light))] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-[12px] text-text-muted text-center">{progress}%</div>
          </div>
        )}

        {/* ── Done step ── */}
        {step === "done" && (
          <div className="p-[24px]">
            <div className="p-[18px] rounded-[12px] bg-success/5 border border-success/15 text-center">
              <div className="text-[28px] mb-[6px]">✓</div>
              <div className="text-success font-semibold text-[14px] mb-[3px]">
                {sharedFiles.length} photo{sharedFiles.length > 1 ? "s" : ""} backed up!
              </div>
              {selectedAlbum && (
                <div className="text-[11px] text-text-muted mb-[8px]">
                  Added to {albums.find((a) => a.id === selectedAlbum)?.name ?? "album"}
                </div>
              )}
              <Button
                variant="secondary"
                className="mt-[10px]"
                onClick={() => {
                  if (selectedAlbum) {
                    router.replace(`/albums/${selectedAlbum}`);
                  } else {
                    router.replace("/gallery");
                  }
                  window.location.reload();
                }}
              >
                View Photos
              </Button>
            </div>
          </div>
        )}

        {/* ── Error step ── */}
        {step === "error" && (
          <div className="p-[24px]">
            <div className="p-[18px] rounded-[12px] bg-danger/5 border border-danger/15 text-center">
              <div className="text-[28px] mb-[6px]">✕</div>
              <div className="text-danger font-semibold text-[14px] mb-[3px]">
                Upload failed
              </div>
              <div className="text-[11px] text-text-muted mb-[10px]">{errorMsg}</div>
              <div className="flex gap-[10px] justify-center">
                <Button variant="secondary" onClick={() => router.replace("/gallery")}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={() => { setStep("picking"); setErrorMsg(""); }}>
                  Retry
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
