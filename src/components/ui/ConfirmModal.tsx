"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

export function ConfirmModal({
  open,
  title,
  objectName,
  description,
  confirmLabel = "Confirmer",
  requireTypedMatch,
  danger = true,
  loading = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  objectName: string;
  description: string;
  confirmLabel?: string;
  requireTypedMatch?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}) {
  const [typed, setTyped] = useState("");
  if (!open) return null;

  const canConfirm =
    !requireTypedMatch || typed.trim() === requireTypedMatch.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#14232B]/55 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="card-sfax w-full max-w-md p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-[6px] border-[1.5px] border-[#14232B] ${
                danger ? "bg-[#C8553D] text-white" : "bg-[#F0A42B] text-[#14232B]"
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#14232B]">{title}</h3>
              <p className="font-mono-sfax text-xs text-[#0E5A6B]">{objectName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 hover:bg-[#E3D9C6]"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-[#14232B]/85">
          {description}
        </p>

        {requireTypedMatch && (
          <div className="mt-4">
            <label className="block text-xs font-semibold uppercase tracking-wide text-[#14232B]">
              Saisissez{" "}
              <span className="font-mono-sfax text-[#C8553D]">
                {requireTypedMatch}
              </span>{" "}
              pour confirmer
            </label>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={requireTypedMatch}
              className="mt-1.5 w-full rounded-[6px] border-[1.5px] border-[#14232B] bg-[#F6F1E7] px-3 py-2 font-mono-sfax text-sm"
            />
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn-sfax-outline px-4 py-2 text-sm"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={!canConfirm || loading}
            onClick={onConfirm}
            className={`rounded-[6px] border-[1.5px] border-[#14232B] px-4 py-2 text-sm font-semibold shadow-[3px_3px_0_#14232B] disabled:opacity-45 ${
              danger
                ? "bg-[#C8553D] text-white"
                : "bg-[#F0A42B] text-[#14232B]"
            }`}
          >
            {loading ? "Traitement..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
