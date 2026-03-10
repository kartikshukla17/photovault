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
    const { files, serverSideProcessing } = body as {
      files: Array<{ filename: string; contentType: string; size: number }>;
      serverSideProcessing?: boolean;
    };

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    // 3. Validate file types and sizes
    const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB for images
    const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB for videos

    const ALLOWED_IMAGE_TYPES = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
      "image/gif",
      "image/tiff",
      // RAW formats
      "image/x-canon-cr2",
      "image/x-canon-cr3",
      "image/x-nikon-nef",
      "image/x-sony-arw",
      "image/x-adobe-dng",
      "image/x-panasonic-rw2",
      "image/x-fuji-raf",
      "image/x-olympus-orf",
      "image/x-pentax-pef",
    ];

    const ALLOWED_VIDEO_TYPES = [
      "video/mp4",
      "video/quicktime",  // .mov
      "video/x-msvideo",  // .avi
      "video/webm",
      "video/x-matroska", // .mkv
      "video/3gpp",       // .3gp
    ];

    const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];
    const isVideo = (type: string) => ALLOWED_VIDEO_TYPES.includes(type);

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.contentType)) {
        return NextResponse.json(
          { error: `Invalid file type: ${file.contentType}` },
          { status: 400 }
        );
      }
      const maxSize = isVideo(file.contentType) ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: `File too large: ${file.filename} (max ${isVideo(file.contentType) ? "500MB" : "50MB"})` },
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

        const uploadUrls: {
          original: string;
          preview?: string;
          thumb?: string;
        } = {
          original: await getUploadUrl(
            storage,
            keys.original,
            file.contentType,
            "GLACIER_IR",
          ),
        };
        if (!serverSideProcessing) {
          uploadUrls.preview = await getUploadUrl(storage, keys.preview, "image/webp");
          uploadUrls.thumb = await getUploadUrl(storage, keys.thumb, "image/webp");
        }

        return {
          photoId,
          filename: file.filename,
          uploadUrl: uploadUrls.original,
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
