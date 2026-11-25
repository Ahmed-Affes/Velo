"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Eye,
  Pencil,
  Truck,
  X,
} from "lucide-react";
import type {
  Reclamation,
  Reparation,
  Personnel,
  Velo,
  Station,
  EtapeItineraire,
  OrdreMission,
  Camion,
  Entrepot,
  StatutOrdreMission,
} from "@/lib/supabase/types";
import { SfaxMap } from "@/components/ui/SfaxMap";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { formatDate, isValidPlate } from "@/lib/format";
import {
  planifierReparationAction,
  rouvrirReparationAction,
  createItineraireEtMissionAction,
  updateOrdreMissionAction,
  deleteOrdreMissionAction,
  createCamionAction,
  updateCamionAction,
  deleteCamionAction,
  toggleCamionDisponibleAction,
} from "@/app/actions/admin";

export function ReclamationsView({
  reclamations,
  personnel,
  onPlanifier,
  onSelectBike,
}: {
  reclamations: Reclamation[];
  personnel: Personnel[];
  onPlanifier: (idReclamation: number) => void;
  onSelectBike: (numSerie: string) => void;
}) {
  const [tab, setTab] = useState<"NON_TRAITEES" | "TRAITEES">("NON_TRAITEES");
  const [selectedId, setSelectedId] = useState<number | null>(
    reclamations.find((r) => !r.traitee)?.id_reclamation ?? null
  );

  const list = reclamations.filter((r) =>
    tab === "NON_TRAITEES" ? !r.traitee : r.traitee
  );
  const selected =
    list.find((r) => r.id_reclamation === selectedId) ?? list[0] ?? null;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("NON_TRAITEES")}
          className={`rounded-[6px] border-[1.5px] border-[#14232B] px-4 py-2 text-sm font-semibold ${
            tab === "NON_TRAITEES" ? "bg-[#0E5A6B] text-white" : "bg-[#FFFDF8]"
          }`}
        >
          Non traitées ({reclamations.filter((r) => !r.traitee).length})
        </button>
        <button
          type="button"
          onClick={() => setTab("TRAITEES")}
          className={`rounded-[6px] border-[1.5px] border-[#14232B] px-4 py-2 text-sm font-semibold ${
            tab === "TRAITEES" ? "bg-[#0E5A6B] text-white" : "bg-[#FFFDF8]"
          }`}
        >
          Traitées ({reclamations.filter((r) => r.traitee).length})
        </button>
      </div>

      {list.length === 0 ? (
        <div className="card-sfax p-8 text-center font-semibold text-[#5E7B3A]">
          <CheckCircle2 className="mx-auto mb-2 h-8 w-8" />
          Aucune réclamation dans cet onglet.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="card-sfax-flat divide-y divide-[#E3D9C6]">
            {list.map((r) => {
              const ageDays = Math.floor(
                (Date.now() - new Date(r.date_reclamation).getTime()) /
                  86400000
              );
              const tech = personnel.find(
                (p) => p.matricule === r.matricule_technicien
              );
              return (
                <button
                  key={r.id_reclamation}
                  type="button"
                  onClick={() => setSelectedId(r.id_reclamation)}
                  className={`w-full p-4 text-left hover:bg-[#F6F1E7] ${
                    selected?.id_reclamation === r.id_reclamation
                      ? "bg-[#F0A42B]/20"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono-sfax text-base font-bold">
                      {r.num_serie}
                    </span>
                    {ageDays > 3 && !r.traitee && (
                      <span className="rounded bg-[#C8553D] px-2 py-0.5 font-mono-sfax text-xs font-bold text-white">
                        {ageDays} j
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-[#14232B]/80">
                    {r.diagnostic}
                  </p>
                  <p className="mt-1 font-mono-sfax text-xs text-[#0E5A6B]">
                    {tech?.prenom} {tech?.nom} · {formatDate(r.date_reclamation)}
                  </p>
                </button>
              );
            })}
          </div>

          {selected && (
            <div className="card-sfax space-y-4 p-6 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h3 className="font-mono-sfax text-2xl font-bold">
                  Réclamation #{selected.id_reclamation} — {selected.num_serie}
                </h3>
                <span className="font-mono-sfax text-sm">
                  {formatDate(selected.date_reclamation)}
                </span>
              </div>
              <p className="rounded border border-[#E3D9C6] bg-[#F6F1E7] p-4 text-base">
                {selected.diagnostic}
              </p>
              <div className="flex flex-wrap gap-3">
                {!selected.traitee && (
                  <button
                    type="button"
                    onClick={() => onPlanifier(selected.id_reclamation)}
                    className="btn-sfax-primary px-5 py-2.5 text-sm"
                  >
                    Planifier une réparation
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onSelectBike(selected.num_serie)}
                  className="btn-sfax-outline px-4 py-2.5 text-sm"
                >
                  Voir la fiche du vélo
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PlanifierReparationView({
  reclamation,
  personnel,
  reparations,
  onDone,
}: {
  reclamation: Reclamation;
  personnel: Personnel[];
  reparations: Reparation[];
  onDone: () => Promise<void>;
}) {
  const techs = personnel.filter((p) => p.role === "TECHNICIEN" && p.actif);
  const [techMat, setTechMat] = useState<number>(techs[0]?.matricule ?? 0);
  const [datePlan, setDatePlan] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [err, setErr] = useState<string | null>(null);

  const conflict = reparations.some(
    (r) =>
      r.matricule_technicien === techMat &&
      r.date_planifiee === datePlan &&
      r.statut !== "TERMINEE"
  );

  return (
    <div className="card-sfax mx-auto max-w-3xl space-y-5 p-6">
      <h2 className="text-2xl font-bold">
        Planifier une réparation — {reclamation.num_serie}
      </h2>
      <p className="rounded bg-[#F6F1E7] p-3 text-base">
        {reclamation.diagnostic}
      </p>

      {err && (
        <div className="rounded border border-[#C8553D] bg-[#C8553D]/12 p-3 text-sm text-[#9B3925]">
          {err}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {techs.length === 0 ? (
          <p className="md:col-span-2 rounded-[6px] border border-[#E3D9C6] bg-[#F6F1E7] p-4 text-sm text-[#14232B]/75">
            Aucun technicien actif disponible. Ajoutez un technicien dans Équipe → Personnel.
          </p>
        ) : (
        techs.map((t) => {
          const load = reparations.filter(
            (r) =>
              r.matricule_technicien === t.matricule && r.statut !== "TERMINEE"
          ).length;
          return (
            <button
              key={t.matricule}
              type="button"
              onClick={() => setTechMat(t.matricule)}
              className={`rounded-[6px] border-[1.5px] p-4 text-left ${
                techMat === t.matricule
                  ? "border-[#14232B] bg-[#F0A42B]/25"
                  : "border-[#E3D9C6] bg-[#F6F1E7]"
              }`}
            >
              <p className="text-base font-semibold">
                {t.prenom} {t.nom}
              </p>
              <p className="text-sm text-[#0E5A6B]">{t.specialite}</p>
              <p className="mt-1 font-mono-sfax text-xs">
                Charge actuelle : {load} réparation(s)
              </p>
            </button>
          );
        })
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold">Date planifiée</label>
        <input
          type="date"
          min={new Date().toISOString().slice(0, 10)}
          value={datePlan}
          onChange={(e) => setDatePlan(e.target.value)}
          className="mt-1 rounded border border-[#14232B] bg-[#F6F1E7] px-3 py-2 font-mono-sfax text-sm"
        />
        {conflict && (
          <p className="mt-1.5 text-sm font-semibold text-[#B8740B]">
            <AlertTriangle className="mr-1 inline h-4 w-4" />
            Ce technicien a déjà une réparation prévue à cette date.
          </p>
        )}
      </div>

      <button
        type="button"
        disabled={techMat <= 0}
        onClick={async () => {
          setErr(null);
          const r = await planifierReparationAction({
            idReclamation: reclamation.id_reclamation,
            matriculeTechnicien: techMat,
            datePlanifiee: datePlan,
          });
          if (!r.ok) setErr(r.error ?? "Erreur");
          else await onDone();
        }}
        className="btn-sfax-primary px-6 py-2.5 text-sm"
      >
        Planifier la réparation
      </button>
    </div>
  );
}

export function ReparationsView({
  reparations,
  reclamations,
  personnel,
  onRefresh,
}: {
  reparations: Reparation[];
  reclamations: Reclamation[];
  personnel: Personnel[];
  onRefresh: () => Promise<void>;
}) {
  const cols = ["PLANIFIEE", "EN_COURS", "TERMINEE"] as const;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Suivi des réparations</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {cols.map((col) => {
          const items = reparations.filter((r) => r.statut === col);
          return (
            <div key={col} className="card-sfax-flat space-y-3 bg-[#F6F1E7] p-4">
              <h3 className="font-mono-sfax text-sm font-bold uppercase text-[#0E5A6B]">
                {col} ({items.length})
              </h3>
              {items.length === 0 ? (
                <p className="py-6 text-center text-sm text-[#14232B]/60">
                  Aucune réparation.
                </p>
              ) : (
              items.map((rep) => {
                const rec = reclamations.find(
                  (x) => x.id_reclamation === rep.id_reclamation
                );
                const tech = personnel.find(
                  (p) => p.matricule === rep.matricule_technicien
                );
                const overdue =
                  rep.statut !== "TERMINEE" &&
                  rep.date_planifiee < new Date().toISOString().slice(0, 10);
                return (
                  <div key={rep.id_reparation} className="card-sfax space-y-2 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono-sfax text-base font-bold">
                        {rec?.num_serie}
                      </span>
                      {overdue && (
                        <span className="rounded bg-[#C8553D] px-2 py-0.5 font-mono-sfax text-xs text-white">
                          Retard
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#14232B]/75">
                      {tech?.prenom} {tech?.nom} · {formatDate(rep.date_planifiee)}
                    </p>
                    {rep.compte_rendu && (
                      <p className="rounded bg-[#F6F1E7] p-2.5 text-sm">
                        {rep.compte_rendu}
                      </p>
                    )}
                    {rep.statut === "TERMINEE" && (
                      <button
                        type="button"
                        onClick={async () => {
                          await rouvrirReparationAction(rep.id_reparation);
                          await onRefresh();
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#C8553D] underline"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Rouvrir
                      </button>
                    )}
                  </div>
                );
              })
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ItinerairesView({
  stations,
  personnel,
  camions,
  initialEtapes,
  onDone,
}: {
  stations: Station[];
  personnel: Personnel[];
  camions: Camion[];
  initialEtapes?: {
    action: "PRENDRE" | "DEPOSER";
    idStation: number;
    nbVelos: number;
  }[];
  onDone: () => Promise<void>;
}) {
  const [dateIt, setDateIt] = useState(new Date().toISOString().slice(0, 10));
  const [etapes, setEtapes] = useState(
    initialEtapes && initialEtapes.length > 0
      ? initialEtapes
      : stations.length > 0
      ? [
          {
            action: "PRENDRE" as const,
            idStation:
              stations.find((s) => s.nb_velos_actuel > 0)?.id_station ??
              stations[0].id_station,
            nbVelos: 2,
          },
          {
            action: "DEPOSER" as const,
            idStation:
              stations.find((s) => s.nb_velos_actuel < s.capacite)?.id_station ??
              stations[0].id_station,
            nbVelos: 2,
          },
        ]
      : []
  );
  const [techMat, setTechMat] = useState<number>(
    personnel.find((p) => p.role === "TECHNICIEN" && p.actif)?.matricule ?? 0
  );
  const [camionImm, setCamionImm] = useState<string>(
    camions.find((c) => c.disponible)?.immatriculation ?? ""
  );
  const [err, setErr] = useState<string | null>(null);

  // Simulation en direct étape par étape (empêche de prendre sur 0/24 ou déposer sur 16/16)
  const simStations = new Map(
    stations.map((s) => [s.id_station, { ...s }])
  );
  let simTruckLoad = 0;
  const selectedCamion = camions.find(
    (c) => c.immatriculation === camionImm
  );
  const truckCap = selectedCamion?.capacite ?? 99;
  const stepErrors: string[] = [];

  etapes.forEach((et, idx) => {
    const st = simStations.get(et.idStation);
    if (!st) return;
    if (et.action === "PRENDRE") {
      if (st.nb_velos_actuel < et.nbVelos) {
        stepErrors.push(
          `Étape #${idx + 1} (${st.nom}) : impossible de prendre ${et.nbVelos} vélo(s), seulement ${st.nb_velos_actuel}/${st.capacite} disponible(s).`
        );
      } else if (simTruckLoad + et.nbVelos > truckCap) {
        stepErrors.push(
          `Étape #${idx + 1} : le camion (${truckCap} places) ne peut pas charger ${simTruckLoad + et.nbVelos} vélos.`
        );
      } else {
        st.nb_velos_actuel -= et.nbVelos;
        simTruckLoad += et.nbVelos;
      }
    } else {
      const freeSlots = st.capacite - st.nb_velos_actuel;
      if (freeSlots < et.nbVelos) {
        stepErrors.push(
          `Étape #${idx + 1} (${st.nom}) : impossible de déposer ${et.nbVelos} vélo(s), seulement ${freeSlots} place(s) libre(s) (${st.nb_velos_actuel}/${st.capacite}).`
        );
      } else if (simTruckLoad < et.nbVelos) {
        stepErrors.push(
          `Étape #${idx + 1} (${st.nom}) : le camion ne contient que ${simTruckLoad} vélo(s) à ce moment.`
        );
      } else {
        st.nb_velos_actuel += et.nbVelos;
        simTruckLoad -= et.nbVelos;
      }
    }
  });

  const taken = etapes
    .filter((e) => e.action === "PRENDRE")
    .reduce((a, b) => a + b.nbVelos, 0);
  const dropped = etapes
    .filter((e) => e.action === "DEPOSER")
    .reduce((a, b) => a + b.nbVelos, 0);
  const balanced = etapes.length > 0 && taken === dropped;
  const isRouteValid = balanced && stepErrors.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Créer un itinéraire</h2>
        <input
          type="date"
          value={dateIt}
          onChange={(e) => setDateIt(e.target.value)}
          className="rounded border border-[#14232B] bg-[#FFFDF8] px-3 py-2 font-mono-sfax text-sm"
        />
      </div>

      {err && (
        <div className="rounded border border-[#C8553D] bg-[#C8553D]/12 p-3 text-sm font-semibold text-[#9B3925]">
          {err}
        </div>
      )}

      {stepErrors.length > 0 && (
        <div className="rounded-[6px] border-[1.5px] border-[#C8553D] bg-[#C8553D]/12 p-4 text-sm text-[#9B3925]">
          <p className="font-bold">Incohérences détectées sur l&apos;itinéraire :</p>
          <ul className="mt-1 list-disc pl-5">
            {stepErrors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card-sfax space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Étapes de l&apos;itinéraire</h3>
            <button
              type="button"
              onClick={() =>
                setEtapes((prev) => [
                  ...prev,
                  {
                    action: "DEPOSER",
                    idStation: stations[0]?.id_station ?? 0,
                    nbVelos: 1,
                  },
                ])
              }
              className="btn-sfax-outline inline-flex items-center gap-1 px-3 py-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" /> Étape
            </button>
          </div>

          {etapes.length === 0 ? (
            <p className="rounded border border-[#E3D9C6] bg-[#F6F1E7] p-4 text-sm text-[#14232B]/70">
              {stations.length === 0
                ? "Aucune station enregistrée. Créez d'abord des stations."
                : "Aucune étape ajoutée."}
            </p>
          ) : (
          etapes.map((et, idx) => (
            <div
              key={idx}
              className="flex flex-wrap items-center gap-2 rounded border border-[#14232B] bg-[#F6F1E7] p-3"
            >
              <span className="font-mono-sfax text-sm font-bold">
                #{idx + 1}
              </span>
              <select
                value={et.action}
                onChange={(e) => {
                  const v = e.target.value as "PRENDRE" | "DEPOSER";
                  setEtapes((prev) =>
                    prev.map((x, i) => (i === idx ? { ...x, action: v } : x))
                  );
                }}
                className="rounded border border-[#14232B] bg-white px-2.5 py-1.5 text-sm font-semibold"
              >
                <option value="PRENDRE">Prendre</option>
                <option value="DEPOSER">Déposer</option>
              </select>
              <select
                value={et.idStation}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setEtapes((prev) =>
                    prev.map((x, i) => (i === idx ? { ...x, idStation: v } : x))
                  );
                }}
                className="flex-1 rounded border border-[#14232B] bg-white px-2.5 py-1.5 text-sm"
              >
                {stations.map((s) => (
                  <option key={s.id_station} value={s.id_station}>
                    {s.nom} ({s.nb_velos_actuel}/{s.capacite})
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={et.nbVelos}
                onChange={(e) => {
                  const v = Math.max(1, Number(e.target.value));
                  setEtapes((prev) =>
                    prev.map((x, i) => (i === idx ? { ...x, nbVelos: v } : x))
                  );
                }}
                className="w-20 rounded border border-[#14232B] bg-white px-2.5 py-1.5 font-mono-sfax text-sm"
              />
              <button
                type="button"
                onClick={() =>
                  setEtapes((prev) => prev.filter((_, i) => i !== idx))
                }
                className="text-[#C8553D]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
          )}

          <div
            className={`rounded p-3 font-mono-sfax text-sm font-semibold ${
              isRouteValid
                ? "bg-[#5E7B3A]/15 text-[#3D5223]"
                : "bg-[#C8553D]/15 text-[#9B3925]"
            }`}
          >
            Pris : {taken} vélos · Déposés : {dropped} vélos —{" "}
            {isRouteValid ? "Itinéraire valide et équilibré ✓" : "À corriger"}
          </div>

          <div className="grid gap-3 border-t border-dotted border-[#14232B] pt-3 md:grid-cols-2">
            <select
              value={techMat}
              onChange={(e) => setTechMat(Number(e.target.value))}
              className="rounded border border-[#14232B] bg-[#F6F1E7] px-3 py-2 text-sm"
            >
              {personnel.filter((p) => p.role === "TECHNICIEN" && p.actif).length === 0 && (
                <option value={0}>Aucun technicien actif</option>
              )}
              {personnel
                .filter((p) => p.role === "TECHNICIEN" && p.actif)
                .map((p) => (
                  <option key={p.matricule} value={p.matricule}>
                    {p.prenom} {p.nom} ({p.specialite})
                  </option>
                ))}
            </select>
            <select
              value={camionImm}
              onChange={(e) => setCamionImm(e.target.value)}
              className="rounded border border-[#14232B] bg-[#F6F1E7] px-3 py-2 font-mono-sfax text-sm"
            >
              {camions.length === 0 && (
                <option value="">Aucun camion enregistré</option>
              )}
              {camions.map((c) => (
                <option
                  key={c.immatriculation}
                  value={c.immatriculation}
                  disabled={!c.disponible}
                >
                  {c.immatriculation} — {c.modele} (cap. {c.capacite})
                  {!c.disponible ? " [Indispo]" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              disabled={stepErrors.length > 0}
              onClick={async () => {
                setErr(null);
                const r = await createItineraireEtMissionAction({
                  dateItineraire: dateIt,
                  brouillon: true,
                  etapes,
                });
                if (!r.ok) setErr(r.error ?? "Erreur");
                else await onDone();
              }}
              className="btn-sfax-outline px-4 py-2.5 text-sm disabled:opacity-45"
            >
              Enregistrer brouillon
            </button>
            <button
              type="button"
              disabled={!isRouteValid || !camionImm || techMat <= 0}
              onClick={async () => {
                setErr(null);
                const r = await createItineraireEtMissionAction({
                  dateItineraire: dateIt,
                  brouillon: false,
                  etapes,
                  mission: {
                    matriculeTechnicien: techMat,
                    immatriculationCamion: camionImm,
                  },
                });
                if (!r.ok) setErr(r.error ?? "Erreur");
                else await onDone();
              }}
              className="btn-sfax-primary flex-1 py-2.5 text-sm"
            >
              Enregistrer et émettre ordre de mission
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <SfaxMap
            stations={stations}
            routeStationIds={etapes.map((e) => e.idStation)}
          />
          <div className="card-sfax-flat p-4">
            <h4 className="font-mono-sfax text-xs font-bold uppercase text-[#0E5A6B]">
              Simulation après exécution
            </h4>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              {simStations.size === 0 ? (
                <p className="col-span-2 text-sm text-[#14232B]/70">
                  Aucune station à simuler.
                </p>
              ) : (
              Array.from(simStations.values()).map((st) => {
                const orig = stations.find(
                  (o) => o.id_station === st.id_station
                );
                const changed =
                  orig && orig.nb_velos_actuel !== st.nb_velos_actuel;
                return (
                  <div
                    key={st.id_station}
                    className={`rounded border p-2 ${
                      changed
                        ? "border-[#0E5A6B] bg-[#0E5A6B]/10 font-semibold"
                        : "border-[#E3D9C6]"
                    }`}
                  >
                    <p className="truncate text-xs">{st.nom}</p>
                    <p className="font-mono-sfax text-sm">
                      {orig?.nb_velos_actuel} → {st.nb_velos_actuel} /{" "}
                      {st.capacite}
                    </p>
                  </div>
                );
              })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OrdresMissionView({
  ordresMission,
  etapes,
  personnel,
  stations,
  camions,
  velos,
  onRefresh,
  onCreateNew,
}: {
  ordresMission: OrdreMission[];
  etapes: EtapeItineraire[];
  personnel: Personnel[];
  stations: Station[];
  camions: Camion[];
  velos: Velo[];
  onRefresh: () => Promise<void>;
  onCreateNew: () => void;
}) {
  const [detailOrdre, setDetailOrdre] = useState<OrdreMission | null>(null);
  const [editOrdre, setEditOrdre] = useState<OrdreMission | null>(null);
  const [deleteOrdre, setDeleteOrdre] = useState<OrdreMission | null>(null);

  const [editTech, setEditTech] = useState<number>(0);
  const [editCamion, setEditCamion] = useState<string>("");
  const [editDate, setEditDate] = useState<string>("");
  const [editStatut, setEditStatut] =
    useState<StatutOrdreMission>("NON_DEMARRE");
  const [err, setErr] = useState<string | null>(null);

  function openEdit(o: OrdreMission) {
    setEditOrdre(o);
    setEditTech(o.matricule_technicien);
    setEditCamion(o.immatriculation_camion);
    setEditDate(o.date_mission);
    setEditStatut(o.statut);
    setErr(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">
          Ordres de mission ({ordresMission.length})
        </h2>
        <button
          type="button"
          onClick={onCreateNew}
          className="btn-sfax-primary inline-flex items-center gap-2 px-4 py-2.5 text-sm"
        >
          <Plus className="h-4 w-4" /> Émettre un ordre de mission
        </button>
      </div>

      {err && (
        <div className="rounded border border-[#C8553D] bg-[#C8553D]/12 p-3 text-sm text-[#9B3925]">
          {err}
        </div>
      )}

      <div className="card-sfax-flat overflow-x-auto">
        {ordresMission.length === 0 ? (
          <p className="p-8 text-center text-sm text-[#14232B]/70">
            Aucun ordre de mission émis pour le moment.
          </p>
        ) : (
        <table className="w-full text-left text-base">
          <thead className="border-b-[1.5px] border-[#14232B] bg-[#F6F1E7] font-mono-sfax text-xs uppercase">
            <tr>
              <th className="p-3.5">Ordre</th>
              <th className="p-3.5">Date</th>
              <th className="p-3.5">Technicien</th>
              <th className="p-3.5">Camion</th>
              <th className="p-3.5">Progression</th>
              <th className="p-3.5">Statut</th>
              <th className="p-3.5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3D9C6]">
            {ordresMission.map((o) => {
              const tech = personnel.find(
                (p) => p.matricule === o.matricule_technicien
              );
              const myEtapes = etapes.filter(
                (e) => e.id_itineraire === o.id_itineraire
              );
              const done = myEtapes.filter((e) => e.effectuee).length;
              return (
                <tr key={o.id_ordre} className="hover:bg-[#F6F1E7]/60">
                  <td className="p-3.5 font-mono-sfax font-bold">
                    #{o.id_ordre}
                  </td>
                  <td className="p-3.5 font-mono-sfax text-sm">
                    {formatDate(o.date_mission)}
                  </td>
                  <td className="p-3.5 font-medium">
                    {tech?.prenom} {tech?.nom}
                  </td>
                  <td className="p-3.5 font-mono-sfax text-sm font-semibold">
                    {o.immatriculation_camion}
                  </td>
                  <td className="p-3.5 text-sm">
                    <span className="font-mono-sfax font-semibold">
                      {done}/{myEtapes.length}
                    </span>{" "}
                    —{" "}
                    {myEtapes
                      .map(
                        (e) =>
                          stations.find((s) => s.id_station === e.id_station)?.nom
                      )
                      .join(" → ")}
                  </td>
                  <td className="p-3.5 font-mono-sfax text-xs font-bold">
                    {o.statut}
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDetailOrdre(o)}
                        className="inline-flex items-center gap-1 rounded border border-[#14232B] bg-[#F6F1E7] px-2.5 py-1.5 text-xs font-semibold hover:bg-[#E3D9C6]"
                      >
                        <Eye className="h-3.5 w-3.5" /> Détails
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(o)}
                        className="rounded border border-[#14232B] bg-[#F6F1E7] p-1.5 hover:bg-[#E3D9C6]"
                        aria-label={`Modifier ordre #${o.id_ordre}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteOrdre(o)}
                        className="rounded border border-[#C8553D] p-1.5 text-[#9B3925] hover:bg-[#C8553D]/10"
                        aria-label={`Supprimer ordre #${o.id_ordre}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        )}
      </div>

      {/* Modale Détails d'un Ordre de Mission */}
      {detailOrdre && (() => {
        const tech = personnel.find(
          (p) => p.matricule === detailOrdre.matricule_technicien
        );
        const cam = camions.find(
          (c) => c.immatriculation === detailOrdre.immatriculation_camion
        );
        const myEtapes = etapes.filter(
          (e) => e.id_itineraire === detailOrdre.id_itineraire
        );
        const aboard = velos.filter(
          (v) => v.immatriculation_camion === detailOrdre.immatriculation_camion
        ).length;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14232B]/55 p-4">
            <div className="card-sfax max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-[#E3D9C6] pb-3">
                <div>
                  <span className="font-mono-sfax text-xs uppercase text-[#0E5A6B]">
                    Détails Ordre de Mission
                  </span>
                  <h3 className="text-2xl font-bold">
                    Ordre #{detailOrdre.id_ordre} — {detailOrdre.statut}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailOrdre(null)}
                  className="rounded p-1 hover:bg-[#E3D9C6]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[6px] border border-[#14232B] bg-[#F6F1E7] p-4">
                  <p className="font-mono-sfax text-xs uppercase text-[#0E5A6B]">
                    Technicien assigné
                  </p>
                  <p className="mt-1 text-base font-bold">
                    {tech?.prenom} {tech?.nom} (#{tech?.matricule})
                  </p>
                  <p className="text-sm text-[#14232B]/75">
                    {tech?.specialite} · {tech?.tel}
                  </p>
                </div>
                <div className="rounded-[6px] border border-[#14232B] bg-[#F6F1E7] p-4">
                  <p className="font-mono-sfax text-xs uppercase text-[#0E5A6B]">
                    Camion affecté
                  </p>
                  <p className="mt-1 font-mono-sfax text-base font-bold">
                    {detailOrdre.immatriculation_camion}
                  </p>
                  <p className="text-sm text-[#14232B]/75">
                    {cam?.modele ?? "Utilitaire"} · Capacité {cam?.capacite ?? 12} vélos ({aboard} à bord)
                  </p>
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-base font-bold">
                  Étapes de l&apos;itinéraire #{detailOrdre.id_itineraire} (
                  {formatDate(detailOrdre.date_mission)})
                </h4>
                <div className="space-y-2 border-l-2 border-dotted border-[#0E5A6B] pl-4">
                  {myEtapes.map((et) => {
                    const st = stations.find(
                      (s) => s.id_station === et.id_station
                    );
                    return (
                      <div
                        key={et.id_etape}
                        className="rounded border border-[#E3D9C6] bg-[#FFFDF8] p-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono-sfax text-sm font-bold text-[#0E5A6B]">
                            #{et.ordre} · {et.action} {et.nb_velos} vélo(s)
                          </span>
                          <span className="font-mono-sfax text-xs font-semibold">
                            {et.effectuee
                              ? `Effectuée (${et.nb_velos_reel} réel)`
                              : "À faire"}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-semibold">{st?.nom}</p>
                        {et.motif_ecart && (
                          <p className="mt-1 text-xs text-[#C8553D]">
                            Écart signalé : {et.motif_ecart}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modale Modifier Ordre de Mission */}
      {editOrdre && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14232B]/55 p-4">
          <div className="card-sfax w-full max-w-md space-y-4 p-6">
            <h3 className="text-xl font-bold">
              Modifier l&apos;ordre #{editOrdre.id_ordre}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold">Technicien</label>
                <select
                  value={editTech}
                  onChange={(e) => setEditTech(Number(e.target.value))}
                  className="mt-1 w-full rounded border border-[#14232B] bg-[#F6F1E7] px-3 py-2 text-sm"
                >
                  {personnel
                    .filter((p) => p.role === "TECHNICIEN" && p.actif)
                    .map((p) => (
                      <option key={p.matricule} value={p.matricule}>
                        {p.prenom} {p.nom}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold">Camion</label>
                <select
                  value={editCamion}
                  onChange={(e) => setEditCamion(e.target.value)}
                  className="mt-1 w-full rounded border border-[#14232B] bg-[#F6F1E7] px-3 py-2 font-mono-sfax text-sm"
                >
                  {camions.map((c) => (
                    <option key={c.immatriculation} value={c.immatriculation}>
                      {c.immatriculation} ({c.modele})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold">Date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="mt-1 w-full rounded border border-[#14232B] bg-[#F6F1E7] px-3 py-2 font-mono-sfax text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold">Statut</label>
                <select
                  value={editStatut}
                  onChange={(e) =>
                    setEditStatut(e.target.value as StatutOrdreMission)
                  }
                  className="mt-1 w-full rounded border border-[#14232B] bg-[#F6F1E7] px-3 py-2 font-mono-sfax text-sm"
                >
                  <option value="NON_DEMARRE">NON_DEMARRE</option>
                  <option value="EN_COURS">EN_COURS</option>
                  <option value="TERMINE">TERMINE</option>
                  <option value="ANNULE">ANNULE</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditOrdre(null)}
                className="btn-sfax-outline px-4 py-2 text-sm"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={async () => {
                  const r = await updateOrdreMissionAction({
                    idOrdre: editOrdre.id_ordre,
                    matriculeTechnicien: editTech,
                    immatriculationCamion: editCamion,
                    dateMission: editDate,
                    statut: editStatut,
                  });
                  if (!r.ok && r.error) setErr(r.error);
                  setEditOrdre(null);
                  await onRefresh();
                }}
                className="btn-sfax-primary px-4 py-2 text-sm"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(deleteOrdre)}
        title="Supprimer l'ordre de mission"
        objectName={`Ordre #${deleteOrdre?.id_ordre ?? ""}`}
        description="Cette action supprimera définitivement cet ordre de mission."
        onClose={() => setDeleteOrdre(null)}
        onConfirm={async () => {
          if (!deleteOrdre) return;
          const r = await deleteOrdreMissionAction(deleteOrdre.id_ordre);
          if (!r.ok && r.error) setErr(r.error);
          setDeleteOrdre(null);
          await onRefresh();
        }}
      />
    </div>
  );
}

export function CamionsView({
  camions,
  velos,
  entrepots,
  onRefresh,
}: {
  camions: Camion[];
  velos: Velo[];
  entrepots: Entrepot[];
  onRefresh: () => Promise<void>;
}) {
  const [plate, setPlate] = useState("");
  const [modele, setModele] = useState("");
  const [capacite, setCapacite] = useState(12);
  const [kilometrage, setKilometrage] = useState(0);
  const [idEntrepot, setIdEntrepot] = useState<number>(
    entrepots[0]?.id_entrepot ?? 0
  );

  const [editing, setEditing] = useState<Camion | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function startEdit(c: Camion) {
    setEditing(c);
    setPlate(c.immatriculation);
    setModele(c.modele ?? "");
    setCapacite(c.capacite ?? 12);
    setKilometrage(c.kilometrage ?? 0);
    setIdEntrepot(c.id_entrepot ?? entrepots[0]?.id_entrepot ?? 0);
    setErr(null);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Camions ({camions.length})</h2>
      {err && (
        <div className="rounded border border-[#C8553D] bg-[#C8553D]/12 p-3 text-sm text-[#9B3925]">
          {err}
        </div>
      )}

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setErr(null);
          if (editing) {
            const r = await updateCamionAction({
              immatriculation: editing.immatriculation,
              modele,
              capacite,
              kilometrage,
              idEntrepot: idEntrepot || null,
              disponible: editing.disponible,
            });
            if (!r.ok) {
              setErr(r.error ?? "Erreur");
              return;
            }
            setEditing(null);
          } else {
            if (!isValidPlate(plate.trim())) {
              setErr("Format tunisien requis (ex: 123 TUN 4567).");
              return;
            }
            const r = await createCamionAction({
              immatriculation: plate,
              modele,
              capacite,
              kilometrage,
              idEntrepot: idEntrepot || null,
            });
            if (!r.ok) {
              setErr(r.error ?? "Erreur");
              return;
            }
          }
          setPlate("");
          setModele("");
          setCapacite(12);
          setKilometrage(0);
          await onRefresh();
        }}
        className="card-sfax grid gap-3 p-4 md:grid-cols-6"
      >
        <input
          type="text"
          placeholder="XXX TUN XXXX"
          value={plate}
          disabled={Boolean(editing)}
          onChange={(e) => setPlate(e.target.value.toUpperCase())}
          required
          className="rounded border border-[#14232B] bg-[#F6F1E7] px-3 py-2 font-mono-sfax text-sm disabled:opacity-60"
        />
        <input
          type="text"
          placeholder="Modèle (ex. Renault Master)"
          value={modele}
          onChange={(e) => setModele(e.target.value)}
          required
          className="rounded border border-[#14232B] bg-[#F6F1E7] px-3 py-2 text-sm"
        />
        <input
          type="number"
          min={1}
          placeholder="Capacité"
          value={capacite}
          onChange={(e) => setCapacite(Number(e.target.value))}
          required
          className="rounded border border-[#14232B] bg-[#F6F1E7] px-3 py-2 font-mono-sfax text-sm"
        />
        <input
          type="number"
          min={0}
          placeholder="Kilométrage"
          value={kilometrage}
          onChange={(e) => setKilometrage(Number(e.target.value))}
          required
          className="rounded border border-[#14232B] bg-[#F6F1E7] px-3 py-2 font-mono-sfax text-sm"
        />
        <select
          value={idEntrepot}
          onChange={(e) => setIdEntrepot(Number(e.target.value))}
          className="rounded border border-[#14232B] bg-[#F6F1E7] px-2.5 py-2 text-sm"
        >
          <option value={0}>Aucun entrepôt</option>
          {entrepots.map((e) => (
            <option key={e.id_entrepot} value={e.id_entrepot}>
              {e.nom}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            type="submit"
            className="btn-sfax-primary flex-1 px-3 py-2 text-sm"
          >
            {editing ? "Enregistrer" : "Ajouter"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setPlate("");
              }}
              className="btn-sfax-outline px-2.5 py-2 text-xs"
            >
              Annuler
            </button>
          )}
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        {camions.length === 0 ? (
          <div className="card-sfax-flat p-8 text-center text-sm text-[#14232B]/70 md:col-span-2">
            Aucun camion enregistré pour le moment.
          </div>
        ) : (
        camions.map((c) => {
          const aboardBikes = velos.filter(
            (v) => v.immatriculation_camion === c.immatriculation
          );
          const ent = entrepots.find((e) => e.id_entrepot === c.id_entrepot);
          return (
            <div key={c.immatriculation} className="card-sfax space-y-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-flex items-center gap-2 rounded border-2 border-[#14232B] bg-[#14232B] px-3 py-1 font-mono-sfax text-base font-bold text-[#FFFDF8]">
                    <Truck className="h-4 w-4 text-[#F0A42B]" />
                    {c.immatriculation}
                  </span>
                  <p className="mt-2 text-base font-semibold">{c.modele ?? "Utilitaire VéloSf"}</p>
                  <p className="text-sm text-[#14232B]/75">
                    Entrepôt : {ent?.nom ?? "—"} · Kilométrage :{" "}
                    <span className="font-mono-sfax">
                      {(c.kilometrage ?? 0).toLocaleString("fr-FR")} km
                    </span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    setErr(null);
                    const r = await toggleCamionDisponibleAction(
                      c.immatriculation,
                      !c.disponible
                    );
                    if (!r.ok && r.error) setErr(r.error);
                    await onRefresh();
                  }}
                  className={`rounded-[6px] border-[1.5px] border-[#14232B] px-3 py-1.5 text-xs font-semibold ${
                    c.disponible
                      ? "bg-[#5E7B3A] text-white"
                      : "bg-[#C8553D] text-white"
                  }`}
                >
                  {c.disponible ? "Disponible" : "Indisponible"}
                </button>
              </div>

              <div className="rounded border border-[#E3D9C6] bg-[#F6F1E7] p-3">
                <p className="font-mono-sfax text-xs font-bold text-[#0E5A6B]">
                  Chargement : {aboardBikes.length} / {c.capacite ?? 12} vélos à bord
                </p>
                {aboardBikes.length > 0 && (
                  <p className="mt-1 font-mono-sfax text-xs">
                    {aboardBikes.map((b) => b.num_serie).join(", ")}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(c)}
                  className="inline-flex items-center gap-1 rounded border border-[#14232B] bg-[#F6F1E7] px-3 py-1.5 text-xs font-semibold"
                >
                  <Pencil className="h-3.5 w-3.5" /> Modifier
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setErr(null);
                    const r = await deleteCamionAction(c.immatriculation);
                    if (!r.ok && r.error) setErr(r.error);
                    await onRefresh();
                  }}
                  className="inline-flex items-center gap-1 rounded border border-[#C8553D] px-3 py-1.5 text-xs font-semibold text-[#9B3925]"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Supprimer
                </button>
              </div>
            </div>
          );
        })
        )}
      </div>
    </div>
  );
}
