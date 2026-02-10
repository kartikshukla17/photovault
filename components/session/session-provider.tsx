"use client";

import { useSessionManager } from "@/lib/session/use-session-manager";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  // Initialize session management (inactivity timeout, session tracking)
  useSessionManager();

  return <>{children}</>;
}
