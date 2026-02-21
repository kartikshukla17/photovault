import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUploadUrl, generatePhotoKeys } from "@/lib/s3/client";
import { randomUUID } from "crypto";
import { getUserStorageConfigOrThrow } from "@/lib/storage/user-storage";

/**
 * POST /api/upload/presigned
 * Generate pre-signed URLs for uploading photos to S3
 *
 * Security:
 * - Requires authenticated user
 * - URLs expire in 15 minutes
 * - Keys are scoped to user's folder
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const { files } = body as {
      files: Array<{ filename: string; contentType: string; size: number }>;
    };

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    // 3. Validate file types and sizes
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.contentType)) {
        return NextResponse.json(
          { error: `Invalid file type: ${file.contentType}` },
          { status: 400 }
        );
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File too large: ${file.filename}` },
          { status: 400 }
        );
      }
    }

    // 4. Generate pre-signed URLs for each file
    let storage;
    try {
      storage = await getUserStorageConfigOrThrow(supabase, user.id);
    } catch {
      return NextResponse.json(
        { error: "Storage not configured. Connect your S3 bucket in Settings." },
        { status: 412 }
      );
    }

    const uploads = await Promise.all(
      files.map(async (file) => {
        const photoId = randomUUID();
        const keys = generatePhotoKeys(user.id, photoId, file.filename);

        const uploadUrls = {
          original: await getUploadUrl(storage, keys.original, file.contentType),
          preview: await getUploadUrl(storage, keys.preview, "image/webp"),
          thumb: await getUploadUrl(storage, keys.thumb, "image/webp"),
        };

        return {
          photoId,
          filename: file.filename,
          uploadUrls,
          keys,
        };
      })
    );

    return NextResponse.json({ uploads });
  } catch (error) {
    console.error("Error generating pre-signed URLs:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URLs" },
      { status: 500 }
    );
  }
}
