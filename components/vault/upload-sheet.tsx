"use client";

import * as React from "react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/format";
import { IconTrash } from "./icons";
import { useUploadSheet } from "./use-upload-sheet";
import { getMediaMetadata, isVideoFile } from "@/lib/image/metadata";
import { createImageVariants } from "@/lib/image/variants";
import { useVault } from "@/lib/vault/vault-context";

function guessContentTypeFromFilename(filename: string): string | null {
  const ext = filename.slice(filename.lastIndexOf(".") + 1).toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "heic":
      return "image/heic";
    case "heif":
      return "image/heif";
    case "gif":
      return "image/gif";
    case "tif":
    case "tiff":
      return "image/tiff";
    case "cr2":
      return "image/x-canon-cr2";
    case "cr3":
      return "image/x-canon-cr3";
    case "nef":
      return "image/x-nikon-nef";
    case "arw":
      return "image/x-sony-arw";
    case "dng":
      return "image/x-adobe-dng";
    case "rw2":
      return "image/x-panasonic-rw2";
    case "raf":
      return "image/x-fuji-raf";
    case "orf":
      return "image/x-olympus-orf";
    case "pef":
      return "image/x-pentax-pef";
    case "mp4":
      return "video/mp4";
    case "mov":
      return "video/quicktime";
    case "avi":
      return "video/x-msvideo";
    case "webm":
      return "video/webm";
    case "mkv":
      return "video/x-matroska";
    case "3gp":
      return "video/3gpp";
    case "m4v":
      return "video/x-m4v";
    default:
      return null;
  }
}

function getFileContentType(file: File): string | null {
  return file.type || guessContentTypeFromFilename(file.name);
}

interface SelectedFile {
  file: File;
  preview: string;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
  contentType: string;
  metadata?: {
    width: number;
    height: number;
  };
}

interface UploadInfo {
  photoId: string;
  filename: string;
  uploadUrl: string;
  uploadUrls?: {
    original: string;
    preview?: string;
    thumb?: string;
  };
  keys: {
    original: string;
    preview: string;
    thumb: string;
  };
}

function UploadModal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-[200]",
        "bg-black/88 backdrop-blur-[14px]",
        "flex items-end md:items-center justify-center md:p-[24px]"
      )}
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full md:max-w-[500px]",
          "rounded-t-[20px] md:rounded-[20px]",
          "bg-[#0c0c0c] border border-bg-border",
          "shadow-[0_40px_80px_rgba(0,0,0,0.7)]",
          "animate-[pvModalIn_200ms_ease-out_both]",
          "max-h-[90vh] overflow-y-auto"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
      <style>{`
        @keyframes pvModalIn {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @media (min-width: 768px) {
          @keyframes pvModalIn {
            from { transform: scale(0.95); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        }
      `}</style>
    </div>
  );
}

