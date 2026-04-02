import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserStorageConfigOrThrow } from "@/lib/storage/user-storage";
import { getStorageViewUrl } from "@/lib/storage/object-url";

/**
 * GET /api/photos
 * List all photos for the authenticated user
 *
 * Query params:
 * - album: Filter by album ID
 * - limit: Number of photos to return (default 50)
 * - offset: Pagination offset
 *
 * Security:
 * - Requires authenticated user
 * - RLS ensures users only see their own photos
 * - Returns signed URLs that expire in 15 minutes
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let storage;
    try {
      storage = await getUserStorageConfigOrThrow(supabase, user.id);
    } catch {
      // Storage not configured yet -> return empty library (UI can prompt user to connect).
      return NextResponse.json({ photos: [], storageConfigured: false });
    }

    const { searchParams } = new URL(request.url);
    const albumId = searchParams.get("album");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from("photos")
      .select("*")
      .eq("user_id", user.id)
      .order("taken_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // If filtering by album, join with album_photos
    if (albumId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: albumPhotos } = await (supabase as any)
        .from("album_photos")
        .select("photo_id")
        .eq("album_id", albumId);

      if (albumPhotos) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const photoIds = albumPhotos.map((ap: any) => ap.photo_id);
        query = query.in("id", photoIds);
      }
    }

    const { data: photos, error } = await query;

    if (error) {
      console.error("Error fetching photos:", error);
      return NextResponse.json({ error: "Failed to fetch photos" }, { status: 500 });
    }

    const cdnMode = (process.env.NEXT_PUBLIC_STORAGE_CDN_MODE ?? "presigned").toLowerCase();
    const useProxy = cdnMode === "proxy";

    // Generate signed URLs for each photo
    const photosWithUrls = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (photos || []).map(async (photo: any) => ({
        id: photo.id,
        filename: photo.filename,
        thumbUrl: useProxy
          ? `/api/photos/${photo.id}/blob/thumb`
          : await getStorageViewUrl(storage, photo.s3_key_thumb),
        previewUrl: useProxy
          ? `/api/photos/${photo.id}/blob/preview`
          : await getStorageViewUrl(storage, photo.s3_key_preview),
        originalUrl: useProxy
          ? `/api/photos/${photo.id}/blob/original`
          : await getStorageViewUrl(storage, photo.s3_key_original),
        sizeBytes: photo.size_bytes,
        width: photo.width,
        height: photo.height,
        takenAt: photo.taken_at,
        device: photo.device || "Unknown",
        location: photo.location || "Unknown",
        backedUp: photo.backed_up,
        processingStatus: photo.processing_status ?? "completed",
      }))
    );

    return NextResponse.json({ photos: photosWithUrls });
  } catch (error) {
    console.error("Error in GET /api/photos:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/photos
 * Create a new photo record after successful S3 upload
 *
 * Security:
 * - Requires authenticated user
 * - Photo is automatically associated with the user
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      id,
      filename,
      sizeBytes,
      width,
      height,
      takenAt,
      device,
      location,
      s3KeyOriginal,
      s3KeyPreview,
      s3KeyThumb,
      processingStatus,
    } = body;

    // Validate required fields
    if (!id || !filename || !s3KeyOriginal || !s3KeyPreview || !s3KeyThumb) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify the S3 keys belong to this user (security check)
    const expectedPrefix = `users/${user.id}/photos/${id}/`;
    if (
      !s3KeyOriginal.startsWith(expectedPrefix) ||
      !s3KeyPreview.startsWith(expectedPrefix) ||
      !s3KeyThumb.startsWith(expectedPrefix)
    ) {
      return NextResponse.json({ error: "Invalid S3 key" }, { status: 403 });
    }

    const basePayload = {
      id,
      user_id: user.id,
      filename,
      size_bytes: sizeBytes || 0,
      width: width || 0,
      height: height || 0,
      taken_at: takenAt || new Date().toISOString(),
      device: device || null,
      location: location || null,
      backed_up: true,
      s3_key_original: s3KeyOriginal,
      s3_key_preview: s3KeyPreview,
      s3_key_thumb: s3KeyThumb,
    };

    const payload =
      processingStatus == null
        ? basePayload
        : { ...basePayload, processing_status: processingStatus ?? "completed" };

    // Try insert with `processing_status`, but gracefully fallback if the user's schema
    // doesn't have the column yet (or PostgREST schema cache hasn't refreshed).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let insertResult = await (supabase as any)
      .from("photos")
      .insert(payload)
      .select()
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const firstError: any = insertResult.error;
    if (
      firstError?.code === "PGRST204" &&
      typeof firstError?.message === "string" &&
      firstError.message.includes("processing_status")
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      insertResult = await (supabase as any)
        .from("photos")
        .insert(basePayload)
        .select()
        .single();
    }

    const { data: photo, error } = insertResult;

    if (error) {
      console.error("Error creating photo:", error);
      const isProd = process.env.NODE_ENV === "production";
      return NextResponse.json(
        {
          error: "Failed to create photo",
          ...(isProd
            ? null
            : {
                details: {
                  message: error.message,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  code: (error as any).code ?? null,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  hint: (error as any).hint ?? null,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  details: (error as any).details ?? null,
                },
              }),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ photo }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/photos:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
