"use client";

import { useEffect, useRef } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { VelosfRealtimeEvent } from "@/lib/realtime-types";

const VELOSF_LIVE_CHANNEL = "velosf-live";
const VELOSF_LIVE_EVENT = "velosf-event";

/**
 * S'abonne aux événements temps réel (Supabase Broadcast + postgres_changes)
 * avec synchronisation immédiate au retour sur l'onglet et repli par interrogation douce.
 */
export function useRealtimeRefresh(
  onRefresh: () => void | Promise<void>,
  channelName: string,
  pollMs = 8000,
  onEvent?: (event: VelosfRealtimeEvent) => void
) {
  const cbRef = useRef(onRefresh);
  cbRef.current = onRefresh;
  const eventRef = useRef(onEvent);
  eventRef.current = onEvent;

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    let broadcastChannel: ReturnType<
      NonNullable<ReturnType<typeof getSupabaseBrowser>>["channel"]
    > | null = null;
    let pgChannel: ReturnType<
      NonNullable<ReturnType<typeof getSupabaseBrowser>>["channel"]
    > | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const triggerRefresh = (immediate = false) => {
      if (timer) clearTimeout(timer);
      if (immediate) {
        try {
          void cbRef.current();
        } catch {
          // ignore refresh errors
        }
        return;
      }
      timer = setTimeout(() => {
        try {
          void cbRef.current();
        } catch {
          // ignore refresh errors
        }
      }, 150);
    };

    try {
      if (supabase) {
        broadcastChannel = supabase
          .channel(VELOSF_LIVE_CHANNEL, {
            config: { broadcast: { self: true } },
          })
          .on("broadcast", { event: VELOSF_LIVE_EVENT }, ({ payload }) => {
            if (payload && typeof payload === "object") {
              try {
                eventRef.current?.(payload as VelosfRealtimeEvent);
              } catch {
                // ignore handler errors
              }
            }
            triggerRefresh(true);
          })
          .subscribe();

        pgChannel = supabase
          .channel(channelName)
          .on("postgres_changes", { event: "*", schema: "public" }, () => {
            triggerRefresh(false);
          })
          .subscribe();
      }
    } catch {
      broadcastChannel = null;
      pgChannel = null;
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        triggerRefresh(true);
      }
    };
    const onFocus = () => triggerRefresh(true);

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        triggerRefresh(true);
      }
    }, pollMs);

    return () => {
      if (timer) clearTimeout(timer);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      try {
        if (supabase) {
          if (broadcastChannel) void supabase.removeChannel(broadcastChannel);
          if (pgChannel) void supabase.removeChannel(pgChannel);
        }
      } catch {
        // ignore cleanup errors
      }
    };
  }, [channelName, pollMs]);
}
