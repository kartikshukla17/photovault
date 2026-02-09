export type ImageVariantSpec = {
  maxDimension: number;
  mimeType: "image/webp" | "image/jpeg";
  quality: number; // 0..1
};

export type ImageVariantsResult = {
  original: File;
  preview: Blob;
  thumb: Blob;
  meta: {
    width: number;
    height: number;
    originalBytes: number;
    previewBytes: number;
    thumbBytes: number;
  };
};

async function decodeImage(file: File): Promise<{
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D) => void;
}> {
  if ("createImageBitmap" in window) {
    const bitmap = await createImageBitmap(file);
    return {
      width: bitmap.width,
      height: bitmap.height,
      draw(ctx) {
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close();
      },
    };
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Failed to decode image"));
      el.src = url;
    });
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      draw(ctx) {
        ctx.drawImage(img, 0, 0);
      },
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function computeTargetSize(
  width: number,
  height: number,
  maxDimension: number,
): { targetWidth: number; targetHeight: number } {
  if (width <= 0 || height <= 0) return { targetWidth: 1, targetHeight: 1 };
  const longest = Math.max(width, height);
  if (longest <= maxDimension) return { targetWidth: width, targetHeight: height };
  const scale = maxDimension / longest;
  return {
    targetWidth: Math.max(1, Math.round(width * scale)),
    targetHeight: Math.max(1, Math.round(height * scale)),
  };
}

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mimeType, quality),
  );
  if (!blob) throw new Error("Failed to encode image");
  return blob;
}

async function renderVariant(
  file: File,
  spec: ImageVariantSpec,
): Promise<{ blob: Blob; width: number; height: number; sourceWidth: number; sourceHeight: number }> {
  const decoded = await decodeImage(file);
  const { targetWidth, targetHeight } = computeTargetSize(
    decoded.width,
    decoded.height,
    spec.maxDimension,
  );

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Draw scaled in one go.
  ctx.save();
  ctx.scale(targetWidth / decoded.width, targetHeight / decoded.height);
  decoded.draw(ctx);
  ctx.restore();

  const blob = await canvasToBlob(canvas, spec.mimeType, spec.quality);
  return {
    blob,
    width: targetWidth,
    height: targetHeight,
    sourceWidth: decoded.width,
    sourceHeight: decoded.height,
  };
}

export async function createImageVariants(file: File): Promise<ImageVariantsResult> {
  const previewSpec: ImageVariantSpec = {
    maxDimension: 1600,
    mimeType: "image/webp",
    quality: 0.82,
  };
  const thumbSpec: ImageVariantSpec = {
    maxDimension: 150,
    mimeType: "image/webp",
    quality: 0.78,
  };

  const preview = await renderVariant(file, previewSpec);
  const thumb = await renderVariant(file, thumbSpec);

  return {
    original: file,
    preview: preview.blob,
    thumb: thumb.blob,
    meta: {
      width: preview.sourceWidth,
      height: preview.sourceHeight,
      originalBytes: file.size,
      previewBytes: preview.blob.size,
      thumbBytes: thumb.blob.size,
    },
  };
}

