import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/albums/[id]
 * Get a single album with its photos
 *
 * Security:
 * - Requires authenticated user
 * - RLS ensures user can only access their own albums
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: album, error } = await (supabase as any)
      .from("albums")
      .select(`
        *,
        album_photos (
          photo_id
        )
      `)
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const albumData = album as any;
    return NextResponse.json({
      album: {
        id: albumData.id,
        name: albumData.name,
        photoIds: albumData.album_photos?.map((ap: { photo_id: string }) => ap.photo_id) || [],
        createdAt: albumData.created_at,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/albums/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/albums/[id]
 * Update album (rename or add/remove photos)
 *
 * Security:
 * - Requires authenticated user
 * - Can only update own albums
 * - Can only add photos that belong to the user
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

    // Verify album belongs to user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: album, error: fetchError } = await (supabase as any)
      .from("albums")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, addPhotoIds, removePhotoIds } = body;

    // Update album name if provided
    if (name && typeof name === "string" && name.trim().length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from("albums")
        .update({ name: name.trim() })
        .eq("id", id);

      if (updateError) {
        console.error("Error updating album name:", updateError);
        return NextResponse.json({ error: "Failed to update album" }, { status: 500 });
      }
    }

    // Add photos to album
    if (addPhotoIds && Array.isArray(addPhotoIds) && addPhotoIds.length > 0) {
      // Verify all photos belong to the user
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: userPhotos } = await (supabase as any)
        .from("photos")
        .select("id")
        .eq("user_id", user.id)
        .in("id", addPhotoIds);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const validPhotoIds = userPhotos?.map((p: any) => p.id) || [];

      if (validPhotoIds.length > 0) {
        // Insert album_photos (ignore duplicates)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: insertError } = await (supabase as any)
          .from("album_photos")
          .upsert(
            validPhotoIds.map((photoId: string) => ({
              album_id: id,
              photo_id: photoId,
            })),
            { onConflict: "album_id,photo_id" }
          );

        if (insertError) {
          console.error("Error adding photos to album:", insertError);
        }
      }
    }

    // Remove photos from album
    if (removePhotoIds && Array.isArray(removePhotoIds) && removePhotoIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: deleteError } = await (supabase as any)
        .from("album_photos")
        .delete()
        .eq("album_id", id)
        .in("photo_id", removePhotoIds);

      if (deleteError) {
        console.error("Error removing photos from album:", deleteError);
      }
    }

    // Fetch updated album
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedAlbum } = await (supabase as any)
      .from("albums")
      .select(`
        *,
        album_photos (
          photo_id
        )
      `)
      .eq("id", id)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const albumData = updatedAlbum as any;
    return NextResponse.json({
      album: {
        id: albumData?.id,
        name: albumData?.name,
        photoIds: albumData?.album_photos?.map((ap: { photo_id: string }) => ap.photo_id) || [],
        createdAt: albumData?.created_at,
      },
    });
  } catch (error) {
    console.error("Error in PATCH /api/albums/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/albums/[id]
 * Delete an album (photos are NOT deleted, just the album association)
 *
 * Security:
 * - Requires authenticated user
 * - Can only delete own albums
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

    // Verify album belongs to user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: album, error: fetchError } = await (supabase as any)
      .from("albums")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    // Delete album_photos first (foreign key constraint)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("album_photos")
      .delete()
      .eq("album_id", id);

    // Delete album
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (supabase as any)
      .from("albums")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting album:", deleteError);
      return NextResponse.json({ error: "Failed to delete album" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/albums/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
