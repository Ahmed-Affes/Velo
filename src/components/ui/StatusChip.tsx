"use client";

import {
  CheckCircle2,
  Navigation,
  AlertTriangle,
  Wrench,
  ArchiveX,
} from "lucide-react";
import type { EtatVelo } from "@/lib/supabase/types";

const CONFIG: Record<
  EtatVelo,
  {
    label: string;
    bg: string;
    text: string;
    Icon: typeof CheckCircle2;
    striped?: boolean;
  }
> = {
  DISPONIBLE: {
    label: "DISPONIBLE",
    bg: "bg-[#5E7B3A]/15 border-[#5E7B3A]",
    text: "text-[#3D5223]",
    Icon: CheckCircle2,
  },
  LOUE: {
    label: "LOUÉ",
    bg: "bg-[#0E5A6B]/15 border-[#0E5A6B]",
    text: "text-[#0E5A6B]",
    Icon: Navigation,
  },
  EN_PANNE: {
    label: "EN PANNE",
    bg: "bg-[#C8553D]/15 border-[#C8553D]",
    text: "text-[#9B3925]",
    Icon: AlertTriangle,
  },
  EN_REPARATION: {
    label: "EN RÉPARATION",
    bg: "bg-[#F0A42B]/20 border-[#B8740B]",
    text: "text-[#7A4B00]",
    Icon: Wrench,
  },
  REFORME: {
    label: "RÉFORMÉ",
    bg: "bg-[#7A7A72]/20 border-[#7A7A72]",
    text: "text-[#474742]",
    Icon: ArchiveX,
    striped: true,
  },
};

export function StatusChip({
  etat,
  size = "sm",
}: {
  etat: EtatVelo;
  size?: "sm" | "md";
}) {
  const cfg = CONFIG[etat];
  const Icon = cfg.Icon;
  return (
    <span
      className={`bike-tag inline-flex items-center gap-1.5 border-[1.5px] font-mono-sfax font-semibold uppercase tracking-wide ${
        cfg.bg
      } ${cfg.text} ${cfg.striped ? "bg-reforme-stripes" : ""} ${
        size === "sm" ? "px-2.5 py-0.5 text-[11px]" : "px-3 py-1 text-xs"
      }`}
    >
      <Icon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} strokeWidth={2} />
      <span>{cfg.label}</span>
    </span>
  );
}
