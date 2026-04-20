"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "@phosphor-icons/react";
import { getNotifications } from "../lib/api";
import type { Notification } from "../lib/types";

const PRIORITY_DOT: Record<Notification["priority"], string> = {
  critical: "bg-red-500",
  high: "bg-amber-500",
  medium: "bg-blue-500",
  low: "bg-gray-400",
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await getNotifications();
        if (!cancelled) setNotifications(data);
      } catch {
        // Silently fail — bell just won't show a count
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const count = notifications.length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-1.5 rounded-md hover:bg-surface-hover transition-colors cursor-pointer"
        aria-label={`Notifications${count > 0 ? ` (${count})` : ""}`}
      >
        <Bell size={20} weight="regular" className="text-ink-secondary" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-600 text-white font-mono text-[10px] font-medium rounded-md px-1 leading-none">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-surface border border-surface-border rounded-lg shadow-sm z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-border">
            <p className="font-mono text-xs uppercase tracking-wider text-ink-secondary">
              Notifications
            </p>
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-ink-tertiary">No notifications</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="px-4 py-3 border-b border-surface-border last:border-b-0 hover:bg-surface-hover transition-colors"
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`w-2 h-2 rounded-sm shrink-0 mt-1.5 ${PRIORITY_DOT[n.priority]}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink-primary leading-tight">
                        {n.title}
                      </p>
                      <p className="text-xs text-ink-secondary mt-0.5 line-clamp-2">
                        {n.description}
                      </p>
                      <p className="font-mono text-[10px] text-ink-tertiary mt-1">
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
