"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  ClipboardCheck,
  Truck,
  Wrench,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Camera,
} from "lucide-react";
import type { StaffSession } from "@/lib/auth";
import type {
  Station,
  Velo,
  TypeVelo,
  Reclamation,
  Reparation,
  OrdreMission,
  Itineraire,
  EtapeItineraire,
} from "@/lib/supabase/types";
import { StatusChip } from "@/components/ui/StatusChip";
import { formatDate } from "@/lib/format";
import {
  getTechnicienBootstrapAction,
  enregistrerControleJournalierAction,
  executerEtapeMissionAction,
  cloturerMissionAction,
  demarrerReparationAction,
  cloturerReparationAction,
} from "@/app/actions/technicien";

type Tab = "T1" | "T2" | "T3" | "T4";

const DIAG_CHIPS = [
  "Freins",
  "Pneu",
  "Chaîne",
  "Moteur",
  "Éclairage",
  "Selle",
];

const REPAIR_TEMPLATES = [
  "Remplacement plaquettes de frein et réglage câble.",
  "Changement chambre à air et contrôle pression pneu.",
  "Remise en tension chaîne et lubrification transmission.",
  "Réinitialisation contrôleur batterie et connectique.",
];

export function TechnicienApp({
  initialData,
}: {
  initialData: {
    session: StaffSession;
    stations: Station[];
    velos: Velo[];
    types: TypeVelo[];
    reclamations: Reclamation[];
    reparations: Reparation[];
    ordresMission: OrdreMission[];
    itineraires: Itineraire[];
    etapes: EtapeItineraire[];
    controlesAujourdhui: Array<{ num_serie: string; bon_etat: boolean }>;
  };
}) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [tab, setTab] = useState<Tab>("T1");
  const [offline, setOffline] = useState(false);
  const [pendingQueue, setPendingQueue] = useState<number>(0);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // T2 Contrôle journalier
  const [scanSerial, setScanSerial] = useState("");
  const [selectedBike, setSelectedBike] = useState<Velo | null>(null);
  const [showFaultForm, setShowFaultForm] = useState(false);
  const [diagChips, setDiagChips] = useState<string[]>([]);
  const [diagText, setDiagText] = useState("");

  // T3 Mission
  const [stepCount, setStepCount] = useState<number>(0);
  const [stepReason, setStepReason] = useState("");

  // T4 Réparations
  const [activeRep, setActiveRep] = useState<Reparation | null>(null);
  const [compteRendu, setCompteRendu] = useState("");
  const [repOutcome, setRepOutcome] = useState<
    "REPARE" | "IRREPARABLE" | "PIECES_MANQUANTES"
  >("REPARE");

  useEffect(() => {
    const updateNet = () => setOffline(!navigator.onLine);
    updateNet();
    window.addEventListener("online", updateNet);
    window.addEventListener("offline", updateNet);
    const saved = localStorage.getItem("velosf_tech_queue");
    if (saved) {
      try {
        setPendingQueue(JSON.parse(saved).length);
      } catch {
        setPendingQueue(0);
      }
    }
    return () => {
      window.removeEventListener("online", updateNet);
      window.removeEventListener("offline", updateNet);
    };
  }, []);

  async function refresh() {
    const fresh = await getTechnicienBootstrapAction();
    setData(fresh as typeof initialData);
  }

  function showToastMsg(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const missionDuJour =
    data.ordresMission.find(
      (o) => o.statut === "EN_COURS" || o.statut === "NON_DEMARRE"
    ) ?? null;

  const etapesMission = missionDuJour
    ? data.etapes.filter((e) => e.id_itineraire === missionDuJour.id_itineraire)
    : [];

  const currentEtape = etapesMission.find((e) => !e.effectuee) ?? null;

  const activeBikesTotal = data.velos.filter((v) => v.etat !== "REFORME").length;
  const checkedCount = data.controlesAujourdhui.length;
  const plannedTodayReps = data.reparations.filter(
    (r) => r.statut !== "TERMINEE"
  );

  const bikesInTruck = missionDuJour
    ? data.velos.filter(
        (v) => v.immatriculation_camion === missionDuJour.immatriculation_camion
      ).length
    : 0;

  async function submitControle(bonEtat: boolean) {
    if (!selectedBike) return;
    const diagnostic = [...diagChips, diagText.trim()]
      .filter(Boolean)
      .join(" — ");

    if (offline) {
      const q = JSON.parse(localStorage.getItem("velosf_tech_queue") || "[]");
      q.push({ numSerie: selectedBike.num_serie, bonEtat, diagnostic });
      localStorage.setItem("velosf_tech_queue", JSON.stringify(q));
      setPendingQueue(q.length);
      showToastMsg("Action enregistrée hors connexion.");
      setSelectedBike(null);
      setShowFaultForm(false);
      return;
    }

    setBusy(true);
    const res = await enregistrerControleJournalierAction({
      numSerie: selectedBike.num_serie,
      bonEtat,
      diagnostic,
    });
    setBusy(false);

    if (!res.ok) {
      showToastMsg(res.error ?? "Erreur");
      return;
    }

    showToastMsg(
      bonEtat
        ? `Vélo ${selectedBike.num_serie} contrôlé : bon état.`
        : `Réclamation #${res.idReclamation} envoyée au Responsable.`
    );
    setSelectedBike(null);
    setScanSerial("");
    setShowFaultForm(false);
    setDiagChips([]);
    setDiagText("");
    await refresh();
  }

  async function handleFinishEtape() {
    if (!missionDuJour || !currentEtape) return;
    const countToSend = stepCount > 0 ? stepCount : currentEtape.nb_velos;
    if (countToSend !== currentEtape.nb_velos && !stepReason.trim()) {
      showToastMsg("Précisez la raison de l'écart par rapport au plan.");
      return;
    }
    setBusy(true);
    const res = await executerEtapeMissionAction({
      idOrdre: missionDuJour.id_ordre,
      idEtape: currentEtape.id_etape,
      nbVelosReel: countToSend,
      motifEcart: stepReason,
    });
    setBusy(false);
    if (!res.ok) {
      showToastMsg(res.error ?? "Erreur");
      return;
    }
    setStepCount(0);
    setStepReason("");
    showToastMsg("Étape validée.");
    await refresh();
  }

  async function handleCloturerMission() {
    if (!missionDuJour) return;
    setBusy(true);
    await cloturerMissionAction(missionDuJour.id_ordre);
    setBusy(false);
    showToastMsg("Mission clôturée avec succès.");
    await refresh();
  }

  async function handleCloturerReparation() {
    if (!activeRep) return;
    setBusy(true);
    const res = await cloturerReparationAction({
      idReparation: activeRep.id_reparation,
      compteRendu,
      outcome: repOutcome,
    });
    setBusy(false);
    if (!res.ok) {
      showToastMsg(res.error ?? "Erreur");
      return;
    }
    showToastMsg("Réparation mise à jour.");
    setActiveRep(null);
    setCompteRendu("");
    await refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col border-x border-[#14232B]/15 bg-[#F6F1E7] pb-24">
      {/* En-tête mobile */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b-[1.5px] border-[#14232B] bg-[#0E5A6B] px-4 py-3 text-[#FFFDF8]">
        <div>
          <p className="font-mono-sfax text-[11px] uppercase text-[#9DB8BF]">
            VéloSf Technicien · #{data.session.matricule}
          </p>
          <h1 className="text-lg font-bold">
            {data.session.prenom} {data.session.nom}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOffline((v) => !v)}
            className="rounded border border-[#9DB8BF]/50 px-2 py-1 font-mono-sfax text-[11px]"
          >
            {offline ? "Sim. Online" : "Sim. Offline"}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Déconnexion"
            className="rounded p-2 hover:bg-[#14232B]/30"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {offline && (
        <div className="flex items-center justify-between border-b border-[#14232B] bg-[#F0A42B] px-4 py-2 text-xs font-semibold text-[#14232B]">
          <span className="flex items-center gap-1.5">
            <WifiOff className="h-4 w-4" />
            Hors connexion : actions en file ({pendingQueue})
          </span>
        </div>
      )}

      {toast && (
        <div className="m-3 rounded-[6px] border-[1.5px] border-[#14232B] bg-[#5E7B3A] px-4 py-3 text-sm font-semibold text-white">
          {toast}
        </div>
      )}

      <main className="flex-1 space-y-4 p-4">
        {/* T1 · AUJOURD'HUI */}
        {tab === "T1" && (
          <>
            <div>
              <p className="font-mono-sfax text-xs text-[#0E5A6B]">
                {formatDate(new Date())}
              </p>
              <h2 className="text-2xl font-bold">
                Bonjour {data.session.prenom}
              </h2>
            </div>

            {/* Carte Mission du jour */}
            <div className="card-sfax p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono-sfax text-xs font-semibold uppercase text-[#0E5A6B]">
                  Mission du jour
                </span>
                <Truck className="h-5 w-5 text-[#0E5A6B]" />
              </div>
              {missionDuJour ? (
                <>
                  <p className="mt-2 text-lg font-bold">
                    Camion {missionDuJour.immatriculation_camion}
                  </p>
                  <p className="text-sm text-[#14232B]/75">
                    {etapesMission.length} étape(s) · Statut :{" "}
                    <span className="font-mono-sfax font-semibold">
                      {missionDuJour.statut}
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setTab("T3")}
                    className="btn-sfax-primary mt-4 min-h-[52px] w-full text-base"
                  >
                    {missionDuJour.statut === "EN_COURS"
                      ? "Reprendre la mission"
                      : "Démarrer la mission"}
                  </button>
                </>
              ) : (
                <p className="mt-2 text-sm text-[#14232B]/70">
                  Aucune mission de rééquilibrage attribuée aujourd&apos;hui.
                </p>
              )}
            </div>

            {/* Carte Contrôle journalier */}
            <div className="card-sfax p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono-sfax text-xs font-semibold uppercase text-[#5E7B3A]">
                  Contrôle journalier
                </span>
                <ClipboardCheck className="h-5 w-5 text-[#5E7B3A]" />
              </div>
              <p className="mt-2 font-mono-sfax text-2xl font-bold">
                {checkedCount} / {activeBikesTotal} vélos contrôlés
              </p>
              <button
                type="button"
                onClick={() => setTab("T2")}
                className="btn-sfax-mer mt-4 min-h-[52px] w-full text-base"
              >
                Contrôler des vélos
              </button>
            </div>

            {/* Carte Réparations */}
            <div className="card-sfax p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono-sfax text-xs font-semibold uppercase text-[#B8740B]">
                  Réparations planifiées
                </span>
                <Wrench className="h-5 w-5 text-[#B8740B]" />
              </div>
              <p className="mt-2 font-mono-sfax text-2xl font-bold">
                {plannedTodayReps.length} intervention(s)
              </p>
              <button
                type="button"
                onClick={() => setTab("T4")}
                className="btn-sfax-outline mt-4 min-h-[52px] w-full text-base"
              >
                Voir mes réparations
              </button>
            </div>
          </>
        )}

        {/* T2 · CONTRÔLE JOURNALIER */}
        {tab === "T2" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Contrôle journalier</h2>
            <div className="card-sfax p-4">
              <label className="block text-sm font-semibold">
                Scanner ou saisir le n° de série
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={scanSerial}
                  onChange={(e) => setScanSerial(e.target.value.toUpperCase())}
                  placeholder="VSF-000401"
                  className="flex-1 rounded-[6px] border-[1.5px] border-[#14232B] bg-[#F6F1E7] px-3 py-3 font-mono-sfax text-lg"
                />
                <button
                  type="button"
                  onClick={() => {
                    const found = data.velos.find(
                      (v) => v.num_serie === scanSerial.trim().toUpperCase()
                    );
                    if (!found) {
                      showToastMsg("Vélo introuvable.");
                    } else {
                      setSelectedBike(found);
                      setShowFaultForm(false);
                    }
                  }}
                  className="btn-sfax-primary min-h-[52px] px-4"
                >
                  <Camera className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {data.velos.slice(0, 6).map((v) => (
                  <button
                    key={v.num_serie}
                    type="button"
                    onClick={() => {
                      setScanSerial(v.num_serie);
                      setSelectedBike(v);
                      setShowFaultForm(false);
                    }}
                    className="rounded border border-[#14232B] bg-[#F6F1E7] px-2 py-1 font-mono-sfax text-xs"
                  >
                    {v.num_serie}
                  </button>
                ))}
              </div>
            </div>

            {selectedBike && (
              <div className="card-sfax space-y-4 p-5">
                <div className="flex items-center justify-between">
                  <span className="font-mono-sfax text-xl font-bold">
                    {selectedBike.num_serie}
                  </span>
                  <StatusChip etat={selectedBike.etat} />
                </div>

                {selectedBike.etat === "LOUE" ||
                selectedBike.etat === "REFORME" ? (
                  <p className="rounded bg-[#C8553D]/15 p-3 text-sm font-semibold text-[#9B3925]">
                    Contrôle impossible : ce vélo est actuellement{" "}
                    {selectedBike.etat}.
                  </p>
                ) : !showFaultForm ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => submitControle(true)}
                      className="min-h-[72px] rounded-[6px] border-[1.5px] border-[#14232B] bg-[#5E7B3A] text-lg font-bold text-white shadow-[3px_3px_0_#14232B]"
                    >
                      <CheckCircle2 className="mx-auto mb-1 h-6 w-6" />
                      Bon état
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowFaultForm(true)}
                      className="min-h-[72px] rounded-[6px] border-[1.5px] border-[#14232B] bg-[#C8553D] text-lg font-bold text-white shadow-[3px_3px_0_#14232B]"
                    >
                      <AlertTriangle className="mx-auto mb-1 h-6 w-6" />
                      En panne
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold">Diagnostic :</p>
                    <div className="flex flex-wrap gap-2">
                      {DIAG_CHIPS.map((c) => {
                        const active = diagChips.includes(c);
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() =>
                              setDiagChips((prev) =>
                                active
                                  ? prev.filter((x) => x !== c)
                                  : [...prev, c]
                              )
                            }
                            className={`min-h-[44px] rounded-[6px] border border-[#14232B] px-3 text-sm font-semibold ${
                              active ? "bg-[#C8553D] text-white" : "bg-[#F6F1E7]"
                            }`}
                          >
                            {c}
                          </button>
                        );
                      })}
                    </div>
                    <textarea
                      rows={3}
                      value={diagText}
                      onChange={(e) => setDiagText(e.target.value)}
                      placeholder="Précisez la panne constatée..."
                      className="w-full rounded-[6px] border-[1.5px] border-[#14232B] bg-[#F6F1E7] p-3 text-sm"
                    />
                    <button
                      type="button"
                      disabled={
                        busy || (diagChips.length === 0 && diagText.trim().length < 3)
                      }
                      onClick={() => submitControle(false)}
                      className="btn-sfax-primary min-h-[56px] w-full text-base"
                    >
                      Envoyer la réclamation
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* T3 · EXÉCUTION DE LA MISSION */}
        {tab === "T3" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Exécution mission</h2>
              <span className="rounded-[6px] border border-[#14232B] bg-[#0E5A6B] px-3 py-1 font-mono-sfax text-xs font-semibold text-white">
                Camion : {bikesInTruck} vélos
              </span>
            </div>

            {!missionDuJour ? (
              <div className="card-sfax p-6 text-center text-sm">
                Aucune mission active.
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {etapesMission.map((etape) => {
                    const st = data.stations.find(
                      (s) => s.id_station === etape.id_station
                    );
                    const isCurrent = currentEtape?.id_etape === etape.id_etape;
                    return (
                      <div
                        key={etape.id_etape}
                        className={`card-sfax p-4 ${
                          etape.effectuee ? "opacity-60" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono-sfax text-xs font-bold text-[#0E5A6B]">
                            ÉTAPE {etape.ordre} · {etape.action}
                          </span>
                          <span className="font-mono-sfax text-xs font-semibold">
                            {etape.effectuee
                              ? `Fait (${etape.nb_velos_reel})`
                              : `${etape.nb_velos} vélos`}
                          </span>
                        </div>
                        <p className="mt-1 text-lg font-bold">{st?.nom}</p>

                        {isCurrent && (
                          <div className="mt-4 space-y-3 border-t border-dotted border-[#14232B] pt-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold">
                                Quantité réelle :
                              </span>
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setStepCount((c) =>
                                      Math.max(
                                        0,
                                        (c || etape.nb_velos) - 1
                                      )
                                    )
                                  }
                                  className="btn-sfax-outline h-12 w-12 text-xl"
                                >
                                  −
                                </button>
                                <span className="font-mono-sfax text-2xl font-bold">
                                  {stepCount || etape.nb_velos}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setStepCount(
                                      (c) => (c || etape.nb_velos) + 1
                                    )
                                  }
                                  className="btn-sfax-outline h-12 w-12 text-xl"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {stepCount > 0 && stepCount !== etape.nb_velos && (
                              <input
                                type="text"
                                value={stepReason}
                                onChange={(e) => setStepReason(e.target.value)}
                                placeholder="Motif de l'écart (obligatoire)..."
                                className="w-full rounded border border-[#14232B] bg-[#F6F1E7] px-3 py-2 text-sm"
                              />
                            )}

                            <button
                              type="button"
                              disabled={busy}
                              onClick={handleFinishEtape}
                              className="btn-sfax-primary min-h-[52px] w-full text-base"
                            >
                              Étape terminée
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {!currentEtape && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleCloturerMission}
                    className="btn-sfax-primary min-h-[56px] w-full text-lg"
                  >
                    Clôturer la mission
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* T4 · MES RÉPARATIONS */}
        {tab === "T4" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Mes réparations</h2>
            {data.reparations.length === 0 ? (
              <div className="card-sfax p-6 text-center text-sm">
                Aucune réparation assignée.
              </div>
            ) : (
              data.reparations.map((rep) => {
                const rec = data.reclamations.find(
                  (r) => r.id_reclamation === rep.id_reclamation
                );
                const isEditing = activeRep?.id_reparation === rep.id_reparation;
                return (
                  <div key={rep.id_reparation} className="card-sfax p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono-sfax text-base font-bold">
                        {rec?.num_serie ?? `Rép #${rep.id_reparation}`}
                      </span>
                      <span className="rounded border border-[#14232B] bg-[#F6F1E7] px-2 py-0.5 font-mono-sfax text-xs font-semibold">
                        {rep.statut}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[#14232B]/80">
                      {rec?.diagnostic}
                    </p>
                    <p className="mt-1 font-mono-sfax text-xs text-[#0E5A6B]">
                      Planifiée : {formatDate(rep.date_planifiee)}
                    </p>

                    {rep.statut === "PLANIFIEE" && (
                      <button
                        type="button"
                        onClick={async () => {
                          await demarrerReparationAction(rep.id_reparation);
                          await refresh();
                        }}
                        className="btn-sfax-mer mt-3 min-h-[48px] w-full text-sm"
                      >
                        Démarrer la réparation
                      </button>
                    )}

                    {rep.statut === "EN_COURS" && !isEditing && (
                      <button
                        type="button"
                        onClick={() => setActiveRep(rep)}
                        className="btn-sfax-primary mt-3 min-h-[48px] w-full text-sm"
                      >
                        Clôturer
                      </button>
                    )}

                    {isEditing && (
                      <div className="mt-4 space-y-3 border-t border-dotted border-[#14232B] pt-3">
                        <div className="flex flex-wrap gap-1.5">
                          {REPAIR_TEMPLATES.map((tpl) => (
                            <button
                              key={tpl}
                              type="button"
                              onClick={() => setCompteRendu(tpl)}
                              className="rounded border border-[#14232B] bg-[#F6F1E7] px-2 py-1 text-left text-[11px]"
                            >
                              {tpl.slice(0, 32)}...
                            </button>
                          ))}
                        </div>
                        <textarea
                          rows={3}
                          value={compteRendu}
                          onChange={(e) => setCompteRendu(e.target.value)}
                          placeholder="Compte rendu d'intervention (min. 15 caractères)..."
                          className="w-full rounded border border-[#14232B] bg-[#F6F1E7] p-2.5 text-sm"
                        />
                        <select
                          value={repOutcome}
                          onChange={(e) =>
                            setRepOutcome(
                              e.target.value as
                                | "REPARE"
                                | "IRREPARABLE"
                                | "PIECES_MANQUANTES"
                            )
                          }
                          className="w-full rounded border border-[#14232B] bg-[#F6F1E7] p-2.5 text-sm font-semibold"
                        >
                          <option value="REPARE">
                            Réparé, remis en service (DISPONIBLE)
                          </option>
                          <option value="IRREPARABLE">
                            Irréparable (alerter le Responsable)
                          </option>
                          <option value="PIECES_MANQUANTES">
                            Pièces manquantes (reporter)
                          </option>
                        </select>
                        <button
                          type="button"
                          disabled={busy || compteRendu.trim().length < 15}
                          onClick={handleCloturerReparation}
                          className="btn-sfax-primary min-h-[52px] w-full text-base"
                        >
                          Valider la clôture
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>

      {/* Barre d'onglets inférieure fixe */}
      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto grid max-w-md grid-cols-4 border-t-[1.5px] border-[#14232B] bg-[#FFFDF8]">
        {[
          { id: "T1" as Tab, label: "Aujourd'hui", Icon: CalendarCheck },
          { id: "T2" as Tab, label: "Contrôle", Icon: ClipboardCheck },
          { id: "T3" as Tab, label: "Mission", Icon: Truck },
          { id: "T4" as Tab, label: "Réparations", Icon: Wrench },
        ].map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex min-h-[64px] flex-col items-center justify-center gap-1 text-xs font-semibold ${
                active
                  ? "bg-[#F0A42B] text-[#14232B]"
                  : "text-[#14232B]/70 hover:bg-[#F6F1E7]"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
