"use client";

import { useState } from "react";
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  CheckCheck,
} from "lucide-react";
import type { VelosfEventSeverity } from "@/lib/realtime-types";
import { formatTime } from "@/lib/format";

export interface AppNotificationItem {
  id: string;
  at: string;
  severity: VelosfEventSeverity;
  title: string;
  message: string;
  route?: string;
  read: boolean;
  persistent?: boolean;
}

const SEVERITY_STYLE: Record<
  VelosfEventSeverity,
  { badge: string; border: string; Icon: typeof Info }
> = {
  alert: {
    badge: "bg-[#C8553D] text-white",
    border: "border-[#C8553D] bg-[#C8553D]/10",
    Icon: AlertTriangle,
  },
  warning: {
    badge: "bg-[#F0A42B] text-[#14232B]",
    border: "border-[#B8740B] bg-[#F0A42B]/15",
    Icon: AlertTriangle,
  },
  success: {
    badge: "bg-[#5E7B3A] text-white",
    border: "border-[#5E7B3A] bg-[#5E7B3A]/10",
    Icon: CheckCircle2,
  },
  info: {
    badge: "bg-[#0E5A6B] text-white",
    border: "border-[#0E5A6B] bg-[#0E5A6B]/10",
    Icon: Info,
  },
};

export function NotificationBell({
  items,
  onMarkRead,
  onMarkAllRead,
  onSelectRoute,
}: {
  items: AppNotificationItem[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onSelectRoute?: (route: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const unreadCount = items.filter((i) => !i.read).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-[6px] border border-[#14232B] bg-[#F6F1E7] p-2 hover:bg-[#E3D9C6]"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border border-[#14232B] bg-[#C8553D] px-1 font-mono-sfax text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="card-sfax absolute right-0 z-50 mt-2 w-80 overflow-hidden sm:w-96">
            <div className="flex items-center justify-between border-b border-[#E3D9C6] bg-[#F6F1E7] px-4 py-2.5">
              <span className="font-mono-sfax text-xs font-bold uppercase text-[#0E5A6B]">
                Notifications ({unreadCount} non lue{unreadCount > 1 ? "s" : ""})
              </span>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={onMarkAllRead}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#0E5A6B] hover:underline"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Tout lire
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded p-0.5 hover:bg-[#E3D9C6]"
                  aria-label="Fermer les notifications"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="max-h-96 divide-y divide-[#E3D9C6] overflow-y-auto bg-[#FFFDF8]">
              {items.length === 0 ? (
                <p className="p-6 text-center text-sm text-[#14232B]/70">
                  Aucune notification pour le moment.
                </p>
              ) : (
                items.map((item) => {
                  const cfg = SEVERITY_STYLE[item.severity];
                  const Icon = cfg.Icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onMarkRead(item.id);
                        if (item.route && onSelectRoute) {
                          onSelectRoute(item.route);
                        }
                        setOpen(false);
                      }}
                      className={`flex w-full items-start gap-3 p-3.5 text-left transition-colors hover:bg-[#F6F1E7] ${
                        item.read ? "opacity-70" : "bg-[#F0A42B]/10"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded border border-[#14232B] ${cfg.badge}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-bold text-[#14232B]">
                            {item.title}
                          </p>
                          <span className="shrink-0 font-mono-sfax text-[10px] text-[#0E5A6B]">
                            {item.persistent ? "En attente" : formatTime(item.at)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-[#14232B]/80">
                          {item.message}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function LiveToastBanner({
  toast,
  onDismiss,
  onClick,
}: {
  toast: {
    severity: VelosfEventSeverity;
    title: string;
    message: string;
    route?: string;
  } | null;
  onDismiss: () => void;
  onClick?: (route: string) => void;
}) {
  if (!toast) return null;
  const cfg = SEVERITY_STYLE[toast.severity];
  const Icon = cfg.Icon;

  return (
    <div
      className={`card-sfax fixed bottom-20 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] items-start gap-3 border-[1.5px] p-4 shadow-xl lg:bottom-5 ${cfg.border}`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[#14232B] ${cfg.badge}`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div
        className={`min-w-0 flex-1 ${toast.route && onClick ? "cursor-pointer" : ""}`}
        onClick={() => {
          if (toast.route && onClick) {
            onClick(toast.route);
            onDismiss();
          }
        }}
      >
        <p className="text-sm font-bold text-[#14232B]">{toast.title}</p>
        <p className="mt-0.5 text-xs text-[#14232B]/85">{toast.message}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded p-0.5 hover:bg-[#14232B]/10"
        aria-label="Fermer l'alerte"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
