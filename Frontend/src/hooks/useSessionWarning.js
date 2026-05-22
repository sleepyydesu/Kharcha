/**
 * useSessionWarning.js
 *
 * Fires a warning toast when the user has been idle for 25 minutes —
 * 5 minutes before the server's 30-minute inactivity window closes on
 * the refresh token (INACTIVITY_WINDOW_MS in tokenService.js).
 *
 * HOW THE SESSION ACTUALLY WORKS:
 *   - Access token  = 15-min JWT  (kharcha_access cookie, httpOnly)
 *   - Refresh token = opaque, expires after 30 min of no /auth/refresh calls
 *   - When the access token expires, api.js silently calls /auth/refresh and
 *     retries the original request — the user never sees this.
 *   - The user is only forced to log in if they make NO API calls for the
 *     full 30-minute inactivity window.
 *
 * WHAT WE TRACK:
 *   We do NOT track when the token was issued (that's reset every 15 min
 *   by the silent refresh, even if the user was idle).
 *   We track "kharcha_last_activity_at" — updated in api.js on every
 *   successful response. This is the true proxy for "is the user still
 *   actively using the app?"
 *
 *   Warning fires when:  Date.now() - lastActivityAt >= WARN_AT_MS (25 min)
 *   Session truly dies:  server rejects refresh after 30 min of no refreshes
 *
 * ZERO extra API requests — purely timer-based.
 */

import { useEffect, useRef } from "react";
import { useNotifications } from "../context/NotificationContext";

/** Must match INACTIVITY_WINDOW_MS in tokenService.js */
const SESSION_TTL_MS  = 30 * 60 * 1000;  // 30 min
/** Warn this far before the window closes */
const WARN_BEFORE_MS  =  5 * 60 * 1000;  //  5 min
const WARN_AT_MS      = SESSION_TTL_MS - WARN_BEFORE_MS; // 25 min

/** How often to check the clock */
const CHECK_INTERVAL_MS = 30_000; // 30 s

export const ACTIVITY_KEY = "kharcha_last_activity_at";

/**
 * Call this from api.js on every successful response to reset the idle clock.
 * Also call it from App.jsx on login.
 */
export function markActivity() {
    sessionStorage.setItem(ACTIVITY_KEY, String(Date.now()));
}

export default function useSessionWarning() {
    const { addNotification, dismiss } = useNotifications();
    const warnedRef = useRef(false);

    useEffect(() => {
        // Seed from sessionStorage on mount (survives a page reload mid-session)
        // If nothing is stored, treat now as the last activity (just logged in)
        if (!sessionStorage.getItem(ACTIVITY_KEY)) {
            markActivity();
        }

        const handleActivity = () => {
            // Any API call succeeded → idle clock resets, dismiss any open warning
            warnedRef.current = false;
            dismiss("session-expiring");
        };

        window.addEventListener("kharcha:activity", handleActivity);

        const timer = setInterval(() => {
            if (warnedRef.current) return;

            const lastActivity = parseInt(
                sessionStorage.getItem(ACTIVITY_KEY) ?? "0",
                10
            );
            const idle = Date.now() - lastActivity;

            if (idle >= WARN_AT_MS) {
                warnedRef.current = true;
                addNotification({
                    id:    "session-expiring",
                    type:  "warning",
                    title: "Session expiring soon",
                    body:  "You'll be signed out in 5 minutes due to inactivity. Make any request to stay signed in.",
                });
            }
        }, CHECK_INTERVAL_MS);

        return () => {
            window.removeEventListener("kharcha:activity", handleActivity);
            clearInterval(timer);
        };
    }, [addNotification, dismiss]);
}