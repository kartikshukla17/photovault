import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { createClient } from "@/lib/supabase/server";
import { generatePhotoKeys } from "@/lib/s3/client";
import { getUserStorageConfigOrThrow } from "@/lib/storage/user-storage";

const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200 MB for server-side fallback

function redirect(request: NextRequest, pathname: string, params?: Record<string, string>) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  return NextResponse.redirect(url, 303);
}

/**
 * GET /share-target
 *
 * The active service worker may redirect POSTs back to `/share-target` after
 * caching the files. Forward those navigations to the React upload page that
 * reads from the cache.
 */
export async function GET(request: NextRequest) {
  return redirect(request, "/share-upload");
}

/**
 * POST /share-target
 *
 * Server-side fallback for Web Share Target when the service worker hasn't
 * yet activated (e.g. the first share after the PWA was installed). Streams
 * the shared files directly to S3 and creates photo rows so the share isn't
 * lost with a confusing "Failed to find Server Action" error.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect(request, "/login", { share: "auth_required" });
  }

  let storage;
  try {
    storage = await getUserStorageConfigOrThrow(supabase, user.id);
  } catch {
    return redirect(request, "/settings", { share: "storage_not_configured" });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return redirect(request, "/gallery", { share: "invalid_form_data" });
  }

  const files = formData
    .getAll("media")
    .filter((entry): entry is File => entry instanceof File);

  if (files.length === 0) {
    return redirect(request, "/gallery");
  }

  const s3Client = new S3Client({
    region: storage.region,
    endpoint: storage.endpoint ?? undefined,
    requestChecksumCalculation: "WHEN_REQUIRED",
    credentials: {
      accessKeyId: storage.accessKeyId,
      secretAccessKey: storage.secretAccessKey,
    },
  });

  let uploaded = 0;
  let skipped = 0;

  for (const file of files) {
    const isVideo = (file.type || "").startsWith("video/");
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (file.size > maxSize || file.size === 0) {
      skipped++;
      continue;
    }

    const photoId = randomUUID();
    const safeName = file.name || `shared-${photoId}`;
    const keys = generatePhotoKeys(user.id, photoId, safeName);

    try {
      const body = Buffer.from(await file.arrayBuffer());
      await s3Client.send(
        new PutObjectCommand({
          Bucket: storage.bucket,
          Key: keys.original,
          Body: body,
          ContentType: file.type || "application/octet-stream",
        }),
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("photos").insert({
        id: photoId,
        user_id: user.id,
        filename: safeName,
        size_bytes: file.size,
        width: 0,
        height: 0,
        taken_at: new Date().toISOString(),
        backed_up: true,
        s3_key_original: keys.original,
        s3_key_preview: keys.preview,
        s3_key_thumb: keys.thumb,
        processing_status: "pending",
      });

      if (error) {
        console.error("Share-target insert failed:", error);
        skipped++;
        continue;
      }

      uploaded++;
    } catch (err) {
      console.error("Share-target upload failed:", err);
      skipped++;
    }
  }

  const params: Record<string, string> = { share_uploaded: String(uploaded) };
  if (skipped > 0) params.share_skipped = String(skipped);
  return redirect(request, "/gallery", params);
}