export function UploadSheet() {
  const { open, step, closeSheet, setStep, albumId } = useUploadSheet();
  const vault = useVault();
  const [files, setFiles] = React.useState<SelectedFile[]>([]);
  const [dragging, setDragging] = React.useState(false);
  const [duplicatePrompt, setDuplicatePrompt] = React.useState<{
    duplicateIndices: number[];
  } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const filesAppInputRef = React.useRef<HTMLInputElement>(null);
  const uploadStartedRef = React.useRef(false);
  const filesRef = React.useRef<SelectedFile[]>([]);
  const uploadedIdsRef = React.useRef<string[]>([]);

  // Keep filesRef in sync
  React.useEffect(() => {
    filesRef.current = files;
  }, [files]);

  // Reset files when sheet closes
  React.useEffect(() => {
    if (!open) {
      setFiles([]);
      setDuplicatePrompt(null);
      uploadStartedRef.current = false;
    }
  }, [open]);

  // Auto-close if page loads with "done" state but no files (e.g., after refresh)
  React.useEffect(() => {
    if (open && step === "done" && files.length === 0) {
      closeSheet();
    }
  }, [open, step, files.length, closeSheet]);

  // Trigger upload when step changes to uploading
  React.useEffect(() => {
    if (step !== "uploading" || uploadStartedRef.current) return;
    uploadStartedRef.current = true;

    const uploadFiles = async () => {
      const currentFiles = filesRef.current;
      if (currentFiles.length === 0) return;
      uploadedIdsRef.current = [];

      try {
        const serverSideProcessing =
          (process.env.NEXT_PUBLIC_UPLOAD_SERVER_SIDE_PROCESSING ?? "false").toLowerCase() ===
          "true";

        // 1. Get pre-signed URLs from API
        const presignedRes = await fetch("/api/upload/presigned", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            files: currentFiles.map((f) => ({
              filename: f.file.name,
              contentType: f.contentType,
              size: f.file.size,
            })),
            serverSideProcessing,
          }),
        });

        if (!presignedRes.ok) {
          const err = await presignedRes.json();
          throw new Error(err.error || "Failed to get upload URLs");
        }

        const { uploads } = (await presignedRes.json()) as { uploads: UploadInfo[] };

        // 2. Upload each file to S3
        for (let i = 0; i < currentFiles.length; i++) {
          const file = currentFiles[i];
          const uploadInfo = uploads[i];

          // Update status to uploading
          setFiles((prev) => {
            const updated = [...prev];
            updated[i] = { ...updated[i], status: "uploading", progress: 2 };
            return updated;
          });

          try {
            const isVideo = isVideoFile(file.file);
            const metadata = await getMediaMetadata(file.file);
            setFiles((prev) => {
              const updated = [...prev];
              updated[i] = { ...updated[i], metadata, progress: 25 };
              return updated;
            });

            let variants:
              | {
                  preview: Blob;
                  thumb: Blob;
                }
              | undefined;
            // Skip client-side variant creation for videos (requires server-side processing)
            if (!serverSideProcessing && !isVideo) {
              const v = await createImageVariants(file.file);
              variants = { preview: v.preview, thumb: v.thumb };
              setFiles((prev) => {
                const updated = [...prev];
                updated[i] = { ...updated[i], progress: 40 };
                return updated;
              });
            }

            const uploadOriginalRes = await fetch(uploadInfo.uploadUrl, {
              method: "PUT",
              body: file.file,
              headers: {
                "Content-Type": file.contentType || "application/octet-stream",
              },
            });
            if (!uploadOriginalRes.ok) {
              const body = await uploadOriginalRes.text().catch(() => "");
              const snippet = body ? `: ${body.slice(0, 240)}` : "";
              throw new Error(`S3 original upload failed (${uploadOriginalRes.status})${snippet}`);
            }

            setFiles((prev) => {
              const updated = [...prev];
              updated[i] = { ...updated[i], progress: serverSideProcessing ? 75 : 55 };
              return updated;
            });

            // Upload preview/thumb variants (skip for videos - they need server-side processing)
            if (!serverSideProcessing && !isVideo && variants) {
              const previewUrl = uploadInfo.uploadUrls?.preview;
              const thumbUrl = uploadInfo.uploadUrls?.thumb;
              if (!previewUrl || !thumbUrl) {
                throw new Error(
                  "Missing S3 upload URLs for preview/thumb. Re-try upload or enable server-side processing."
                );
              }

              const [uploadPreviewRes, uploadThumbRes] = await Promise.all([
                fetch(previewUrl, {
                  method: "PUT",
                  body: variants.preview,
                  headers: { "Content-Type": "image/webp" },
                }),
                fetch(thumbUrl, {
                  method: "PUT",
                  body: variants.thumb,
                  headers: { "Content-Type": "image/webp" },
                }),
              ]);

              if (!uploadPreviewRes.ok) {
                const body = await uploadPreviewRes.text().catch(() => "");
                const snippet = body ? `: ${body.slice(0, 240)}` : "";
                throw new Error(
                  `S3 preview upload failed (${uploadPreviewRes.status})${snippet}`
                );
              }
              if (!uploadThumbRes.ok) {
                const body = await uploadThumbRes.text().catch(() => "");
                const snippet = body ? `: ${body.slice(0, 240)}` : "";
                throw new Error(
                  `S3 thumb upload failed (${uploadThumbRes.status})${snippet}`
                );
              }

              setFiles((prev) => {
                const updated = [...prev];
                updated[i] = { ...updated[i], progress: 75 };
                return updated;
              });
            }

            // Videos always need server-side processing for thumbnails
            const needsProcessing = serverSideProcessing || isVideo;

            const photoRes = await fetch("/api/photos", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: uploadInfo.photoId,
                filename: file.file.name,
                sizeBytes: file.file.size,
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

            // Update status to done
            setFiles((prev) => {
              const updated = [...prev];
              updated[i] = { ...updated[i], status: "done", progress: 100 };
              return updated;
            });
            const { photo } = await photoRes.json();
            if (photo?.id) {
              uploadedIdsRef.current.push(photo.id);
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("pv:photo-added", { detail: { photo } }),
                );
              }
            }
          } catch (err) {
            // Update status to error
            setFiles((prev) => {
              const updated = [...prev];
              updated[i] = {
                ...updated[i],
                status: "error",
                error: err instanceof Error ? err.message : "Upload failed",
              };
              return updated;
            });
          }

        }

        if (albumId && uploadedIdsRef.current.length > 0) {
          const patchRes = await fetch(`/api/albums/${albumId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ addPhotoIds: uploadedIdsRef.current }),
          });
          if (!patchRes.ok) {
            const payload = await patchRes.json().catch(() => ({}));
            console.error("Failed to add photos to album:", payload);
            // Surface the failure on the files so the user sees uploads
            // succeeded but the album mapping didn't.
            setFiles((prev) =>
              prev.map((f) =>
                f.status === "done"
                  ? {
                      ...f,
                      status: "error",
                      error:
                        payload.error ??
                        "Uploaded, but couldn't add to the selected album.",
                    }
                  : f,
              ),
            );
          } else if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("pv:album-updated", { detail: { albumId } }),
            );
          }
        }
        uploadedIdsRef.current = [];
        setStep("done");
      } catch (err) {
        console.error("Upload error:", err);
        setFiles((prev) =>
          prev.map((f) =>
            f.status === "pending"
              ? { ...f, status: "error", error: err instanceof Error ? err.message : "Upload failed" }
              : f
          )
        );
        uploadedIdsRef.current = [];
        setStep("done");
      }
    };

    uploadFiles();
  }, [step, setStep, albumId]);

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    // The "Files" picker uses no accept filter (so folder-based file managers
    // open instead of just the gallery). Reject anything that isn't an image
    // or video here so the user sees feedback immediately.
    const mediaFiles = Array.from(selectedFiles)
      .map((file) => ({ file, contentType: getFileContentType(file) }))
      .filter(
        ({ contentType }) =>
          !!contentType &&
          (contentType.startsWith("image/") || contentType.startsWith("video/")),
      );

    if (mediaFiles.length < selectedFiles.length) {
      const skipped = selectedFiles.length - mediaFiles.length;
      alert(
        `${skipped} file${skipped > 1 ? "s were" : " was"} skipped — only images and videos can be uploaded.`,
      );
    }

    const newFiles: SelectedFile[] = mediaFiles.map(({ file, contentType }) => ({
      file,
      contentType: contentType!,
      preview: URL.createObjectURL(file),
      progress: 0,
      status: "pending",
    }));

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const findDuplicateIndices = React.useCallback(
    (list: SelectedFile[]) => {
      const existing = new Set(
        vault.photos.map((p) => `${p.filename}::${p.sizeBytes}`),
      );
      const dupes: number[] = [];
      list.forEach((f, i) => {
        if (existing.has(`${f.file.name}::${f.file.size}`)) dupes.push(i);
      });
      return dupes;
    },
    [vault.photos],
  );

  const handleStartUpload = () => {
    if (files.length === 0) return;
    const dupes = findDuplicateIndices(files);
    if (dupes.length > 0) {
      setDuplicatePrompt({ duplicateIndices: dupes });
      return;
    }
    setStep("uploading");
  };

  const handleSkipDuplicates = () => {
    if (!duplicatePrompt) return;
    const skip = new Set(duplicatePrompt.duplicateIndices);
    const remaining: SelectedFile[] = [];
    files.forEach((f, i) => {
      if (skip.has(i)) {
        URL.revokeObjectURL(f.preview);
      } else {
        remaining.push(f);
      }
    });
    setFiles(remaining);
    setDuplicatePrompt(null);
    if (remaining.length === 0) return;
    setStep("uploading");
  };

  const handleUploadAnyway = () => {
    setDuplicatePrompt(null);
    setStep("uploading");
  };

  const handleCancelDuplicatePrompt = () => {
    setDuplicatePrompt(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleClose = () => {
    // Cleanup preview URLs
    files.forEach((f) => URL.revokeObjectURL(f.preview));
    closeSheet();
  };

  if (!open) return null;

  const duplicateCount = duplicatePrompt?.duplicateIndices.length ?? 0;
  const duplicateNames = duplicatePrompt
    ? duplicatePrompt.duplicateIndices
        .slice(0, 3)
        .map((i) => files[i]?.file.name)
        .filter(Boolean)
    : [];

  return (
    <UploadModal onClose={duplicatePrompt ? handleCancelDuplicatePrompt : handleClose}>
      {duplicatePrompt ? (
        <div>
          <div className="px-[26px] py-[22px] border-b border-bg-border">
            <div className="font-display text-[19px] text-text-primary tracking-[-0.3px]">
              {duplicateCount} already in your vault
            </div>
            <div className="text-[11px] text-text-muted mt-[2px]">
              A file with the same name and size is already backed up.
            </div>
          </div>
          <div className="p-[24px]">
            {duplicateNames.length > 0 && (
              <ul className="mb-[14px] flex flex-col gap-[4px]">
                {duplicateNames.map((name, i) => (
                  <li
                    key={i}
                    className="text-[12px] text-text-secondary truncate bg-[#141414] border border-bg-border rounded-[8px] px-[10px] py-[7px]"
                  >
                    {name}
                  </li>
                ))}
                {duplicateCount > duplicateNames.length && (
                  <li className="text-[11px] text-text-muted">
                    +{duplicateCount - duplicateNames.length} more
                  </li>
                )}
              </ul>
            )}
            <div className="flex flex-col gap-[10px]">
              <Button variant="primary" onClick={handleSkipDuplicates}>
                Skip {duplicateCount} duplicate{duplicateCount > 1 ? "s" : ""}
                {files.length - duplicateCount > 0
                  ? ` · upload ${files.length - duplicateCount}`
                  : ""}
              </Button>
              <Button variant="secondary" onClick={handleUploadAnyway}>
                Upload all anyway
              </Button>
              <button
                onClick={handleCancelDuplicatePrompt}
                className="text-[12px] text-text-muted hover:text-text-secondary"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      ) : step === "idle" ? (
        <div>
          {/* Header */}
          <div className="px-[26px] py-[22px] border-b border-bg-border flex justify-between items-start">
            <div>
              <div className="font-display text-[19px] text-text-primary tracking-[-0.3px]">
                Upload Photos
              </div>
              <div className="text-[11px] text-text-muted mt-[2px]">
                Originals stored permanently · AWS S3
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-[30px] h-[30px] rounded-full bg-[#181818] text-text-muted hover:text-text-primary flex items-center justify-center text-[14px] cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="p-[24px]">
            {/* File drop zone */}
            <div
              className={cn(
                "rounded-[14px] border-2 border-dashed p-[36px_24px] text-center transition-all duration-200 cursor-pointer",
                dragging
                  ? "border-accent-primary bg-accent-glow"
                  : "border-[#252525]"
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-[36px] mb-[10px]">⬆</div>
              <div className="text-accent-primary font-semibold text-[14px] mb-[5px]">
                Drop photos here
              </div>
              <div className="text-text-muted text-[12px]">
                Images & Videos · RAW · GIF · MP4 · MOV supported
              </div>
              <div
                className="mt-[14px] flex gap-[8px] justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-[18px] py-[7px] bg-[#181818] border border-[#2a2a2a] rounded-[8px] text-text-muted text-[12px] cursor-pointer hover:bg-[#1e1e1e]"
                >
                  Photos
                </button>
                <button
                  type="button"
                  onClick={() => filesAppInputRef.current?.click()}
                  className="px-[18px] py-[7px] bg-[#181818] border border-[#2a2a2a] rounded-[8px] text-text-muted text-[12px] cursor-pointer hover:bg-[#1e1e1e]"
                >
                  Files
                </button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              id="file-upload"
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />
            <input
              ref={filesAppInputRef}
              id="file-upload-files-app"
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />

            {/* Selected files list */}
            {files.length > 0 && (
              <div className="mt-[14px]">
                <div className="text-[11px] text-text-muted mb-[8px]">
                  {files.length} file{files.length > 1 ? "s" : ""} selected
                </div>
                <div className="max-h-[130px] overflow-y-auto flex flex-col gap-[5px]">
                  {files.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-[10px] p-[8px_12px] bg-[#141414] rounded-[8px] border border-bg-border"
                    >
                      <div className="relative w-[30px] h-[30px] bg-[#1e1e1e] rounded-[6px] flex items-center justify-center text-[13px] overflow-hidden flex-shrink-0">
                        {f.contentType.startsWith("video/") ? (
                          <span title="Video">🎬</span>
                        ) : f.preview ? (
                          <Image
                            src={f.preview}
                            alt=""
                            fill
                            sizes="30px"
                            unoptimized
                            className="object-cover"
                          />
                        ) : (
                          "🖼"
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] text-text-secondary truncate">
                          {f.file.name}
                        </div>
                        <div className="text-[10px] text-text-muted">
                          {formatBytes(f.file.size)}
                        </div>
                      </div>
                      <button
                        className="h-7 w-7 rounded-[6px] bg-bg-border text-text-muted hover:text-danger hover:bg-danger/10 transition-colors flex-shrink-0"
                        onClick={() => handleRemoveFile(i)}
                      >
                        <IconTrash className="h-3.5 w-3.5 mx-auto" />
                      </button>
                    </div>
                  ))}
                </div>
                <Button
                  variant="primary"
                  className="w-full mt-[14px]"
                  onClick={handleStartUpload}
                >
                  Upload {files.length} Photo{files.length > 1 ? "s" : ""}
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {step === "uploading" ? (
        <div>
          {/* Header */}
          <div className="px-[26px] py-[22px] border-b border-bg-border">
            <div className="font-display text-[19px] text-text-primary tracking-[-0.3px]">
              Uploading
            </div>
            <div className="text-[11px] text-text-muted mt-[2px]">
              Uploading directly to S3 — server not involved...
            </div>
          </div>

          {/* Content */}
          <div className="p-[24px]">
            {/* File progress list */}
            <div className="flex flex-col gap-[8px]">
              {files.map((f, i) => (
                <div
                  key={i}
                  className="p-[10px_14px] bg-[#141414] rounded-[10px] border border-bg-border"
                >
                  <div className="flex justify-between mb-[5px]">
                    <span className="text-[11px] text-text-secondary truncate flex-1 mr-[8px]">
                      {f.file.name}
                    </span>
                    <span
                      className={cn(
                        "text-[11px]",
                        f.status === "done" ? "text-success" : "text-accent-primary"
                      )}
                    >
                      {Math.round(f.progress)}%
                    </span>
                  </div>
                  <div className="h-[2px] bg-[#222] rounded-[2px]">
                    <div
                      className={cn(
                        "h-full rounded-[2px] transition-all duration-150",
                        f.status === "done"
                          ? "bg-success"
                          : "bg-[linear-gradient(90deg,var(--pv-accent-primary),var(--pv-accent-light))]"
                      )}
                      style={{ width: `${f.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {step === "done" ? (
        <div className="p-[24px]">
          <div className="p-[18px] rounded-[12px] bg-success/5 border border-success/15 text-center">
            <div className="text-[28px] mb-[6px]">✓</div>
            <div className="text-success font-semibold text-[14px] mb-[3px]">
              {files.filter((f) => f.status === "done").length} of {files.length} photos backed up!
            </div>
            {files.some((f) => f.status === "error") && (
              <div className="text-[11px] text-danger mb-[8px]">
                {files.filter((f) => f.status === "error").length} failed
              </div>
            )}
            <div className="text-[11px] text-text-muted mb-[14px]">
              Refresh the page to see your photos
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                handleClose();
                window.location.reload(); // Refresh to show new photos
              }}
            >
              Done
            </Button>
          </div>
        </div>
      ) : null}
    </UploadModal>
  );
}
