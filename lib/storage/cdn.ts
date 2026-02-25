export function getStorageCdnUrl(key: string): string | null {
  const base = process.env.NEXT_PUBLIC_STORAGE_CDN_URL;
  if (!base) return null;
  const trimmedBase = base.replace(/\/$/, "");
  const trimmedKey = key.replace(/^\/+/, "");
  return `${trimmedBase}/${trimmedKey}`;
}

export function hasStorageCdn(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_STORAGE_CDN_URL);
}
