"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

type Session = {
  id: string;
  device_info: string | null;
  ip_address: string | null;
  last_active_at: string;
  created_at: string;
  is_current: boolean;
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function SessionsCard() {
  const [sessions, setSessions] = React.useState<Session[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [revoking, setRevoking] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const fetchSessions = React.useCallback(async () => {
    try {
      const res = await fetch("/api/sessions");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load sessions");
      setSessions(data.sessions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleRevokeSession = async (sessionId: string) => {
    setRevoking(sessionId);
    setError(null);
    try {
      const res = await fetch(`/api/sessions?id=${sessionId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to revoke session");
      }
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke session");
    } finally {
      setRevoking(null);
    }
  };

  const handleRevokeAll = async () => {
    setRevoking("all");
    setError(null);
    try {
      const res = await fetch("/api/sessions?all=true", {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to revoke sessions");
      }
      setSessions((prev) => prev.filter((s) => s.is_current));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke sessions");
    } finally {
      setRevoking(null);
    }
  };

  const otherSessions = sessions.filter((s) => !s.is_current);

  return (
    <div
      className={cn(
        "mt-[14px] p-[16px] rounded-[14px]",
        "bg-[#0d0d0d] border border-bg-border"
      )}
    >
      <div className="flex items-center justify-between gap-4 mb-[12px]">
        <div className="text-[14px] font-semibold text-text-primary">
          Active Sessions
        </div>
        <div className="text-[10px] text-text-muted bg-[#141414] px-[9px] py-[3px] rounded-[10px] border border-bg-border">
          {sessions.length} {sessions.length === 1 ? "session" : "sessions"}
        </div>
      </div>

      <div className="text-[11px] text-text-muted mb-3">
        Sessions auto-expire after 30 minutes of inactivity. You can revoke access from other devices here.
      </div>

      {loading ? (
        <div className="text-[12px] text-text-muted py-4 text-center">
          Loading sessions...
        </div>
      ) : error ? (
        <div className="text-[12px] text-danger py-2">{error}</div>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={cn(
                "flex items-center justify-between gap-3 p-3 rounded-[10px]",
                "bg-bg-elevated border",
                session.is_current
                  ? "border-accent-primary/30 bg-accent-glow/5"
                  : "border-bg-border"
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-text-primary truncate">
                    {session.device_info || "Unknown device"}
                  </span>
                  {session.is_current && (
                    <span className="text-[9px] text-accent-primary bg-accent-glow px-[6px] py-[2px] rounded-[6px] border border-accent-primary/25 whitespace-nowrap">
                      Current
                    </span>
                  )}
                </div>
                <div className="mt-1 text-[11px] text-text-muted">
                  {session.ip_address || "Unknown IP"} · Last active{" "}
                  {formatRelativeTime(session.last_active_at)}
                </div>
              </div>
              {!session.is_current && (
                <button
                  onClick={() => handleRevokeSession(session.id)}
                  disabled={revoking === session.id}
                  className={cn(
                    "text-[11px] text-danger hover:text-danger/80 transition-colors",
                    "disabled:opacity-50"
                  )}
                >
                  {revoking === session.id ? "..." : "Revoke"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {otherSessions.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#141414]">
          <Button
            variant="secondary"
            className="w-full text-[12px]"
            onClick={handleRevokeAll}
            disabled={revoking === "all"}
          >
            {revoking === "all" ? "Revoking..." : "Sign Out All Other Sessions"}
          </Button>
        </div>
      )}
    </div>
  );
}
