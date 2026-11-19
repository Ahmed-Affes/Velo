import Link from "next/link";
import { Bike, Monitor, Smartphone, ShieldCheck, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <main className="bg-zellige min-h-screen px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-4 border-b-[1.5px] border-[#14232B] pb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-[6px] border-[1.5px] border-[#14232B] bg-[#0E5A6B] px-3 py-1 font-mono-sfax text-xs font-semibold text-[#FFFDF8]">
              <span>CYCLOSFAXCITY · SFAX</span>
            </div>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-[#14232B]">
              VéloSf
            </h1>
            <p className="mt-1 text-base text-[#14232B]/75">
              Système d&apos;information de gestion de vélos en libre-service — Thème « Salines de Sfax »
            </p>
          </div>
          <Link
            href="/login"
            className="btn-sfax-primary inline-flex items-center gap-2 px-5 py-3 text-sm"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Connexion personnel</span>
          </Link>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          <Link
            href="/borne"
            className="card-sfax group flex flex-col justify-between p-6 transition-transform hover:-translate-y-0.5"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-[6px] border-[1.5px] border-[#14232B] bg-[#F0A42B]">
                <Bike className="h-6 w-6 text-[#14232B]" />
              </div>
              <span className="mt-4 inline-block font-mono-sfax text-xs font-semibold uppercase text-[#0E5A6B]">
                Écrans K1 → K11
              </span>
              <h2 className="mt-1 text-xl font-semibold">Borne de station</h2>
              <p className="mt-2 text-sm text-[#14232B]/75">
                Interface tactile paysage pour abonnés (carte + code secret) et
                usagers occasionnels (carte courte durée, paiement, garantie).
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-[#0E5A6B] group-hover:underline">
              <span>Ouvrir la borne</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>

          <Link
            href="/admin"
            className="card-sfax group flex flex-col justify-between p-6 transition-transform hover:-translate-y-0.5"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-[6px] border-[1.5px] border-[#14232B] bg-[#0E5A6B] text-[#FFFDF8]">
                <Monitor className="h-6 w-6" />
              </div>
              <span className="mt-4 inline-block font-mono-sfax text-xs font-semibold uppercase text-[#0E5A6B]">
                Écrans R1 → R18
              </span>
              <h2 className="mt-1 text-xl font-semibold">
                Back-office Responsable
              </h2>
              <p className="mt-2 text-sm text-[#14232B]/75">
                Pilotage du réseau, parc de vélos, stations, fournisseurs,
                réclamations, réparations, itinéraires, ordres de mission et abonnés.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-[#0E5A6B] group-hover:underline">
              <span>Accéder au back-office</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>

          <Link
            href="/technicien"
            className="card-sfax group flex flex-col justify-between p-6 transition-transform hover:-translate-y-0.5"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-[6px] border-[1.5px] border-[#14232B] bg-[#5E7B3A] text-[#FFFDF8]">
                <Smartphone className="h-6 w-6" />
              </div>
              <span className="mt-4 inline-block font-mono-sfax text-xs font-semibold uppercase text-[#0E5A6B]">
                Écrans T1 → T4
              </span>
              <h2 className="mt-1 text-xl font-semibold">
                Application Technicien
              </h2>
              <p className="mt-2 text-sm text-[#14232B]/75">
                Application mobile terrain : contrôle journalier des vélos,
                exécution des missions de rééquilibrage et clôture des réparations.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-[#0E5A6B] group-hover:underline">
              <span>Ouvrir l&apos;app terrain</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
        </section>
      </div>
    </main>
  );
}
