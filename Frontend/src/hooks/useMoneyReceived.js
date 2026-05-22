/**
 * useMoneyReceived.js
 *
 * Detects incoming money and fires a "success" toast.
 *
 * STRATEGY — minimal API calls via the Page Visibility API:
 *
 *   1. On mount:  fetch /wallet once to seed the baseline balance.
 *   2. On tab focus (visibilitychange → visible): check again.
 *   3. Heartbeat: poll once per POLL_INTERVAL_MS while the tab is visible.
 *   4. While the tab is hidden: interval skips entirely.
 *
 * WHY NO sessionStorage:
 *   The baseline is kept in-memory only (a useRef). This means:
 *   - On mount (including after login): lastBalanceRef = null → first
 *     checkBalance() seeds the baseline without comparing → no notification.
 *   - Switching accounts: AppShell unmounts on logout, remounts on next
 *     login → hook resets naturally → no false "received money" from the
 *     new account having a higher balance than the previous one.
 *   - Page reload: same as mount — first check seeds silently.
 *
 *   Persisting to sessionStorage caused exactly the account-switch bug:
 *   old balance from account A would be compared against account B's
 *   higher starting balance, firing a bogus notification on login.
 */

import { useEffect, useRef, useCallback } from "react";
import { useNotifications } from "../context/NotificationContext";
import { getWallet } from "../services/api";

/** How often to check while the tab is visible */
const POLL_INTERVAL_MS = 60_000; // 1 min

export default function useMoneyReceived() {
    const { addNotification } = useNotifications();
    // Baseline is pure in-memory — resets on every mount (login / page reload)
    const lastBalanceRef = useRef(null);
    const timerRef       = useRef(null);
    // Prevent concurrent fetches (e.g. interval + visibilitychange firing together)
    const checkingRef    = useRef(false);

    const checkBalance = useCallback(async () => {
        if (checkingRef.current) return;
        checkingRef.current = true;

        try {
            const data = await getWallet({ trackActivity: false, skipSessionRefresh: true });
            const newBalance = parseFloat(data?.wallet?.balance ?? data?.balance);
            if (isNaN(newBalance)) return;

            const prev = lastBalanceRef.current;

            // Only notify if we already had a baseline (prev !== null) and
            // balance genuinely increased — never on the first check after mount.
            if (prev !== null && newBalance > prev) {
                const diff = (newBalance - prev).toLocaleString("en-NP", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                });
                addNotification({
                    id:    `received-${Date.now()}`,
                    type:  "success",
                    title: "Money received!",
                    body:  `Rs ${diff} has been added to your wallet.`,
                    link:  "/statements",
                });
            }

            lastBalanceRef.current = newBalance;
        } catch {
            // Silently swallow — background checks should never show error UI
        } finally {
            checkingRef.current = false;
        }
    }, [addNotification]);

    useEffect(() => {
        // Seed baseline on mount — prev is null so no notification fires
        checkBalance();

        // Re-check whenever the user switches back to this tab
        const handleVisibility = () => {
            if (document.visibilityState === "visible") checkBalance();
        };
        document.addEventListener("visibilitychange", handleVisibility);

        // Heartbeat: only fetches while the tab is actually visible
        timerRef.current = setInterval(() => {
            if (document.visibilityState === "visible") checkBalance();
        }, POLL_INTERVAL_MS);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibility);
            clearInterval(timerRef.current);
        };
    }, [checkBalance]);
}