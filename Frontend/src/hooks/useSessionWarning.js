/**
 * useSessionWarning.js
 *
 * Keeps the backend session alive while the user is actively using the app,
 * and fires a warning toast 5 minutes before the server inactivity window closes.
 *
 * HOW THE SESSION ACTUALLY WORKS:
 *   - Access token  = 15-min JWT  (kharcha_access cookie, httpOnly)
 *   - Refresh token = opaque, expires after 30 min of no /auth/refresh calls
 *   - When the access token expires, api.js silently calls /auth/refresh and
 *     retries the original request — the user never sees this.
 *   - The user is only forced to log in if there is no API activity for the
 *     full 30-minute inactivity window.
 *
 * WHAT WE TRACK:
 *   We do NOT track when the token was issued (that's reset every 15 min
 *   by the silent refresh, even if the user was idle).
 *   We track "kharcha_last_activity_at" — updated in api.js on every
 *   successful response. This is the true proxy for "is the user still
 *   actively using the app?"
 *
 *   Active UI use triggers a lightweight /auth/refresh keep-alive after 10 min.
 *   Warning fires when:  Date.now() - lastActivityAt >= WARN_AT_MS (25 min)
 *   Session truly dies:  server rejects refresh after 30 min of no refreshes.
 */

import { useEffect, useRef } from "react";
import { useNotifications } from "../context/NotificationContext";
import { keepSessionAlive } from "../services/api";

/** Must stay safely below INACTIVITY_WINDOW_MS in tokenService.js. */
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 min
/** Warn this far before the window closes. */
const WARN_BEFORE_MS = 5 * 60 * 1000; // 5 min
const WARN_AT_MS = SESSION_TTL_MS - WARN_BEFORE_MS; // 25 min

/** Refresh the backend session while the user is actively using the app. */
const KEEP_ALIVE_AFTER_MS = 10 * 60 * 1000; // 10 min
/** Treat recent clicks/keys/scrolls/touches as active use. */
const ACTIVE_GRACE_MS = 2 * 60 * 1000; // 2 min

/** How often to check the clock. */
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
    const refreshingRef = useRef(false);
    const lastUiActivityRef = useRef(Date.now());

    useEffect(() => {
        // Seed from sessionStorage on mount (survives a page reload mid-session)
        // If nothing is stored, treat now as the last activity (just logged in)
        if (!sessionStorage.getItem(ACTIVITY_KEY)) {
            markActivity();
        }

        const handleActivity = () => {
            // Any API call succeeded → idle clock resets, dismiss any open warning.
            warnedRef.current = false;
            lastUiActivityRef.current = Date.now();
            dismiss("session-expiring");
        };

        const handleUiActivity = () => {
            lastUiActivityRef.current = Date.now();
        };

        window.addEventListener("kharcha:activity", handleActivity);
        ["click", "keydown", "mousemove", "scroll", "touchstart", "focus"].forEach((eventName) => {
            window.addEventListener(eventName, handleUiActivity, { passive: true });
        });

        const timer = setInterval(() => {
            const lastActivity = parseInt(
                sessionStorage.getItem(ACTIVITY_KEY) ?? "0",
                10
            );
            const idle = Date.now() - lastActivity;

            const userIsActive = Date.now() - lastUiActivityRef.current <= ACTIVE_GRACE_MS;

            if (userIsActive && idle >= KEEP_ALIVE_AFTER_MS && !refreshingRef.current) {
                refreshingRef.current = true;
                keepSessionAlive()
                    .then(() => {
                        markActivity();
                        window.dispatchEvent(new CustomEvent("kharcha:activity"));
                    })
                    .catch(() => {
                        // The shared API client/App will handle true expiry; avoid noisy duplicate errors here.
                    })
                    .finally(() => {
                        refreshingRef.current = false;
                    });
                return;
            }

            if (idle >= WARN_AT_MS && !warnedRef.current) {
                warnedRef.current = true;
                addNotification({
                    id:    "session-expiring",
                    type:  "warning",
                    title: "Session expiring soon",
                    body:  "You'll be signed out in 5 minutes due to inactivity. Move, click, or press a key to stay signed in.",
                });
            }
        }, CHECK_INTERVAL_MS);

        return () => {
            window.removeEventListener("kharcha:activity", handleActivity);
            ["click", "keydown", "mousemove", "scroll", "touchstart", "focus"].forEach((eventName) => {
                window.removeEventListener(eventName, handleUiActivity);
            });
            clearInterval(timer);
        };
    }, [addNotification, dismiss]);
}