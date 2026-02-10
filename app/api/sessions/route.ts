import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

export type Session = {
  id: string;
  device_info: string | null;
  ip_address: string | null;
  user_agent: string | null;
  last_active_at: string;
  created_at: string;
  is_current: boolean;
};

// Parse user agent to get readable device info
function parseUserAgent(ua: string | null): string {
  if (!ua) return "Unknown device";

  const browser =
    ua.includes("Chrome") ? "Chrome" :
    ua.includes("Firefox") ? "Firefox" :
    ua.includes("Safari") ? "Safari" :
    ua.includes("Edge") ? "Edge" :
    "Browser";

  const os =
    ua.includes("Windows") ? "Windows" :
    ua.includes("Mac") ? "Mac" :
    ua.includes("Linux") ? "Linux" :
    ua.includes("iPhone") ? "iPhone" :
    ua.includes("iPad") ? "iPad" :
    ua.includes("Android") ? "Android" :
    "Unknown OS";

  return `${browser} on ${os}`;
}

// GET: List all active sessions for the user
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // Clean up expired sessions first
  await db
    .from("user_sessions")
    .delete()
    .eq("user_id", user.id)
    .lt("expires_at", new Date().toISOString());

  // Fetch active sessions
  const { data: sessions, error } = await db
    .from("user_sessions")
    .select("id, device_info, ip_address, user_agent, last_active_at, created_at, is_current")
    .eq("user_id", user.id)
    .order("last_active_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sessions: sessions || [] });
}

// POST: Create/update session (called on login or activity)
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const userAgent = request.headers.get("user-agent");
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() || realIp || "Unknown";

  const body = await request.json().catch(() => ({}));
  const sessionToken = body.sessionToken || randomUUID();
  const deviceInfo = parseUserAgent(userAgent);

  // Check if session already exists
  const { data: existing } = await db
    .from("user_sessions")
    .select("id")
    .eq("session_token", sessionToken)
    .single();

  if (existing) {
    // Update last_active_at
    await db
      .from("user_sessions")
      .update({ last_active_at: new Date().toISOString() })
      .eq("id", existing.id);

    return NextResponse.json({ sessionToken, updated: true });
  }

  // Mark all other sessions as not current
  await db
    .from("user_sessions")
    .update({ is_current: false })
    .eq("user_id", user.id);

  // Create new session
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry

  const { error } = await db.from("user_sessions").insert({
    user_id: user.id,
    session_token: sessionToken,
    device_info: deviceInfo,
    ip_address: ipAddress,
    user_agent: userAgent,
    is_current: true,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sessionToken, created: true });
}

// DELETE: Revoke a session (or all sessions)
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("id");
  const revokeAll = searchParams.get("all") === "true";

  if (revokeAll) {
    // Revoke all sessions except current
    const { error } = await db
      .from("user_sessions")
      .delete()
      .eq("user_id", user.id)
      .eq("is_current", false);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ revoked: "all_other_sessions" });
  }

  if (!sessionId) {
    return NextResponse.json({ error: "Session ID required" }, { status: 400 });
  }

  // Revoke specific session
  const { error } = await db
    .from("user_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ revoked: sessionId });
}
