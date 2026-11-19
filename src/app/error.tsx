"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="bg-zellige flex min-h-screen items-center justify-center p-6">
      <div className="card-sfax w-full max-w-lg space-y-4 p-8">
        <div className="flex items-center gap-3 text-[#C8553D]">
          <AlertTriangle className="h-7 w-7 shrink-0" />
          <h1 className="text-2xl font-bold text-[#14232B]">
            Une erreur est survenue
          </h1>
        </div>
        <p className="rounded border border-[#E3D9C6] bg-[#F6F1E7] p-3 font-mono-sfax text-xs text-[#9B3925]">
          {error.message || "Erreur inattendue."}
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="btn-sfax-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </button>
          <Link href="/" className="btn-sfax-outline px-5 py-2.5 text-sm">
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </main>
  );
}
