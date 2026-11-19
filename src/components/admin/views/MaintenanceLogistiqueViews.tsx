"use client";

import { useState } from "react";
import { Plus, Trash2, CheckCircle2, AlertTriangle, RotateCcw } from "lucide-react";
import type {
  Reclamation,
  Reparation,
  Personnel,
  Velo,
  Station,
  Itineraire,
  EtapeItineraire,
  OrdreMission,
  Camion,
  Entrepot,
} from "@/lib/supabase/types";
import { SfaxMap } from "@/components/ui/SfaxMap";
import { formatDate, isValidPlate } from "@/lib/format";
import {
  planifierReparationAction,
  rouvrirReparationAction,
  createItineraireEtMissionAction,
  createCamionAction,
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
                    <span className="font-mono-sfax font-bold">
                      {r.num_serie}
                    </span>
                    {ageDays > 3 && !r.traitee && (
                      <span className="rounded bg-[#C8553D] px-1.5 py-0.5 font-mono-sfax text-[10px] font-bold text-white">
                        {ageDays} j
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-[#14232B]/80">
                    {r.diagnostic}
                  </p>
                  <p className="mt-1 font-mono-sfax text-[11px] text-[#0E5A6B]">
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
                <span className="font-mono-sfax text-xs">
                  {formatDate(selected.date_reclamation)}
                </span>
              </div>
              <p className="rounded border border-[#E3D9C6] bg-[#F6F1E7] p-4 text-sm">
                {selected.diagnostic}
              </p>
              <div className="flex flex-wrap gap-3">
                {!selected.traitee && (
                  <button
                    type="button"
                    onClick={() => onPlanifier(selected.id_reclamation)}
                    className="btn-sfax-primary px-5 py-2.5 text-sm"
                  >
                    Planifier une réparation (R10)
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
  const [techMat, setTechMat] = useState<number>(techs[0]?.matricule ?? 2014);
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
      <p className="rounded bg-[#F6F1E7] p-3 text-sm">{reclamation.diagnostic}</p>

      {err && (
        <div className="rounded border border-[#C8553D] bg-[#C8553D]/12 p-3 text-sm text-[#9B3925]">
          {err}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {techs.map((t) => {
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
              <p className="font-semibold">
                {t.prenom} {t.nom}
              </p>
              <p className="text-xs text-[#0E5A6B]">{t.specialite}</p>
              <p className="mt-1 font-mono-sfax text-xs">
                Charge actuelle : {load} réparation(s)
              </p>
            </button>
          );
        })}
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
          <p className="mt-1.5 text-xs font-semibold text-[#B8740B]">
            <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
            Ce technicien a déjà une réparation prévue à cette date.
          </p>
        )}
      </div>

      <button
        type="button"
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
              <h3 className="font-mono-sfax text-xs font-bold uppercase text-[#0E5A6B]">
                {col} ({items.length})
              </h3>
              {items.map((rep) => {
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
                  <div key={rep.id_reparation} className="card-sfax space-y-2 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono-sfax font-bold">
                        {rec?.num_serie}
                      </span>
                      {overdue && (
                        <span className="rounded bg-[#C8553D] px-1.5 py-0.5 font-mono-sfax text-[10px] text-white">
                          Retard
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#14232B]/75">
                      {tech?.prenom} {tech?.nom} · {formatDate(rep.date_planifiee)}
                    </p>
                    {rep.compte_rendu && (
                      <p className="rounded bg-[#F6F1E7] p-2 text-xs">
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
                        <RotateCcw className="h-3 w-3" /> Rouvrir
                      </button>
                    )}
                  </div>
                );
              })}
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
  initialEtapes?: { action: "PRENDRE" | "DEPOSER"; idStation: number; nbVelos: number }[];
  onDone: () => Promise<void>;
}) {
  const [dateIt, setDateIt] = useState(new Date().toISOString().slice(0, 10));
  const [etapes, setEtapes] = useState(
    initialEtapes && initialEtapes.length > 0
      ? initialEtapes
      : [
          {
            action: "PRENDRE" as const,
            idStation: stations[4]?.id_station ?? stations[0]?.id_station ?? 1,
            nbVelos: 3,
          },
          {
            action: "DEPOSER" as const,
            idStation: stations[1]?.id_station ?? stations[0]?.id_station ?? 1,
            nbVelos: 3,
          },
        ]
  );
  const [techMat, setTechMat] = useState<number>(
    personnel.find((p) => p.role === "TECHNICIEN")?.matricule ?? 2014
  );
  const [camionImm, setCamionImm] = useState<string>(
    camions.find((c) => c.disponible)?.immatriculation ?? ""
  );
  const [err, setErr] = useState<string | null>(null);

  const taken = etapes
    .filter((e) => e.action === "PRENDRE")
    .reduce((a, b) => a + b.nbVelos, 0);
  const dropped = etapes
    .filter((e) => e.action === "DEPOSER")
    .reduce((a, b) => a + b.nbVelos, 0);
  const balanced = etapes.length > 0 && taken === dropped;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Créer un itinéraire (R13)</h2>
        <input
          type="date"
          value={dateIt}
          onChange={(e) => setDateIt(e.target.value)}
          className="rounded border border-[#14232B] bg-[#FFFDF8] px-3 py-1.5 font-mono-sfax text-sm"
        />
      </div>

      {err && (
        <div className="rounded border border-[#C8553D] bg-[#C8553D]/12 p-3 text-sm text-[#9B3925]">
          {err}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card-sfax space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">Étapes de l&apos;itinéraire</h3>
            <button
              type="button"
              onClick={() =>
                setEtapes((prev) => [
                  ...prev,
                  {
                    action: "DEPOSER",
                    idStation: stations[0]?.id_station ?? 1,
                    nbVelos: 1,
                  },
                ])
              }
              className="btn-sfax-outline inline-flex items-center gap-1 px-3 py-1 text-xs"
            >
              <Plus className="h-3.5 w-3.5" /> Étape
            </button>
          </div>

          {etapes.map((et, idx) => (
            <div
              key={idx}
              className="flex flex-wrap items-center gap-2 rounded border border-[#14232B] bg-[#F6F1E7] p-3"
            >
              <span className="font-mono-sfax text-xs font-bold">
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
                className="rounded border border-[#14232B] bg-white px-2 py-1 text-xs font-semibold"
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
                className="flex-1 rounded border border-[#14232B] bg-white px-2 py-1 text-xs"
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
                className="w-16 rounded border border-[#14232B] bg-white px-2 py-1 font-mono-sfax text-xs"
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
          ))}

          <div
            className={`rounded p-3 font-mono-sfax text-xs font-semibold ${
              balanced
                ? "bg-[#5E7B3A]/15 text-[#3D5223]"
                : "bg-[#C8553D]/15 text-[#9B3925]"
            }`}
          >
            Pris : {taken} vélos · Déposés : {dropped} vélos —{" "}
            {balanced ? "Équilibré ✓" : "Déséquilibré"}
          </div>

          <div className="grid gap-3 border-t border-dotted border-[#14232B] pt-3 md:grid-cols-2">
            <select
              value={techMat}
              onChange={(e) => setTechMat(Number(e.target.value))}
              className="rounded border border-[#14232B] bg-[#F6F1E7] px-2.5 py-2 text-xs"
            >
              {personnel
                .filter((p) => p.role === "TECHNICIEN" && p.actif)
                .map((p) => (
                  <option key={p.matricule} value={p.matricule}>
                    {p.prenom} {p.nom}
                  </option>
                ))}
            </select>
            <select
              value={camionImm}
              onChange={(e) => setCamionImm(e.target.value)}
              className="rounded border border-[#14232B] bg-[#F6F1E7] px-2.5 py-2 font-mono-sfax text-xs"
            >
              {camions.map((c) => (
                <option
                  key={c.immatriculation}
                  value={c.immatriculation}
                  disabled={!c.disponible}
                >
                  {c.immatriculation} {!c.disponible ? "(Indisponible)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
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
              className="btn-sfax-outline px-4 py-2 text-xs"
            >
              Enregistrer brouillon
            </button>
            <button
              type="button"
              disabled={!balanced || !camionImm}
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
              className="btn-sfax-primary flex-1 py-2 text-sm"
            >
              Enregistrer et émettre ordre de mission
            </button>
          </div>
        </div>

        <SfaxMap
          stations={stations}
          routeStationIds={etapes.map((e) => e.idStation)}
        />
      </div>
    </div>
  );
}

export function OrdresMissionView({
  ordresMission,
  etapes,
  personnel,
  stations,
  onCreateNew,
}: {
  ordresMission: OrdreMission[];
  etapes: EtapeItineraire[];
  personnel: Personnel[];
  stations: Station[];
  onCreateNew: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          Ordres de mission ({ordresMission.length})
        </h2>
        <button
          type="button"
          onClick={onCreateNew}
          className="btn-sfax-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
        >
          <Plus className="h-4 w-4" /> Émettre un ordre de mission
        </button>
      </div>

      <div className="card-sfax-flat overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b-[1.5px] border-[#14232B] bg-[#F6F1E7] font-mono-sfax text-xs uppercase">
            <tr>
              <th className="p-3">Ordre</th>
              <th className="p-3">Date</th>
              <th className="p-3">Technicien</th>
              <th className="p-3">Camion</th>
              <th className="p-3">Progression</th>
              <th className="p-3">Statut</th>
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
                <tr key={o.id_ordre}>
                  <td className="p-3 font-mono-sfax font-bold">#{o.id_ordre}</td>
                  <td className="p-3 font-mono-sfax text-xs">
                    {formatDate(o.date_mission)}
                  </td>
                  <td className="p-3">
                    {tech?.prenom} {tech?.nom}
                  </td>
                  <td className="p-3 font-mono-sfax text-xs">
                    {o.immatriculation_camion}
                  </td>
                  <td className="p-3 text-xs">
                    {done}/{myEtapes.length} étapes (
                    {myEtapes
                      .map(
                        (e) =>
                          stations.find((s) => s.id_station === e.id_station)?.nom
                      )
                      .join(" → ")}
                    )
                  </td>
                  <td className="p-3 font-mono-sfax text-xs font-semibold">
                    {o.statut}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
  const [err, setErr] = useState<string | null>(null);

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
          if (!isValidPlate(plate.trim())) {
            setErr("Format tunisien requis (ex: 123 TUN 4567).");
            return;
          }
          const r = await createCamionAction(
            plate,
            entrepots[0]?.id_entrepot ?? null
          );
          if (!r.ok) setErr(r.error ?? "Erreur");
          else {
            setPlate("");
            await onRefresh();
          }
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          placeholder="Immatriculation (123 TUN 4567)"
          value={plate}
          onChange={(e) => setPlate(e.target.value.toUpperCase())}
          className="rounded border border-[#14232B] bg-[#FFFDF8] px-3 py-2 font-mono-sfax text-sm"
        />
        <button type="submit" className="btn-sfax-primary px-4 py-2 text-sm">
          Ajouter camion
        </button>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        {camions.map((c) => {
          const aboard = velos.filter(
            (v) => v.immatriculation_camion === c.immatriculation
          ).length;
          return (
            <div key={c.immatriculation} className="card-sfax flex items-center justify-between p-5">
              <div>
                <span className="inline-block rounded border-2 border-[#14232B] bg-[#14232B] px-3 py-1 font-mono-sfax text-base font-bold text-[#FFFDF8]">
                  {c.immatriculation}
                </span>
                <p className="mt-2 font-mono-sfax text-xs text-[#0E5A6B]">
                  {aboard} vélo(s) actuellement à bord
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
                className={`rounded-[6px] border-[1.5px] border-[#14232B] px-4 py-2 text-xs font-semibold ${
                  c.disponible
                    ? "bg-[#5E7B3A] text-white"
                    : "bg-[#C8553D] text-white"
                }`}
              >
                {c.disponible ? "Disponible" : "Indisponible"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
