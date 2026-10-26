import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deletePhotoObjects } from "@/lib/s3/client";
import { getUserStorageConfigOrThrow } from "@/lib/storage/user-storage";
import { getStorageViewUrl } from "@/lib/storage/object-url";

/**
 * GET /api/photos/[id]
 * Get a single photo by ID
 *
 * Security:
 * - Requires authenticated user
 * - RLS ensures user can only access their own photos
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let storage;
    try {
      storage = await getUserStorageConfigOrThrow(supabase, user.id);
    } catch {
      return NextResponse.json(
        { error: "Storage not configured" },
        { status: 412 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: photo, error } = await (supabase as any)
      .from("photos")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    const cdnMode = (process.env.NEXT_PUBLIC_STORAGE_CDN_MODE ?? "presigned").toLowerCase();
    const useProxy = cdnMode === "proxy";

    const photoWithUrls = {
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
    };

    return NextResponse.json({ photo: photoWithUrls });
  } catch (error) {
    console.error("Error in GET /api/photos/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/photos/[id]
 * Update photo metadata
 *
 * Security:
 * - Requires authenticated user
 * - Can only update own photos (RLS enforced)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { device, location } = body;

    // Only allow updating specific fields
    const updates: Record<string, string> = {};
    if (device !== undefined) updates.device = device;
    if (location !== undefined) updates.location = location;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: photo, error } = await (supabase as any)
      .from("photos")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error || !photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    return NextResponse.json({ photo });
  } catch (error) {
    console.error("Error in PATCH /api/photos/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/photos/[id]
 * Delete a photo (both from database and S3)
 *
 * Security:
 * - Requires authenticated user
 * - Can only delete own photos (RLS enforced)
 * - Also removes from all albums
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let storage;
    try {
      storage = await getUserStorageConfigOrThrow(supabase, user.id);
    } catch {
      return NextResponse.json(
        { error: "Storage not configured" },
        { status: 412 }
      );
    }

    // First, get the photo to retrieve S3 keys
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: photo, error: fetchError } = await (supabase as any)
      .from("photos")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Remove from all albums first (foreign key constraint)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("album_photos")
      .delete()
      .eq("photo_id", id);

    // Delete from database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (supabase as any)
      .from("photos")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Error deleting photo from database:", deleteError);
      return NextResponse.json({ error: "Failed to delete photo" }, { status: 500 });
    }

    // Delete from S3 (don't fail if S3 delete fails)
    try {
      await deletePhotoObjects(
        storage,
        photo.s3_key_original,
        photo.s3_key_preview,
        photo.s3_key_thumb
      );
    } catch (s3Error) {
      console.error("Error deleting from S3 (photo already deleted from DB):", s3Error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/photos/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
