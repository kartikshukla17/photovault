import { createImageVariants } from "@/lib/image/variants";
import { buildS3Keys } from "./keys";
import type { PhotoUploader } from "./types";

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(id);
      reject(new Error("Upload aborted"));
    };
    if (signal) {
      if (signal.aborted) return onAbort();
      signal.addEventListener("abort", onAbort, { once: true });
    }
  });
}

function extFromFile(file: File): string {
  const match = /\\.([a-zA-Z0-9]+)$/.exec(file.name);
  return match?.[1]?.toLowerCase() ?? "jpg";
}

export const mockUploader: PhotoUploader = {
  async upload(input, { signal, onProgress, variants }) {
    onProgress?.({ stage: "preparing", percent: 2, fileName: input.file.name });

    const v = variants ?? (await createImageVariants(input.file));
    onProgress?.({ stage: "resizing-preview", percent: 18, fileName: input.file.name });
    await sleep(220, signal);
    onProgress?.({ stage: "resizing-thumb", percent: 28, fileName: input.file.name });
    await sleep(160, signal);

    onProgress?.({ stage: "uploading-original", percent: 52, fileName: input.file.name });
    await sleep(350, signal);
    onProgress?.({ stage: "uploading-preview", percent: 74, fileName: input.file.name });
    await sleep(280, signal);
    onProgress?.({ stage: "uploading-thumb", percent: 88, fileName: input.file.name });
    await sleep(180, signal);

    onProgress?.({ stage: "finalizing", percent: 96, fileName: input.file.name });
    await sleep(160, signal);

    const keys = buildS3Keys({
      userId: input.userId,
      photoId: input.photoId,
      originalExt: extFromFile(input.file),
    });

    onProgress?.({ stage: "done", percent: 100, fileName: input.file.name });
    return {
      photoId: input.photoId,
      originalKey: keys.originalKey,
      previewKey: keys.previewKey,
      thumbKey: keys.thumbKey,
      width: v.meta.width,
      height: v.meta.height,
      sizeBytes: v.meta.originalBytes,
    };
  },
};

