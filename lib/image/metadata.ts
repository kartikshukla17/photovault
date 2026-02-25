type ImageDecodeResult = {
  width: number;
  height: number;
  release: () => void;
};

async function decodeImage(file: File): Promise<ImageDecodeResult> {
  if ("createImageBitmap" in window) {
    const bitmap = await createImageBitmap(file);
    return {
      width: bitmap.width,
      height: bitmap.height,
      release: () => bitmap.close(),
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
      release: () => {},
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function getImageMetadata(file: File): Promise<{ width: number; height: number }> {
  const decoded = await decodeImage(file);
  try {
    return {
      width: decoded.width,
      height: decoded.height,
    };
  } finally {
    decoded.release();
  }
}
