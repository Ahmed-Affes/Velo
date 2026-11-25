"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import type {
  Station,
  Velo,
  Reclamation,
  OrdreMission,
  Camion,
  LocationRow,
} from "@/lib/supabase/types";
import { SfaxMap } from "@/components/ui/SfaxMap";
import { SlotTicks } from "@/components/ui/SlotTicks";
import { formatDateTime } from "@/lib/format";

export type AdminRoute =
  | "R1"
  | "R2"
  | "R3"
  | "R4"
  | "R5"
  | "R6"
  | "R7"
  | "R9"
  | "R10"
  | "R11"
  | "R12"
  | "R13"
  | "R14"
  | "R15"
  | "R16"
  | "R17"
  | "R18";

export function TableauDeBordView({
  stations,
  velos,
  reclamations,
  ordresMission,
  camions,
  locations,
  onNavigate,
}: {
  stations: Station[];
  velos: Velo[];
  reclamations: Reclamation[];
  ordresMission: OrdreMission[];
  camions: Camion[];
  locations: LocationRow[];
  onNavigate: (route: AdminRoute) => void;
}) {
  const enService = velos.filter((v) => v.etat === "DISPONIBLE").length;
  const loues = velos.filter((v) => v.etat === "LOUE").length;
  const enPanne = velos.filter((v) => v.etat === "EN_PANNE").length;
  const enRep = velos.filter((v) => v.etat === "EN_REPARATION").length;

  const recNonTraitees = reclamations.filter((r) => !r.traitee).length;
  const camionsIndispo = camions.filter((c) => !c.disponible).length;
  const missionsEnAttente = ordresMission.filter(
    (o) => o.statut === "NON_DEMARRE"
  ).length;

  const todayHours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
  const hourlyCounts = todayHours.map((h) => {
    const c = locations.filter(
      (l) => new Date(l.date_heure_debut).getHours() === h
    ).length;
    return { hour: `${h}h`, count: c };
  });
  const maxHour = Math.max(1, ...hourlyCounts.map((x) => x.count));

  return (
    <div className="space-y-6">
      {/* Bandeau compact 4 chiffres en ligne (pas de grille de cartes identiques) */}
      <div className="card-sfax-flat flex flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-baseline gap-2">
          <span className="font-mono-sfax text-2xl font-bold text-[#5E7B3A]">
            {enService}
          </span>
          <span className="text-sm font-medium">vélos en service</span>
        </div>
        <div className="h-5 w-[1px] bg-[#E3D9C6]" />
        <div className="flex items-baseline gap-2">
          <span className="font-mono-sfax text-2xl font-bold text-[#0E5A6B]">
            {loues}
          </span>
          <span className="text-sm font-medium">en location</span>
        </div>
        <div className="h-5 w-[1px] bg-[#E3D9C6]" />
        <div className="flex items-baseline gap-2">
          <span className="font-mono-sfax text-2xl font-bold text-[#C8553D]">
            {enPanne}
          </span>
          <span className="text-sm font-medium">en panne</span>
        </div>
        <div className="h-5 w-[1px] bg-[#E3D9C6]" />
        <div className="flex items-baseline gap-2">
          <span className="font-mono-sfax text-2xl font-bold text-[#B8740B]">
            {enRep}
          </span>
          <span className="text-sm font-medium">en réparation</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Carte réseau de Sfax */}
        <div className="lg:col-span-2">
          <SfaxMap stations={stations} />
        </div>

        {/* Colonne droite : À traiter aujourd'hui */}
        <div className="card-sfax p-5">
          <h3 className="text-lg font-bold">À traiter aujourd&apos;hui</h3>
          {recNonTraitees === 0 &&
          enPanne === 0 &&
          camionsIndispo === 0 &&
          missionsEnAttente === 0 ? (
            <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-[#5E7B3A]">
              <CheckCircle2 className="h-5 w-5" />
              <span>Rien à traiter — le réseau est calme.</span>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={() => onNavigate("R9")}
                className="flex w-full items-center justify-between rounded-[6px] border border-[#14232B] bg-[#F6F1E7] p-3 text-left hover:bg-[#E3D9C6]"
              >
                <div>
                  <p className="text-sm font-semibold">
                    Réclamations non traitées
                  </p>
                  <p className="font-mono-sfax text-xs text-[#C8553D]">
                    {recNonTraitees} en attente
                  </p>
                </div>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate("R3")}
                className="flex w-full items-center justify-between rounded-[6px] border border-[#14232B] bg-[#F6F1E7] p-3 text-left hover:bg-[#E3D9C6]"
              >
                <div>
                  <p className="text-sm font-semibold">
                    Vélos en panne sans réparation
                  </p>
                  <p className="font-mono-sfax text-xs text-[#B8740B]">
                    {enPanne} vélo(s)
                  </p>
                </div>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate("R14")}
                className="flex w-full items-center justify-between rounded-[6px] border border-[#14232B] bg-[#F6F1E7] p-3 text-left hover:bg-[#E3D9C6]"
              >
                <div>
                  <p className="text-sm font-semibold">
                    Missions non démarrées
                  </p>
                  <p className="font-mono-sfax text-xs text-[#0E5A6B]">
                    {missionsEnAttente} ordre(s)
                  </p>
                </div>
                <ArrowRight className="h-4 w-4" />
              </button>

              {camionsIndispo > 0 && (
                <button
                  type="button"
                  onClick={() => onNavigate("R15")}
                  className="flex w-full items-center justify-between rounded-[6px] border border-[#C8553D] bg-[#C8553D]/10 p-3 text-left"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#9B3925]">
                      Camions indisponibles
                    </p>
                    <p className="font-mono-sfax text-xs">{camionsIndispo}</p>
                  </div>
                  <AlertTriangle className="h-4 w-4 text-[#C8553D]" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Histogramme locations par heure */}
      <div className="card-sfax-flat p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold">Locations par heure</h3>
          <span className="font-mono-sfax text-xs text-[#0E5A6B]">
            Total observé : {locations.length}
          </span>
        </div>
        {locations.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#14232B]/65">
            Aucune location enregistrée pour le moment.
          </p>
        ) : (
          <div className="flex h-32 items-end gap-2">
            {hourlyCounts.map((item) => (
              <div key={item.hour} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t border border-[#14232B] bg-[#0E5A6B]"
                  style={{
                    height: `${Math.max(8, (item.count / maxHour) * 100)}%`,
                  }}
                />
                <span className="font-mono-sfax text-[11px]">{item.hour}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function MouvementsView({
  stations,
  locations,
  onPrefillItinerary,
}: {
  stations: Station[];
  locations: LocationRow[];
  onPrefillItinerary: (fromId: number, toId: number, count: number) => void;
}) {
  const [period, setPeriod] = useState<"TODAY" | "7D">("TODAY");

  const surplus = stations
    .filter((s) => s.nb_velos_actuel / Math.max(1, s.capacite) >= 0.7)
    .sort((a, b) => b.nb_velos_actuel - a.nb_velos_actuel);
  const deficit = stations
    .filter((s) => s.nb_velos_actuel / Math.max(1, s.capacite) <= 0.3)
    .sort((a, b) => a.nb_velos_actuel - b.nb_velos_actuel);

  const suggestions = surplus.flatMap((src, idx) => {
    const dst = deficit[idx];
    if (!dst) return [];
    const qty = Math.min(4, Math.max(1, Math.floor(src.nb_velos_actuel / 3)));
    return [{ src, dst, qty }];
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">
          Mouvements et équilibre du réseau
        </h2>
        <div className="flex gap-2">
          {(["TODAY", "7D"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-[6px] border-[1.5px] border-[#14232B] px-3 py-1.5 text-xs font-semibold ${
                period === p ? "bg-[#0E5A6B] text-white" : "bg-[#FFFDF8]"
              }`}
            >
              {p === "TODAY" ? "Aujourd'hui" : "7 derniers jours"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {stations.length === 0 ? (
            <div className="card-sfax-flat p-8 text-center text-sm text-[#14232B]/70">
              Aucune station enregistrée pour le moment.
            </div>
          ) : (
            stations.map((s) => {
            const ratio = s.nb_velos_actuel / Math.max(1, s.capacite);
            const tag =
              ratio <= 0.3 ? "Déficit" : ratio >= 0.7 ? "Surplus" : "Équilibrée";
            const dep = locations.filter(
              (l) => l.id_station_depart === s.id_station
            ).length;
            const arr = locations.filter(
              (l) => l.id_station_arrivee_reelle === s.id_station
            ).length;
            return (
              <div
                key={s.id_station}
                className="card-sfax-flat flex flex-wrap items-center justify-between gap-4 p-4"
              >
                <div className="min-w-[200px]">
                  <p className="font-heading font-semibold">{s.nom}</p>
                  <p className="font-mono-sfax text-xs text-[#0E5A6B]">
                    Départs: {dep} · Arrivées: {arr} · Flux net: {arr - dep}
                  </p>
                </div>
                <SlotTicks
                  occupied={s.nb_velos_actuel}
                  capacity={s.capacite}
                  size="sm"
                />
                <span
                  className={`rounded border border-[#14232B] px-2.5 py-0.5 font-mono-sfax text-xs font-semibold ${
                    tag === "Déficit"
                      ? "bg-[#C8553D]/15 text-[#9B3925]"
                      : tag === "Surplus"
                      ? "bg-[#F0A42B]/25 text-[#7A4B00]"
                      : "bg-[#5E7B3A]/15 text-[#3D5223]"
                  }`}
                >
                  {tag}
                </span>
              </div>
            );
          })
          )}
        </div>

        {/* Suggestions de transferts */}
        <div className="card-sfax p-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#0E5A6B]" />
            <h3 className="text-lg font-bold">Suggestions de transferts</h3>
          </div>
          {suggestions.length === 0 ? (
            <p className="mt-4 text-sm font-semibold text-[#5E7B3A]">
              Réseau équilibré — aucune mission nécessaire.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {suggestions.map((sug, i) => (
                <div
                  key={i}
                  className="rounded-[6px] border border-[#14232B] bg-[#F6F1E7] p-3 text-sm"
                >
                  <p>
                    Prendre <strong>{sug.qty} vélos</strong> à{" "}
                    <strong>{sug.src.nom}</strong> → déposer à{" "}
                    <strong>{sug.dst.nom}</strong>
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      onPrefillItinerary(
                        sug.src.id_station,
                        sug.dst.id_station,
                        sug.qty
                      )
                    }
                    className="btn-sfax-primary mt-2 w-full py-1.5 text-xs"
                  >
                    Créer l&apos;itinéraire
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dernières locations */}
      <div className="card-sfax-flat overflow-x-auto">
        {locations.length === 0 ? (
          <p className="p-8 text-center text-sm text-[#14232B]/70">
            Aucune location enregistrée pour le moment.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b-[1.5px] border-[#14232B] bg-[#F6F1E7] font-mono-sfax text-xs uppercase">
              <tr>
                <th className="p-3">ID</th>
                <th className="p-3">Vélo</th>
                <th className="p-3">Départ</th>
                <th className="p-3">Arrivée</th>
                <th className="p-3">Début</th>
                <th className="p-3">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3D9C6]">
              {locations.slice(0, 8).map((l) => (
                <tr key={l.id_location}>
                  <td className="p-3 font-mono-sfax">#{l.id_location}</td>
                  <td className="p-3 font-mono-sfax font-semibold">{l.num_serie}</td>
                  <td className="p-3">
                    {stations.find((s) => s.id_station === l.id_station_depart)?.nom}
                  </td>
                  <td className="p-3">
                    {l.id_station_arrivee_reelle
                      ? stations.find((s) => s.id_station === l.id_station_arrivee_reelle)?.nom
                      : "—"}
                  </td>
                  <td className="p-3 font-mono-sfax text-xs">
                    {formatDateTime(l.date_heure_debut)}
                  </td>
                  <td className="p-3 font-mono-sfax text-xs">
                    {l.date_heure_fin ? "Clôturée" : "En cours"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
