import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  getUserStoragePublicInfo,
  upsertUserStorageConfig,
} from "@/lib/storage/user-storage";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const info = await getUserStoragePublicInfo(supabase, user.id);

    // Compute usage from DB (authoritative for app quota).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows, error } = await (supabase as any)
      .from("photos")
      .select("size_bytes")
      .eq("user_id", user.id);
    if (error) throw error;

    const usedBytes = (rows || []).reduce(
      (sum: number, r: { size_bytes: number }) => sum + (r.size_bytes || 0),
      0,
    );

    return NextResponse.json({
      ...info,
      usedBytes,
      photoCount: (rows || []).length,
    });
  } catch (error) {
    console.error("Error in GET /api/storage:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      provider?: "aws_s3";
      bucket: string;
      region: string;
      endpoint?: string | null;
      accessKeyId: string;
      secretAccessKey: string;
      quotaBytes?: number | null;
    };

    if (!body.bucket || !body.region || !body.accessKeyId || !body.secretAccessKey) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const info = await upsertUserStorageConfig(supabase, user.id, {
      provider: body.provider ?? "aws_s3",
      bucket: body.bucket.trim(),
      region: body.region.trim(),
      endpoint: body.endpoint ?? null,
      accessKeyId: body.accessKeyId.trim(),
      secretAccessKey: body.secretAccessKey.trim(),
      quotaBytes: body.quotaBytes ?? null,
    });

    return NextResponse.json(info, { status: 200 });
  } catch (error) {
    console.error("Error in POST /api/storage:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

