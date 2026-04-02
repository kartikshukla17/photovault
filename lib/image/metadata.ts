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

export async function getVideoMetadata(file: File): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";

      video.onloadedmetadata = () => {
        resolve({
          width: video.videoWidth || 1920,
          height: video.videoHeight || 1080,
        });
      };

      video.onerror = () => {
        // Return default dimensions if metadata can't be read
        resolve({ width: 1920, height: 1080 });
      };

      // Timeout fallback
      setTimeout(() => {
        resolve({ width: 1920, height: 1080 });
      }, 5000);

      video.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function isVideoFile(file: File): boolean {
  if (file.type.startsWith("video/")) return true;
  const name = file.name || "";
  const ext = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
  return ["mp4", "mov", "avi", "webm", "mkv", "3gp", "m4v"].includes(ext);
}

export async function getMediaMetadata(file: File): Promise<{ width: number; height: number }> {
  if (isVideoFile(file)) {
    return getVideoMetadata(file);
  }
  return getImageMetadata(file);
}
