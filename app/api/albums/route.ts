import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/albums
 * List all albums for the authenticated user
 *
 * Security:
 * - Requires authenticated user
 * - RLS ensures users only see their own albums
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get albums with photo counts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: albums, error } = await (supabase as any)
      .from("albums")
      .select(`
        *,
        album_photos (
          photo_id
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching albums:", error);
      return NextResponse.json({ error: "Failed to fetch albums" }, { status: 500 });
    }

    // Transform to include photo count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const albumsWithCount = (albums || []).map((album: any) => ({
      id: album.id,
      name: album.name,
      photoIds: album.album_photos?.map((ap: { photo_id: string }) => ap.photo_id) || [],
      createdAt: album.created_at,
    }));

    return NextResponse.json({ albums: albumsWithCount });
  } catch (error) {
    console.error("Error in GET /api/albums:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/albums
 * Create a new album
 *
 * Security:
 * - Requires authenticated user
 * - Album is automatically associated with the user
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Album name is required" }, { status: 400 });
    }

    // Check for duplicate album name
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from("albums")
      .select("id")
      .eq("user_id", user.id)
      .eq("name", name.trim())
      .single();

    if (existing) {
      return NextResponse.json({ error: "Album with this name already exists" }, { status: 409 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: album, error } = await (supabase as any)
      .from("albums")
      .insert({
        user_id: user.id,
        name: name.trim(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating album:", error);
      return NextResponse.json({ error: "Failed to create album" }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const albumData = album as any;
    return NextResponse.json({
      album: {
        id: albumData.id,
        name: albumData.name,
        photoIds: [],
        createdAt: albumData.created_at,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/albums:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
