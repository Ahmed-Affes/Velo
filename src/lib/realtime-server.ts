import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { VelosfRealtimeEvent } from "@/lib/realtime-types";

export const VELOSF_REALTIME_CHANNEL = "velosf-live";
export const VELOSF_REALTIME_EVENT = "velosf-event";

export async function broadcastVelosfEvent(
  event: Omit<VelosfRealtimeEvent, "id" | "at">
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const channel = supabase.channel(VELOSF_REALTIME_CHANNEL);
    const fullEvent: VelosfRealtimeEvent = {
      ...event,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      at: new Date().toISOString(),
    };
    try {
      await channel.httpSend(VELOSF_REALTIME_EVENT, fullEvent, {
        timeout: 3000,
      });
    } finally {
      await supabase.removeChannel(channel);
    }
  } catch {
    // Do not fail database mutations if Realtime broadcast fails
  }
}
