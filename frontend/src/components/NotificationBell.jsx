import { useEffect, useRef, useState } from "react";
import api from "../services/api";

const POLL_MS = 15000;

export default function NotificationBell({ role }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef(null);

  const base = role === "admin" ? "/admin" : "/drivers";

  function load() {
    api
      .get(`${base}/notifications`)
      .then((res) => {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.unread_count);
      })
      .catch(() => {});
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleOpenNotification(n) {
    if (!n.is_read) {
      try {
        await api.patch(`${base}/notifications/${n.id}/read`);
        setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // ignore — non-critical
      }
    }
  }

  async function handleMarkAllRead() {
    try {
      await api.post(`${base}/notifications/read-all`);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg hover:bg-[var(--color-canvas)] transition-colors"
        aria-label="Notifications"
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-stop)] text-white text-[10px] font-semibold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-h-[28rem] overflow-y-auto bg-[var(--color-panel)] border border-[var(--color-line)] rounded-xl shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-line)]">
            <p className="text-sm font-semibold text-[var(--color-ink)]">Notifications</p>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-[var(--color-route)] hover:underline">
                Mark all as read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-sm text-center text-[var(--color-slate)]">No notifications yet.</p>
          ) : (
            <ul>
              {notifications.map((n) => (
                <li
                  key={n.id}
                  onClick={() => handleOpenNotification(n)}
                  className={`px-4 py-3 border-b border-[var(--color-line)] last:border-0 cursor-pointer hover:bg-[var(--color-canvas)] ${
                    !n.is_read ? "bg-[var(--color-amber)]/5" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm ${!n.is_read ? "font-semibold text-[var(--color-ink)]" : "text-[var(--color-ink)]"}`}>
                      {n.title}
                    </p>
                    {!n.is_read && <span className="w-2 h-2 mt-1.5 rounded-full bg-[var(--color-stop)] shrink-0" />}
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--color-slate)]">{n.message}</p>
                  <p className="mt-1 text-[10px] text-[var(--color-slate)]">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
