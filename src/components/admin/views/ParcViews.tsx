"use client";

import { useState } from "react";
import { Plus, Truck, Trash2, Archive, Download, ArrowLeft } from "lucide-react";
import type {
  Station,
  Entrepot,
  Velo,
  TypeVelo,
  Fournisseur,
  LocationRow,
  Reclamation,
  Reparation,
  EtatVelo,
  MotifReforme,
} from "@/lib/supabase/types";
import { SfaxMap } from "@/components/ui/SfaxMap";
import { SlotTicks } from "@/components/ui/SlotTicks";
import { StatusChip } from "@/components/ui/StatusChip";
import { RouteLineStepper } from "@/components/ui/RouteLine";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { formatDate, formatTunisianPhoneInput } from "@/lib/format";
import {
  createStationAction,
  deleteStationAction,
  createEntrepotAction,
  createTypeVeloAction,
  deleteTypeVeloAction,
  createFournisseurAction,
  archiveOrDeleteFournisseurAction,
  acquerirVelosAction,
  reformerVeloAction,
} from "@/app/actions/admin";

const COULEURS = [
  { nom: "Bleu Mer", hex: "#0E5A6B" },
  { nom: "Safran", hex: "#F0A42B" },
  { nom: "Olive", hex: "#5E7B3A" },
  { nom: "Terracotta", hex: "#C8553D" },
  { nom: "Encre", hex: "#14232B" },
  { nom: "Brume", hex: "#9DB8BF" },
];

