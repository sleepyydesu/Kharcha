import { createContext, useContext, useState, useCallback } from "react";

const NotificationContext = createContext(null);

const STORAGE_KEY = "kharcha_notifications";

function loadFromStorage() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
        return [];
    }
}

function saveToStorage(notifications) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
}

export function NotificationProvider({ children }) {
    const [notifications, setNotifications] = useState(loadFromStorage);

    const addNotification = useCallback(
        ({ id, title, body, link, type = "info" }) => {
            setNotifications((prev) => {
                // Deduplicate by id
                if (id && prev.some((n) => n.id === id)) return prev;
                const next = [
                    {
                        id: id || Date.now().toString(),
                        title,
                        body,
                        link,
                        type,
                        read: false,
                        createdAt: Date.now(),
                    },
                    ...prev,
                ].slice(0, 20); // cap at 20
                saveToStorage(next);
                return next;
            });
        },
        [],
    );

    const markRead = useCallback((id) => {
        setNotifications((prev) => {
            const next = prev.map((n) =>
                n.id === id ? { ...n, read: true } : n,
            );
            saveToStorage(next);
            return next;
        });
    }, []);

    const markAllRead = useCallback(() => {
        setNotifications((prev) => {
            const next = prev.map((n) => ({ ...n, read: true }));
            saveToStorage(next);
            return next;
        });
    }, []);

    const dismiss = useCallback((id) => {
        setNotifications((prev) => {
            const next = prev.filter((n) => n.id !== id);
            saveToStorage(next);
            return next;
        });
    }, []);

    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                addNotification,
                markRead,
                markAllRead,
                dismiss,
                unreadCount,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const ctx = useContext(NotificationContext);
    if (!ctx)
        throw new Error(
            "useNotifications must be used inside NotificationProvider",
        );
    return ctx;
}
