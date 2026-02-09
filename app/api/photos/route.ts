import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDownloadUrl } from "@/lib/s3/client";

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

    // Generate signed URLs for each photo
    const photosWithUrls = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (photos || []).map(async (photo: any) => ({
        id: photo.id,
        filename: photo.filename,
        thumbUrl: await getDownloadUrl(photo.s3_key_thumb),
        previewUrl: await getDownloadUrl(photo.s3_key_preview),
        sizeBytes: photo.size_bytes,
        width: photo.width,
        height: photo.height,
        takenAt: photo.taken_at,
        device: photo.device || "Unknown",
        location: photo.location || "Unknown",
        backedUp: photo.backed_up,
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
    } = body;

    // Validate required fields
    if (!id || !filename || !s3KeyOriginal || !s3KeyPreview || !s3KeyThumb) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify the S3 keys belong to this user (security check)
    if (!s3KeyOriginal.startsWith(`users/${user.id}/`)) {
      return NextResponse.json({ error: "Invalid S3 key" }, { status: 403 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: photo, error } = await (supabase as any)
      .from("photos")
      .insert({
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
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating photo:", error);
      return NextResponse.json({ error: "Failed to create photo" }, { status: 500 });
    }

    return NextResponse.json({ photo }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/photos:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
