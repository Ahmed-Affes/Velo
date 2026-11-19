"use client";

import { useEffect, useRef } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";

/**
 * S'abonne aux changements PostgreSQL en temps réel (Supabase Realtime)
 * avec repli par interrogation périodique douce lorsque l'onglet est visible.
 */
export function useRealtimeRefresh(
  onRefresh: () => void | Promise<void>,
  channelName: string,
  pollMs = 5000
) {
  const cbRef = useRef(onRefresh);
  cbRef.current = onRefresh;

  useEffect(() => {
    let channel: ReturnType<NonNullable<ReturnType<typeof getSupabaseBrowser>>["channel"]> | null = null;
    const supabase = getSupabaseBrowser();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const trigger = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          void cbRef.current();
        } catch {
          // ignore refresh errors
        }
      }, 200);
    };

    try {
      if (supabase) {
        channel = supabase
          .channel(channelName)
          .on("postgres_changes", { event: "*", schema: "public" }, () => {
            trigger();
          })
          .subscribe();
      }
    } catch {
      channel = null;
    }

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        try {
          void cbRef.current();
        } catch {
          // ignore polling errors
        }
      }
    }, pollMs);

    return () => {
      if (timer) clearTimeout(timer);
      clearInterval(interval);
      try {
        if (channel && supabase) {
          void supabase.removeChannel(channel);
        }
      } catch {
        // ignore cleanup errors
      }
    };
  }, [channelName, pollMs]);
}