export function StationsView({
  stations,
  entrepots,
  onRefresh,
}: {
  stations: Station[];
  entrepots: Entrepot[];
  onRefresh: () => Promise<void>;
}) {
  const [selected, setSelected] = useState<Station | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [nom, setNom] = useState("");
  const [adresse, setAdresse] = useState("");
  const [capacite, setCapacite] = useState(16);
  const [idEntrepot, setIdEntrepot] = useState<number>(
    entrepots[0]?.id_entrepot ?? 0
  );
  const [showNewEntrepot, setShowNewEntrepot] = useState(false);
  const [newEntNom, setNewEntNom] = useState("");
  const [newEntAdr, setNewEntAdr] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function handleCreateStation(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const res = await createStationAction({
      nom,
      adresse,
      capacite,
      id_entrepot: idEntrepot || null,
    });
    if (!res.ok) {
      setErr(res.error ?? "Erreur");
      return;
    }
    setShowDrawer(false);
    setNom("");
    setAdresse("");
    await onRefresh();
  }

  async function handleAddEntrepot() {
    const res = await createEntrepotAction(newEntNom, newEntAdr);
    if (!res.ok) {
      setErr(res.error ?? "Erreur");
      return;
    }
    setShowNewEntrepot(false);
    setNewEntNom("");
    setNewEntAdr("");
    await onRefresh();
    if (res.entrepot) setIdEntrepot(res.entrepot.id_entrepot);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Stations ({stations.length})</h2>
        <button
          type="button"
          onClick={() => setShowDrawer((v) => !v)}
          className="btn-sfax-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
        >
          <Plus className="h-4 w-4" />
          Nouvelle station
        </button>
      </div>

      {err && (
        <div className="rounded border border-[#C8553D] bg-[#C8553D]/12 p-3 text-sm text-[#9B3925]">
          {err}
        </div>
      )}

      {showDrawer && (
        <form onSubmit={handleCreateStation} className="card-sfax space-y-4 p-5">
          <h3 className="text-lg font-bold">Ajouter une station</h3>
          <div className="grid gap-4 md:grid-cols-4">
            <input
              type="text"
              placeholder="Nom de la station"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              required
              className="rounded border border-[#14232B] bg-[#F6F1E7] px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Adresse complète"
              value={adresse}
              onChange={(e) => setAdresse(e.target.value)}
              required
              className="rounded border border-[#14232B] bg-[#F6F1E7] px-3 py-2 text-sm"
            />
            <input
              type="number"
              min={1}
              value={capacite}
              onChange={(e) => setCapacite(Number(e.target.value))}
              required
              className="rounded border border-[#14232B] bg-[#F6F1E7] px-3 py-2 font-mono-sfax text-sm"
            />
            <div className="flex gap-2">
              <select
                value={idEntrepot}
                onChange={(e) => setIdEntrepot(Number(e.target.value))}
                className="flex-1 rounded border border-[#14232B] bg-[#F6F1E7] px-2 py-2 text-sm"
              >
                {entrepots.map((e) => (
                  <option key={e.id_entrepot} value={e.id_entrepot}>
                    {e.nom}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewEntrepot((v) => !v)}
                className="btn-sfax-outline px-2.5 text-xs"
              >
                + Entrepôt
              </button>
            </div>
          </div>

          {showNewEntrepot && (
            <div className="flex flex-wrap gap-2 rounded border border-[#0E5A6B] bg-[#F6F1E7] p-3">
              <input
                type="text"
                placeholder="Nom entrepôt"
                value={newEntNom}
                onChange={(e) => setNewEntNom(e.target.value)}
                className="rounded border border-[#14232B] bg-white px-2.5 py-1.5 text-xs"
              />
              <input
                type="text"
                placeholder="Adresse entrepôt"
                value={newEntAdr}
                onChange={(e) => setNewEntAdr(e.target.value)}
                className="flex-1 rounded border border-[#14232B] bg-white px-2.5 py-1.5 text-xs"
              />
              <button
                type="button"
                onClick={handleAddEntrepot}
                className="btn-sfax-mer px-3 py-1.5 text-xs"
              >
                Créer l&apos;entrepôt
              </button>
            </div>
          )}

          <button type="submit" className="btn-sfax-primary px-5 py-2 text-sm">
            Enregistrer la station
          </button>
        </form>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card-sfax-flat overflow-x-auto lg:col-span-2">
          <table className="w-full text-left text-sm">
            <thead className="border-b-[1.5px] border-[#14232B] bg-[#F6F1E7] font-mono-sfax text-xs uppercase">
              <tr>
                <th className="p-3">Station</th>
                <th className="p-3">Entrepôt</th>
                <th className="p-3">Remplissage</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3D9C6]">
              {stations.map((s) => (
                <tr
                  key={s.id_station}
                  onClick={() => setSelected(s)}
                  className="cursor-pointer hover:bg-[#F6F1E7]/70"
                >
                  <td className="p-3">
                    <p className="font-semibold">{s.nom}</p>
                    <p className="text-xs text-[#14232B]/70">{s.adresse}</p>
                  </td>
                  <td className="p-3 text-xs">
                    {entrepots.find((e) => e.id_entrepot === s.id_entrepot)?.nom ??
                      "Sans entrepôt"}
                  </td>
                  <td className="p-3">
                    <SlotTicks
                      occupied={s.nb_velos_actuel}
                      capacity={s.capacite}
                      size="sm"
                    />
                  </td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const r = await deleteStationAction(s.id_station);
                        if (!r.ok && r.error) setErr(r.error);
                        await onRefresh();
                      }}
                      className="rounded border border-[#C8553D] p-1.5 text-[#9B3925] hover:bg-[#C8553D]/10"
                      aria-label={`Supprimer ${s.nom}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <SfaxMap
          stations={stations}
          selectedStationId={selected?.id_station}
          onSelectStation={setSelected}
        />
      </div>
    </div>
  );
}

export function ParcVelosView({
  velos,
  types,
  fournisseurs,
  stations,
  onSelectBike,
  onAcquerir,
}: {
  velos: Velo[];
  types: TypeVelo[];
  fournisseurs: Fournisseur[];
  stations: Station[];
  onSelectBike: (numSerie: string) => void;
  onAcquerir: () => void;
}) {
  const [search, setSearch] = useState("");
  const [etatFilter, setEtatFilter] = useState<EtatVelo | "ALL">("ALL");
  const [showReformes, setShowReformes] = useState(false);

  const filtered = velos.filter((v) => {
    if (!showReformes && v.etat === "REFORME" && etatFilter !== "REFORME") {
      return false;
    }
    if (etatFilter !== "ALL" && v.etat !== etatFilter) return false;
    if (search && !v.num_serie.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  function exportCsv() {
    const header = "num_serie,etat,couleur,date_acquisition\n";
    const rows = filtered
      .map((v) => `${v.num_serie},${v.etat},${v.couleur},${v.date_acquisition}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "parc-velosf.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">
          Parc de vélos ({filtered.length})
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="btn-sfax-outline inline-flex items-center gap-1.5 px-3 py-2 text-sm"
          >
            <Download className="h-4 w-4" /> Exporter CSV
          </button>
          <button
            type="button"
            onClick={onAcquerir}
            className="btn-sfax-primary inline-flex items-center gap-1.5 px-4 py-2 text-sm"
          >
            <Plus className="h-4 w-4" /> Acquérir un vélo
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Rechercher VSF-..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-[6px] border-[1.5px] border-[#14232B] bg-[#FFFDF8] px-3 py-1.5 font-mono-sfax text-sm"
        />
        {(
          ["ALL", "DISPONIBLE", "LOUE", "EN_PANNE", "EN_REPARATION", "REFORME"] as const
        ).map((et) => (
          <button
            key={et}
            type="button"
            onClick={() => setEtatFilter(et)}
            className={`rounded-[6px] border border-[#14232B] px-3 py-1 font-mono-sfax text-xs font-semibold ${
              etatFilter === et ? "bg-[#0E5A6B] text-white" : "bg-[#FFFDF8]"
            }`}
          >
            {et === "ALL" ? "Tous" : et}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-xs font-medium">
          <input
            type="checkbox"
            checked={showReformes}
            onChange={(e) => setShowReformes(e.target.checked)}
          />
          Afficher les vélos réformés
        </label>
      </div>

      <div className="card-sfax-flat overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b-[1.5px] border-[#14232B] bg-[#F6F1E7] font-mono-sfax text-xs uppercase">
            <tr>
              <th className="p-3">N° Série</th>
              <th className="p-3">Type</th>
              <th className="p-3">Couleur</th>
              <th className="p-3">Fournisseur</th>
              <th className="p-3">Localisation</th>
              <th className="p-3">État</th>
              <th className="p-3">Acquisition</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3D9C6]">
            {filtered.map((v) => (
              <tr
                key={v.num_serie}
                onClick={() => onSelectBike(v.num_serie)}
                className={`cursor-pointer hover:bg-[#F6F1E7]/80 ${
                  v.etat === "REFORME" ? "bg-reforme-stripes opacity-70" : ""
                }`}
              >
                <td className="p-3 font-mono-sfax font-bold text-[#0E5A6B]">
                  {v.num_serie}
                </td>
                <td className="p-3">
                  {types.find((t) => t.id_type === v.id_type)?.libelle}
                </td>
                <td className="p-3">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="h-3 w-3 rounded-full border border-[#14232B]"
                      style={{ backgroundColor: v.couleur_hex }}
                    />
                    {v.couleur}
                  </span>
                </td>
                <td className="p-3 text-xs">
                  {fournisseurs.find((f) => f.id_fournisseur === v.id_fournisseur)?.nom}
                </td>
                <td className="p-3 text-xs">
                  {v.immatriculation_camion ? (
                    <span className="inline-flex items-center gap-1 font-mono-sfax font-semibold text-[#0E5A6B]">
                      <Truck className="h-3.5 w-3.5" /> {v.immatriculation_camion}
                    </span>
                  ) : v.id_station ? (
                    stations.find((s) => s.id_station === v.id_station)?.nom
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-3">
                  <StatusChip etat={v.etat} />
                </td>
                <td className="p-3 font-mono-sfax text-xs">
                  {formatDate(v.date_acquisition)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function FicheVeloView({
  velo,
  types,
  fournisseurs,
  stations,
  locations,
  reclamations,
  reparations,
  onBack,
  onRefresh,
  onNavigatePlanifier,
}: {
  velo: Velo;
  types: TypeVelo[];
  fournisseurs: Fournisseur[];
  stations: Station[];
  locations: LocationRow[];
  reclamations: Reclamation[];
  reparations: Reparation[];
  onBack: () => void;
  onRefresh: () => Promise<void>;
  onNavigatePlanifier: (idRec: number) => void;
}) {
  const [showReformeModal, setShowReformeModal] = useState(false);
  const [motif, setMotif] = useState<MotifReforme>("AMORTI");
  const [detail, setDetail] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const bikeLocs = locations.filter((l) => l.num_serie === velo.num_serie);
  const bikeRecs = reclamations.filter((r) => r.num_serie === velo.num_serie);
  const openRec = bikeRecs.find((r) => !r.traitee);

  async function handleReformer() {
    setErr(null);
    const res = await reformerVeloAction({
      numSerie: velo.num_serie,
      motif,
      detail,
      dateReforme: new Date().toISOString().slice(0, 10),
    });
    if (!res.ok) {
      setErr(res.error ?? "Erreur");
      return;
    }
    setShowReformeModal(false);
    await onRefresh();
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0E5A6B] hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Retour au parc
      </button>

      <div className="card-sfax flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-mono-sfax text-3xl font-bold">
              {velo.num_serie}
            </h2>
            <StatusChip etat={velo.etat} size="md" />
          </div>
          <p className="mt-2 text-sm text-[#14232B]/75">
            {types.find((t) => t.id_type === velo.id_type)?.libelle} ·{" "}
            {velo.couleur} · Fournisseur :{" "}
            <strong>
              {fournisseurs.find((f) => f.id_fournisseur === velo.id_fournisseur)?.nom}
            </strong>{" "}
            · Acquis le {formatDate(velo.date_acquisition)}
          </p>
          {velo.remplace_num_serie && (
            <p className="mt-1 font-mono-sfax text-xs text-[#0E5A6B]">
              Remplace le vélo {velo.remplace_num_serie}
            </p>
          )}
        </div>
        <div className="text-right font-mono-sfax text-sm">
          <p className="text-xs uppercase text-[#14232B]/60">Localisation</p>
          <p className="font-semibold">
            {velo.id_station
              ? stations.find((s) => s.id_station === velo.id_station)?.nom
              : velo.immatriculation_camion ?? "En circulation / Hors station"}
          </p>
        </div>
      </div>

      {err && (
        <div className="rounded border border-[#C8553D] bg-[#C8553D]/12 p-3 text-sm text-[#9B3925]">
          {err}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Timeline verticale en ligne de route */}
        <div className="card-sfax-flat p-6 lg:col-span-2">
          <h3 className="text-lg font-bold">Historique du vélo</h3>
          <div className="mt-4 space-y-4 border-l-2 border-dotted border-[#0E5A6B] pl-5">
            <div>
              <p className="font-mono-sfax text-xs text-[#0E5A6B]">
                {formatDate(velo.date_acquisition)}
              </p>
              <p className="font-semibold">Acquisition enregistrée</p>
            </div>
            {bikeRecs.map((r) => {
              const rep = reparations.find(
                (p) => p.id_reclamation === r.id_reclamation
              );
              return (
                <div key={r.id_reclamation}>
                  <p className="font-mono-sfax text-xs text-[#C8553D]">
                    {formatDate(r.date_reclamation)} · Réclamation #{r.id_reclamation}
                  </p>
                  <p className="text-sm font-medium">{r.diagnostic}</p>
                  {rep && (
                    <p className="font-mono-sfax text-xs text-[#5E7B3A]">
                      Réparation {rep.statut}{" "}
                      {rep.compte_rendu ? `— ${rep.compte_rendu}` : ""}
                    </p>
                  )}
                </div>
              );
            })}
            {bikeLocs.slice(0, 5).map((l) => (
              <div key={l.id_location}>
                <p className="font-mono-sfax text-xs text-[#14232B]/70">
                  {formatDate(l.date_heure_debut)} · Location #{l.id_location}
                </p>
                <p className="text-sm">
                  {stations.find((s) => s.id_station === l.id_station_depart)?.nom}{" "}
                  →{" "}
                  {l.id_station_arrivee_reelle
                    ? stations.find(
                        (s) => s.id_station === l.id_station_arrivee_reelle
                      )?.nom
                    : "En cours"}
                </p>
              </div>
            ))}
            {velo.etat === "REFORME" && (
              <div>
                <p className="font-mono-sfax text-xs text-[#7A7A72]">
                  {velo.date_reforme ? formatDate(velo.date_reforme) : ""} · Réforme
                </p>
                <p className="font-semibold">
                  Motif : {velo.motif_reforme} — {velo.motif_reforme_detail}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Actions contextuelles */}
        <div className="card-sfax space-y-3 p-5">
          <h3 className="text-lg font-bold">Actions</h3>
          {velo.etat === "LOUE" && (
            <p className="text-sm text-[#14232B]/75">
              Vélo en cours de location — actions verrouillées jusqu&apos;à la
              restitution.
            </p>
          )}
          {velo.etat === "REFORME" && (
            <p className="text-sm text-[#7A7A72]">
              Ce vélo est réformé (lecture seule).
            </p>
          )}
          {velo.etat === "EN_PANNE" && openRec && (
            <button
              type="button"
              onClick={() => onNavigatePlanifier(openRec.id_reclamation)}
              className="btn-sfax-primary w-full py-2.5 text-sm"
            >
              Planifier une réparation
            </button>
          )}
          {velo.etat !== "LOUE" && velo.etat !== "REFORME" && (
            <button
              type="button"
              onClick={() => setShowReformeModal(true)}
              className="btn-sfax-outline w-full border-[#C8553D] py-2.5 text-sm text-[#9B3925]"
            >
              Réformer ce vélo (R8)
            </button>
          )}
        </div>
      </div>

      {/* R8 Modale Réformer un vélo */}
      {showReformeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14232B]/55 p-4">
          <div className="card-sfax w-full max-w-md space-y-4 p-6">
            <h3 className="text-xl font-bold">
              Réformer le vélo {velo.num_serie}
            </h3>
            <div className="rounded border border-[#C8553D] bg-[#C8553D]/12 p-3 text-xs text-[#9B3925]">
              Action irréversible. Le vélo sera retiré de sa station et marqué
              REFORME.
            </div>
            <select
              value={motif}
              onChange={(e) => setMotif(e.target.value as MotifReforme)}
              className="w-full rounded border border-[#14232B] bg-[#F6F1E7] px-3 py-2 text-sm"
            >
              <option value="AMORTI">Amorti</option>
              <option value="ACCIDENT">Accident</option>
              <option value="IRREPARABLE">Irréparable</option>
              <option value="AUTRE">Autre</option>
            </select>
            <textarea
              rows={3}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="Précisions sur la réforme..."
              className="w-full rounded border border-[#14232B] bg-[#F6F1E7] p-2.5 text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowReformeModal(false)}
                className="btn-sfax-outline px-4 py-2 text-sm"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleReformer}
                className="rounded-[6px] border border-[#14232B] bg-[#C8553D] px-4 py-2 text-sm font-semibold text-white"
              >
                Confirmer la réforme
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AcquerirVeloView({
  types,
  fournisseurs,
  stations,
  velos,
  onDone,
}: {
  types: TypeVelo[];
  fournisseurs: Fournisseur[];
  stations: Station[];
  velos: Velo[];
  onDone: () => Promise<void>;
}) {
  const [step, setStep] = useState(0);
  const [seriesMode, setSeriesMode] = useState(false);
  const [serialInput, setSerialInput] = useState("VSF-000501");
  const [couleur, setCouleur] = useState(COULEURS[0]);
  const [idType, setIdType] = useState<number>(types[0]?.id_type ?? 1);
  const [dateAcq, setDateAcq] = useState(new Date().toISOString().slice(0, 10));
  const [idFournisseur, setIdFournisseur] = useState<number>(
    fournisseurs[0]?.id_fournisseur ?? 1
  );
  const [showNewFourn, setShowNewFourn] = useState(false);
  const [newFNom, setNewFNom] = useState("");
  const [newFAdr, setNewFAdr] = useState("");
  const [newFTel, setNewFTel] = useState("+216 ");

  const [idStation, setIdStation] = useState<number>(
    stations.find((s) => s.nb_velos_actuel < s.capacite)?.id_station ??
      stations[0]?.id_station ??
      1
  );
  const [isReplacement, setIsReplacement] = useState(false);
  const [replaceSerial, setReplaceSerial] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const serialList = seriesMode
    ? serialInput
        .split(/[\n,;]+/)
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
    : [serialInput.trim().toUpperCase()];

  const existsInDb =
    !seriesMode && velos.some((v) => v.num_serie === serialList[0]);

  async function handleSave(addAnother: boolean) {
    setErr(null);
    setMsg(null);
    const res = await acquerirVelosAction({
      numSeries: serialList,
      couleur: couleur.nom,
      couleurHex: couleur.hex,
      idType,
      idFournisseur,
      idStation,
      dateAcquisition: dateAcq,
      remplaceNumSerie: isReplacement && replaceSerial ? replaceSerial : null,
    });
    if (!res.ok) {
      setErr(res.error ?? res.failures?.[0]?.reason ?? "Erreur");
      return;
    }
    setMsg(`${res.created?.length ?? 1} vélo(s) enregistré(s) avec succès.`);
    await onDone();
    if (addAnother) {
      setSerialInput("VSF-");
      setStep(0);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Acquérir un vélo (R5)</h2>
      <RouteLineStepper
        steps={[
          { id: 1, label: "1. Vélo" },
          { id: 2, label: "2. Fournisseur" },
          { id: 3, label: "3. Affectation" },
        ]}
        currentStep={step}
      />

      {err && (
        <div className="rounded border border-[#C8553D] bg-[#C8553D]/12 p-3 text-sm text-[#9B3925]">
          {err}
        </div>
      )}
      {msg && (
        <div className="rounded border border-[#5E7B3A] bg-[#5E7B3A]/12 p-3 text-sm font-semibold text-[#3D5223]">
          {msg}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card-sfax space-y-4 p-6 lg:col-span-2">
          {step === 0 && (
            <>
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold">
                  Numéro(s) de série (VSF-XXXXXX)
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={seriesMode}
                    onChange={(e) => setSeriesMode(e.target.checked)}
                  />
                  Ajouter une série
                </label>
              </div>
              {seriesMode ? (
                <textarea
                  rows={3}
                  value={serialInput}
                  onChange={(e) => setSerialInput(e.target.value)}
                  placeholder="VSF-000501, VSF-000502..."
                  className="w-full rounded border border-[#14232B] bg-[#F6F1E7] p-3 font-mono-sfax text-sm"
                />
              ) : (
                <div>
                  <input
                    type="text"
                    value={serialInput}
                    onChange={(e) => setSerialInput(e.target.value.toUpperCase())}
                    className="w-full rounded border border-[#14232B] bg-[#F6F1E7] px-3 py-2 font-mono-sfax text-base"
                  />
                  <p className="mt-1 font-mono-sfax text-xs">
                    {existsInDb ? (
                      <span className="text-[#C8553D]">
                        Déjà existant dans le parc !
                      </span>
                    ) : (
                      <span className="text-[#5E7B3A]">Disponible</span>
                    )}
                  </p>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold">Type</label>
                  <select
                    value={idType}
                    onChange={(e) => setIdType(Number(e.target.value))}
                    className="mt-1 w-full rounded border border-[#14232B] bg-[#F6F1E7] px-3 py-2 text-sm"
                  >
                    {types.map((t) => (
                      <option key={t.id_type} value={t.id_type}>
                        {t.libelle}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold">
                    Date d&apos;acquisition
                  </label>
                  <input
                    type="date"
                    max={new Date().toISOString().slice(0, 10)}
                    value={dateAcq}
                    onChange={(e) => setDateAcq(e.target.value)}
                    className="mt-1 w-full rounded border border-[#14232B] bg-[#F6F1E7] px-3 py-2 font-mono-sfax text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold">Couleur</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {COULEURS.map((c) => (
                    <button
                      key={c.nom}
                      type="button"
                      onClick={() => setCouleur(c)}
                      className={`inline-flex items-center gap-2 rounded border px-3 py-1.5 text-xs font-semibold ${
                        couleur.nom === c.nom
                          ? "border-[#14232B] bg-[#F0A42B]/30"
                          : "border-[#E3D9C6] bg-[#F6F1E7]"
                      }`}
                    >
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-[#14232B]"
                        style={{ backgroundColor: c.hex }}
                      />
                      {c.nom}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={existsInDb}
                  onClick={() => setStep(1)}
                  className="btn-sfax-primary px-6 py-2 text-sm"
                >
                  Étape suivante →
                </button>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold">Fournisseur</label>
                <button
                  type="button"
                  onClick={() => setShowNewFourn((v) => !v)}
                  className="text-xs font-semibold text-[#0E5A6B] underline"
                >
                  + Ajouter un fournisseur
                </button>
              </div>
              <select
                value={idFournisseur}
                onChange={(e) => setIdFournisseur(Number(e.target.value))}
                className="w-full rounded border border-[#14232B] bg-[#F6F1E7] px-3 py-2 text-sm"
              >
                {fournisseurs
                  .filter((f) => !f.archive)
                  .map((f) => (
                    <option key={f.id_fournisseur} value={f.id_fournisseur}>
                      {f.nom} ({f.tel})
                    </option>
                  ))}
              </select>

              {showNewFourn && (
                <div className="space-y-2 rounded border border-[#0E5A6B] bg-[#F6F1E7] p-3">
                  <input
                    type="text"
                    placeholder="Nom fournisseur"
                    value={newFNom}
                    onChange={(e) => setNewFNom(e.target.value)}
                    className="w-full rounded border border-[#14232B] bg-white px-2.5 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Adresse"
                    value={newFAdr}
                    onChange={(e) => setNewFAdr(e.target.value)}
                    className="w-full rounded border border-[#14232B] bg-white px-2.5 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    value={newFTel}
                    onChange={(e) =>
                      setNewFTel(formatTunisianPhoneInput(e.target.value))
                    }
                    className="w-full rounded border border-[#14232B] bg-white px-2.5 py-1.5 font-mono-sfax text-xs"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const r = await createFournisseurAction({
                        nom: newFNom,
                        adresse: newFAdr,
                        tel: newFTel,
                      });
                      if (r.ok && r.fournisseur) {
                        setShowNewFourn(false);
                        await onDone();
                        setIdFournisseur(r.fournisseur.id_fournisseur);
                      }
                    }}
                    className="btn-sfax-mer px-3 py-1.5 text-xs"
                  >
                    Créer et sélectionner
                  </button>
                </div>
              )}

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="btn-sfax-outline px-4 py-2 text-sm"
                >
                  ← Retour
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="btn-sfax-primary px-6 py-2 text-sm"
                >
                  Étape suivante →
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label className="block text-sm font-semibold">
                  Station d&apos;affectation
                </label>
                <select
                  value={idStation}
                  onChange={(e) => setIdStation(Number(e.target.value))}
                  className="mt-1 w-full rounded border border-[#14232B] bg-[#F6F1E7] px-3 py-2 text-sm"
                >
                  {stations.map((s) => {
                    const full = s.nb_velos_actuel >= s.capacite;
                    return (
                      <option
                        key={s.id_station}
                        value={s.id_station}
                        disabled={full}
                      >
                        {s.nom} ({s.nb_velos_actuel}/{s.capacite})
                        {full ? " — Pleine" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={isReplacement}
                  onChange={(e) => setIsReplacement(e.target.checked)}
                />
                Ce vélo remplace un vélo non fonctionnel
              </label>

              {isReplacement && (
                <select
                  value={replaceSerial}
                  onChange={(e) => setReplaceSerial(e.target.value)}
                  className="w-full rounded border border-[#C8553D] bg-[#F6F1E7] px-3 py-2 font-mono-sfax text-sm"
                >
                  <option value="">Sélectionner le vélo à réformer...</option>
                  {velos
                    .filter((v) => v.etat === "EN_PANNE")
                    .map((v) => (
                      <option key={v.num_serie} value={v.num_serie}>
                        {v.num_serie} (EN_PANNE — sera marqué REFORME)
                      </option>
                    ))}
                </select>
              )}

              <div className="flex flex-wrap justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-sfax-outline px-4 py-2 text-sm"
                >
                  ← Retour
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleSave(true)}
                    className="btn-sfax-outline px-4 py-2 text-sm"
                  >
                    Enregistrer et en ajouter un autre
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSave(false)}
                    className="btn-sfax-primary px-6 py-2 text-sm"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Résumé en direct */}
        <div className="card-sfax-flat space-y-3 bg-[#FFFDF8] p-5">
          <span className="font-mono-sfax text-xs uppercase text-[#0E5A6B]">
            Aperçu fiche vélo
          </span>
          <p className="font-mono-sfax text-xl font-bold">
            {serialList.length > 1
              ? `${serialList.length} vélos en série`
              : serialList[0] || "VSF-XXXXXX"}
          </p>
          <p className="text-sm">
            Type : {types.find((t) => t.id_type === idType)?.libelle}
          </p>
          <p className="text-sm">Couleur : {couleur.nom}</p>
          <p className="text-sm">
            Fournisseur :{" "}
            {fournisseurs.find((f) => f.id_fournisseur === idFournisseur)?.nom}
          </p>
          <p className="text-sm">
            Station : {stations.find((s) => s.id_station === idStation)?.nom}
          </p>
        </div>
      </div>
    </div>
  );
}

export function FournisseursView({
  fournisseurs,
  velos,
  onRefresh,
}: {
  fournisseurs: Fournisseur[];
  velos: Velo[];
  onRefresh: () => Promise<void>;
}) {
  const [nom, setNom] = useState("");
  const [adresse, setAdresse] = useState("");
  const [tel, setTel] = useState("+216 ");
  const [msg, setMsg] = useState<string | null>(null);

  const similarMatch = nom.trim().length >= 4
    ? fournisseurs.find((f) =>
        f.nom.toLowerCase().includes(nom.trim().toLowerCase())
      )
    : null;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Fournisseurs ({fournisseurs.length})</h2>
      {msg && (
        <div className="rounded border border-[#0E5A6B] bg-[#0E5A6B]/10 p-3 text-sm">
          {msg}
        </div>
      )}

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await createFournisseurAction({ nom, adresse, tel });
          if (!r.ok) {
            setMsg(r.error ?? "Erreur");
            return;
          }
          setNom("");
          setAdresse("");
          setTel("+216 ");
          await onRefresh();
        }}
        className="card-sfax grid gap-3 p-4 md:grid-cols-4"
      >
        <input
          type="text"
          placeholder="Nom fournisseur"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          required
          className="rounded border border-[#14232B] bg-[#F6F1E7] px-3 py-2 text-sm"
        />
        <input
          type="text"
          placeholder="Adresse"
          value={adresse}
          onChange={(e) => setAdresse(e.target.value)}
          required
          className="rounded border border-[#14232B] bg-[#F6F1E7] px-3 py-2 text-sm"
        />
        <input
          type="text"
          value={tel}
          onChange={(e) => setTel(formatTunisianPhoneInput(e.target.value))}
          required
          className="rounded border border-[#14232B] bg-[#F6F1E7] px-3 py-2 font-mono-sfax text-sm"
        />
        <button type="submit" className="btn-sfax-primary px-4 py-2 text-sm">
          Ajouter fournisseur
        </button>
        {similarMatch && (
          <p className="md:col-span-4 text-xs font-semibold text-[#B8740B]">
            Nom similaire détecté : « {similarMatch.nom} » existe déjà.
          </p>
        )}
      </form>

      <div className="card-sfax-flat overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b-[1.5px] border-[#14232B] bg-[#F6F1E7] font-mono-sfax text-xs uppercase">
            <tr>
              <th className="p-3">Nom</th>
              <th className="p-3">Adresse</th>
              <th className="p-3">Téléphone</th>
              <th className="p-3">Vélos fournis</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3D9C6]">
            {fournisseurs.map((f) => {
              const count = velos.filter(
                (v) => v.id_fournisseur === f.id_fournisseur
              ).length;
              return (
                <tr key={f.id_fournisseur} className={f.archive ? "opacity-50" : ""}>
                  <td className="p-3 font-semibold">
                    {f.nom} {f.archive && "(Archivé)"}
                  </td>
                  <td className="p-3 text-xs">{f.adresse}</td>
                  <td className="p-3 font-mono-sfax text-xs">{f.tel}</td>
                  <td className="p-3 font-mono-sfax">{count}</td>
                  <td className="p-3">
                    {!f.archive && (
                      <button
                        type="button"
                        onClick={async () => {
                          const r = await archiveOrDeleteFournisseurAction(
                            f.id_fournisseur
                          );
                          if (r.message) setMsg(r.message);
                          await onRefresh();
                        }}
                        className="inline-flex items-center gap-1 rounded border border-[#14232B] px-2 py-1 text-xs"
                      >
                        <Archive className="h-3.5 w-3.5" />{" "}
                        {count > 0 ? "Archiver" : "Supprimer"}
                      </button>
                    )}
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

export function TypesEntrepotsView({
  types,
  entrepots,
  velos,
  stations,
  onRefresh,
}: {
  types: TypeVelo[];
  entrepots: Entrepot[];
  velos: Velo[];
  stations: Station[];
  onRefresh: () => Promise<void>;
}) {
  const [tab, setTab] = useState<"TYPES" | "ENTREPOTS">("TYPES");
  const [libelle, setLibelle] = useState("");
  const [entNom, setEntNom] = useState("");
  const [entAdr, setEntAdr] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TypeVelo | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("TYPES")}
          className={`rounded-[6px] border-[1.5px] border-[#14232B] px-4 py-2 text-sm font-semibold ${
            tab === "TYPES" ? "bg-[#0E5A6B] text-white" : "bg-[#FFFDF8]"
          }`}
        >
          Types de vélo ({types.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("ENTREPOTS")}
          className={`rounded-[6px] border-[1.5px] border-[#14232B] px-4 py-2 text-sm font-semibold ${
            tab === "ENTREPOTS" ? "bg-[#0E5A6B] text-white" : "bg-[#FFFDF8]"
          }`}
        >
          Entrepôts ({entrepots.length})
        </button>
      </div>

      {err && (
        <div className="rounded border border-[#C8553D] bg-[#C8553D]/12 p-3 text-sm text-[#9B3925]">
          {err}
        </div>
      )}

      {tab === "TYPES" ? (
        <div className="space-y-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setErr(null);
              const r = await createTypeVeloAction(libelle);
              if (!r.ok) setErr(r.error ?? "Erreur");
              else {
                setLibelle("");
                await onRefresh();
              }
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              placeholder="Nouveau type (ex. Cargo)"
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              required
              className="rounded border border-[#14232B] bg-[#FFFDF8] px-3 py-2 text-sm"
            />
            <button type="submit" className="btn-sfax-primary px-4 py-2 text-sm">
              Ajouter
            </button>
          </form>

          <div className="card-sfax-flat divide-y divide-[#E3D9C6]">
            {types.map((t) => {
              const count = velos.filter((v) => v.id_type === t.id_type).length;
              return (
                <div
                  key={t.id_type}
                  className="flex items-center justify-between p-4"
                >
                  <div>
                    <span className="font-semibold">{t.libelle}</span>
                    <span className="ml-3 font-mono-sfax text-xs text-[#0E5A6B]">
                      {count} vélo(s)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(t)}
                    className="rounded border border-[#C8553D] px-2.5 py-1 text-xs text-[#9B3925]"
                  >
                    Supprimer
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setErr(null);
              const r = await createEntrepotAction(entNom, entAdr);
              if (!r.ok) setErr(r.error ?? "Erreur");
              else {
                setEntNom("");
                setEntAdr("");
                await onRefresh();
              }
            }}
            className="flex flex-wrap gap-2"
          >
            <input
              type="text"
              placeholder="Nom entrepôt"
              value={entNom}
              onChange={(e) => setEntNom(e.target.value)}
              required
              className="rounded border border-[#14232B] bg-[#FFFDF8] px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Adresse"
              value={entAdr}
              onChange={(e) => setEntAdr(e.target.value)}
              required
              className="flex-1 rounded border border-[#14232B] bg-[#FFFDF8] px-3 py-2 text-sm"
            />
            <button type="submit" className="btn-sfax-primary px-4 py-2 text-sm">
              Ajouter
            </button>
          </form>

          <div className="card-sfax-flat divide-y divide-[#E3D9C6]">
            {entrepots.map((e) => (
              <div key={e.id_entrepot} className="p-4">
                <p className="font-semibold">{e.nom}</p>
                <p className="text-xs text-[#14232B]/70">{e.adresse}</p>
                <p className="mt-1 font-mono-sfax text-xs text-[#0E5A6B]">
                  {stations.filter((s) => s.id_entrepot === e.id_entrepot).length}{" "}
                  station(s) rattachée(s)
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(confirmDelete)}
        title="Supprimer le type de vélo"
        objectName={confirmDelete?.libelle ?? ""}
        description="Cette action supprimera ce type de vélo s'il n'est lié à aucun vélo."
        onClose={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (!confirmDelete) return;
          const r = await deleteTypeVeloAction(confirmDelete.id_type);
          if (!r.ok && r.error) setErr(r.error);
          setConfirmDelete(null);
          await onRefresh();
        }}
      />
    </div>
  );
}
