"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const SESSION_TOKEN_KEY = "pv_session_token";
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_UPDATE_INTERVAL_MS = 5 * 60 * 1000; // Update server every 5 minutes

export function useSessionManager() {
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const activityUpdateRef = useRef<NodeJS.Timeout | null>(null);

  // Get or create session token
  const getSessionToken = useCallback(() => {
    if (typeof window === "undefined") return null;
    let token = localStorage.getItem(SESSION_TOKEN_KEY);
    if (!token) {
      token = crypto.randomUUID();
      localStorage.setItem(SESSION_TOKEN_KEY, token);
    }
    return token;
  }, []);

  // Clear session token on logout
  const clearSessionToken = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(SESSION_TOKEN_KEY);
  }, []);

  // Logout due to inactivity
  const handleInactivityLogout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearSessionToken();
    router.push("/login?reason=inactivity");
  }, [router, clearSessionToken]);

  // Reset inactivity timer
  const resetInactivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      handleInactivityLogout();
    }, INACTIVITY_TIMEOUT_MS);
  }, [handleInactivityLogout]);

  // Register/update session on server
  const updateServerSession = useCallback(async () => {
    const token = getSessionToken();
    if (!token) return;

    try {
      await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken: token }),
      });
    } catch (err) {
      console.error("Failed to update session:", err);
    }
  }, [getSessionToken]);

  // Initialize session management
  useEffect(() => {
    // Register session on mount
    updateServerSession();

    // Set up activity listeners
    const activityEvents = ["mousedown", "keydown", "touchstart", "scroll"];

    const handleActivity = () => {
      resetInactivityTimer();
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Start inactivity timer
    resetInactivityTimer();

    // Periodically update server with last activity
    activityUpdateRef.current = setInterval(() => {
      updateServerSession();
    }, ACTIVITY_UPDATE_INTERVAL_MS);

    // Cleanup
    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (activityUpdateRef.current) {
        clearInterval(activityUpdateRef.current);
      }
    };
  }, [resetInactivityTimer, updateServerSession]);

  return {
    getSessionToken,
    clearSessionToken,
    resetInactivityTimer,
  };
}
