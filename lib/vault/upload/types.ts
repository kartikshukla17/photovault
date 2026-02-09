import type { ImageVariantsResult } from "@/lib/image/variants";

export type UploadPhotoInput = {
  userId: string;
  photoId: string;
  file: File;
};

export type UploadProgressEvent = {
  stage:
    | "preparing"
    | "resizing-preview"
    | "resizing-thumb"
    | "uploading-original"
    | "uploading-preview"
    | "uploading-thumb"
    | "finalizing"
    | "done";
  percent: number; // 0..100 overall
  fileName: string;
};

export type UploadedPhotoRecord = {
  photoId: string;
  originalKey: string;
  previewKey: string;
  thumbKey: string;
  width: number;
  height: number;
  sizeBytes: number;
};

export type PhotoUploader = {
  upload(
    input: UploadPhotoInput,
    opts: {
      signal?: AbortSignal;
      onProgress?: (event: UploadProgressEvent) => void;
      variants?: ImageVariantsResult;
    },
  ): Promise<UploadedPhotoRecord>;
};

