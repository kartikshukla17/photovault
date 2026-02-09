export type UploadKeyInput = {
  userId: string;
  photoId: string;
  originalExt?: string; // "jpg" | "heic" | ...
};

export type UploadKeys = {
  originalKey: string;
  previewKey: string;
  thumbKey: string;
};

export function buildS3Keys({
  userId,
  photoId,
  originalExt = "jpg",
}: UploadKeyInput): UploadKeys {
  const base = `users/${userId}/photos/${photoId}`;
  const ext = originalExt.replace(/^\./, "");
  return {
    originalKey: `${base}/original.${ext || "jpg"}`,
    previewKey: `${base}/preview.webp`,
    thumbKey: `${base}/thumb.webp`,
  };
}

