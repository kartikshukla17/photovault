export function getStorageCdnUrl(key: string): string | null {
  const base = process.env.NEXT_PUBLIC_STORAGE_CDN_URL;
  if (!base) return null;

  // Only use the CDN URL when it is actually reachable by the browser without additional
  // signing/cookies. Many CloudFront setups (OAC + private buckets, or signed viewer URLs)
  // will return 403 for direct GETs; in that case we should fall back to S3 pre-signed URLs.
  //
  // Set `NEXT_PUBLIC_STORAGE_CDN_MODE=public` to opt into returning CDN URLs.
  const mode = (process.env.NEXT_PUBLIC_STORAGE_CDN_MODE ?? "presigned").toLowerCase();
  if (mode !== "public") return null;

  const trimmedBase = base.replace(/\/$/, "");
  const trimmedKey = key.replace(/^\/+/, "");
  return `${trimmedBase}/${trimmedKey}`;
}

export function hasStorageCdn(): boolean {
  return (
    Boolean(process.env.NEXT_PUBLIC_STORAGE_CDN_URL) &&
    (process.env.NEXT_PUBLIC_STORAGE_CDN_MODE ?? "presigned").toLowerCase() === "public"
  );
}
