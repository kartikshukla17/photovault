import { getDownloadUrl, type S3Connection } from "@/lib/s3/client";
import { getStorageCdnUrl } from "@/lib/storage/cdn";
import { getCloudFrontSignedUrlForKey } from "@/lib/storage/cloudfront";

const DEFAULT_VIEW_EXPIRES_IN_SECONDS = 60 * 15;

type StorageCdnMode = "presigned" | "public" | "signed";

function getMode(): StorageCdnMode {
  const raw = (process.env.NEXT_PUBLIC_STORAGE_CDN_MODE ?? "presigned").toLowerCase();
  if (raw === "public" || raw === "signed" || raw === "presigned") return raw;
  return "presigned";
}

/**
 * Returns a browser-viewable URL for an object key.
 *
 * Modes:
 * - presigned (default): S3 pre-signed GetObject URL
 * - public: public/reachable CDN URL (no signing)
 * - signed: CloudFront signed URL (keeps S3 private)
 */
export async function getStorageViewUrl(conn: S3Connection, key: string): Promise<string> {
  const mode = getMode();

  if (mode === "public") {
    const cdnUrl = getStorageCdnUrl(key);
    return cdnUrl ?? (await getDownloadUrl(conn, key));
  }

  if (mode === "signed") {
    // Deliberately strict: if you enable signed mode but haven’t configured the signer,
    // fail fast rather than silently falling back to S3 pre-signed URLs.
    return getCloudFrontSignedUrlForKey(key, { expiresInSeconds: DEFAULT_VIEW_EXPIRES_IN_SECONDS });
  }

  return getDownloadUrl(conn, key);
}

