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
    const supabase = getSupabaseBrowser();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const trigger = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void cbRef.current();
      }, 200);
    };

    const channel = supabase
      ?.channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public" },
        () => {
          trigger();
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void cbRef.current();
      }
    }, pollMs);

    return () => {
      if (timer) clearTimeout(timer);
      clearInterval(interval);
      if (channel && supabase) {
        void supabase.removeChannel(channel);
      }
    };
  }, [channelName, pollMs]);
}
