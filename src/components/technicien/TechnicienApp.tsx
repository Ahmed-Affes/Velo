"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  Camion,
  Reclamation,
  Reparation,
  OrdreMission,
  Itineraire,
  EtapeItineraire,
} from "@/lib/supabase/types";
import { StatusChip } from "@/components/ui/StatusChip";
import { formatDate } from "@/lib/format";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import {
  getTechnicienBootstrapAction,
  enregistrerControleJournalierAction,
  executerEtapeMissionAction,
  recupererVeloEnPanneMissionAction,
  dechargerVeloAtelierAction,
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
  initialTab = "T1",
}: {
  initialData: {
    session: StaffSession;
    stations: Station[];
    velos: Velo[];
    types: TypeVelo[];
    camions: Camion[];
    reclamations: Reclamation[];
    reparations: Reparation[];
    ordresMission: OrdreMission[];
    itineraires: Itineraire[];
    etapes: EtapeItineraire[];
    controlesAujourdhui: Array<{ num_serie: string; bon_etat: boolean }>;
  };
  initialTab?: Tab;
}) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [tab, setTabState] = useState<Tab>(initialTab);

  const setTab = useCallback((next: Tab) => {
    setTabState(next);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", next);
      window.history.replaceState(null, "", url.toString());
    }
  }, []);

  const [offline, setOffline] = useState(false);
  const [pendingQueue, setPendingQueue] = useState<number>(0);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Sélection multi-missions
  const activeMissions = data.ordresMission.filter(
    (o) => o.statut === "EN_COURS" || o.statut === "NON_DEMARRE"
  );
  const [selectedOrdreId, setSelectedOrdreId] = useState<number | null>(
    activeMissions[0]?.id_ordre ?? data.ordresMission[0]?.id_ordre ?? null
  );

  // T2 Contrôle journalier
  const [scanSerial, setScanSerial] = useState("");
  const [selectedBike, setSelectedBike] = useState<Velo | null>(null);
  const [showFaultForm, setShowFaultForm] = useState(false);
  const [diagChips, setDiagChips] = useState<string[]>([]);
  const [diagText, setDiagText] = useState("");

  // T3 Mission
  const [stepCount, setStepCount] = useState<number | null>(null);
  const [stepReason, setStepReason] = useState("");

  // T4 Réparations
  const [activeRep, setActiveRep] = useState<Reparation | null>(null);
  const [compteRendu, setCompteRendu] = useState("");
  const [repOutcome, setRepOutcome] = useState<
    "REPARE" | "IRREPARABLE" | "PIECES_MANQUANTES"
  >("REPARE");

  const refresh = useCallback(async () => {
    const fresh = await getTechnicienBootstrapAction();
    setData(fresh as typeof initialData);
  }, []);

  useRealtimeRefresh(refresh, "velosf-tech-realtime", 4000);

  function showToastMsg(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  const syncOfflineQueue = useCallback(async () => {
    const raw = localStorage.getItem("velosf_tech_queue");
    if (!raw) return;
    let queue: Array<{ numSerie: string; bonEtat: boolean; diagnostic?: string }> =
      [];
    try {
      queue = JSON.parse(raw);
    } catch {
      localStorage.removeItem("velosf_tech_queue");
      setPendingQueue(0);
      return;
    }
    if (!Array.isArray(queue) || queue.length === 0) {
      setPendingQueue(0);
      return;
    }

    const remaining: typeof queue = [];
    let synced = 0;
    for (const item of queue) {
      try {
        const res = await enregistrerControleJournalierAction(item);
        if (res.ok) {
          synced += 1;
        } else {
          remaining.push(item);
        }
      } catch {
        remaining.push(item);
      }
    }

    if (remaining.length > 0) {
      localStorage.setItem("velosf_tech_queue", JSON.stringify(remaining));
    } else {
      localStorage.removeItem("velosf_tech_queue");
    }
    setPendingQueue(remaining.length);
    if (synced > 0) {
      showToastMsg(`${synced} contrôle(s) hors-ligne synchronisé(s).`);
      await refresh();
    }
  }, [refresh]);

  useEffect(() => {
    const updateNet = () => {
      const isOff = !navigator.onLine;
      setOffline(isOff);
      if (!isOff) {
        void syncOfflineQueue();
      }
    };
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
  }, [syncOfflineQueue]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const currentMission =
    data.ordresMission.find((o) => o.id_ordre === selectedOrdreId) ??
    activeMissions[0] ??
    data.ordresMission[0] ??
    null;

  const etapesMission = currentMission
    ? data.etapes.filter((e) => e.id_itineraire === currentMission.id_itineraire)
    : [];

  const currentEtape = etapesMission.find((e) => !e.effectuee) ?? null;

  const currentCamion = currentMission
    ? data.camions.find(
        (c) => c.immatriculation === currentMission.immatriculation_camion
      )
    : null;

  const bikesAboardList = currentMission
    ? data.velos.filter(
        (v) => v.immatriculation_camion === currentMission.immatriculation_camion
      )
    : [];
  const bikesInTruck = bikesAboardList.length;

  const activeBikesTotal = data.velos.filter((v) => v.etat !== "REFORME").length;
  const checkedCount = data.controlesAujourdhui.length;
  const plannedTodayReps = data.reparations.filter(
    (r) => r.statut !== "TERMINEE"
  );

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
    if (!currentMission || !currentEtape) return;
    const countToSend = stepCount ?? currentEtape.nb_velos;
    if (countToSend !== currentEtape.nb_velos && !stepReason.trim()) {
      showToastMsg("Précisez la raison de l'écart par rapport au plan.");
      return;
    }
    setBusy(true);
    const res = await executerEtapeMissionAction({
      idOrdre: currentMission.id_ordre,
      idEtape: currentEtape.id_etape,
      nbVelosReel: countToSend,
      motifEcart: stepReason,
    });
    setBusy(false);
    if (!res.ok) {
      showToastMsg(res.error ?? "Erreur");
      return;
    }
    setStepCount(null);
    setStepReason("");
    showToastMsg("Étape validée.");
    await refresh();
  }

  async function handlePickupBrokenBike(numSerie: string) {
    if (!currentMission) return;
    setBusy(true);
    const res = await recupererVeloEnPanneMissionAction({
      idOrdre: currentMission.id_ordre,
      numSerie,
    });
    setBusy(false);
    if (!res.ok) {
      showToastMsg(res.error ?? "Erreur");
      return;
    }
    showToastMsg(`Vélo en panne ${numSerie} chargé dans le camion.`);
    await refresh();
  }

  async function handleUnloadBrokenBike(numSerie: string) {
    if (!currentMission) return;
    setBusy(true);
    const res = await dechargerVeloAtelierAction({
      idOrdre: currentMission.id_ordre,
      numSerie,
    });
    setBusy(false);
    if (!res.ok) {
      showToastMsg(res.error ?? "Erreur");
      return;
    }
    showToastMsg(`Vélo ${numSerie} déchargé à l'atelier.`);
    await refresh();
  }

  async function handleCloturerMission() {
    if (!currentMission) return;
    setBusy(true);
    await cloturerMissionAction(currentMission.id_ordre);
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

  const navItems: { id: Tab; label: string; Icon: typeof CalendarCheck; badge?: number }[] = [
    { id: "T1", label: "Aujourd'hui", Icon: CalendarCheck },
    { id: "T2", label: "Contrôle journalier", Icon: ClipboardCheck },
    { id: "T3", label: "Mes missions", Icon: Truck, badge: activeMissions.length },
    { id: "T4", label: "Mes réparations", Icon: Wrench, badge: plannedTodayReps.length },
  ];

  return (
    <div className="flex min-h-screen bg-[#F6F1E7]">
      {/* Barre latérale Desktop */}
      <aside className="hidden w-64 shrink-0 flex-col border-r-[1.5px] border-[#14232B] bg-[#0E5A6B] text-[#FFFDF8] lg:flex">
        <div className="border-b border-[#9DB8BF]/30 px-5 py-4">
          <Link href="/" className="font-heading text-2xl font-bold">
            VéloSf
          </Link>
          <p className="font-mono-sfax text-xs text-[#9DB8BF]">
            ESPACE TECHNICIEN
          </p>
        </div>

        <nav className="flex-1 space-y-2 p-4">
          {navItems.map(({ id, label, Icon, badge }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex w-full items-center justify-between rounded-[6px] px-3.5 py-2.5 text-left text-base font-medium transition-colors ${
                  active
                    ? "bg-[#F0A42B] font-semibold text-[#14232B]"
                    : "text-[#FFFDF8]/90 hover:bg-[#14232B]/25"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{label}</span>
                </span>
                {typeof badge === "number" && badge > 0 && (
                  <span className="rounded-full border border-[#14232B] bg-[#FFFDF8] px-2 py-0.5 font-mono-sfax text-xs font-bold text-[#14232B]">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-[#9DB8BF]/30 p-4 text-xs text-[#9DB8BF]">
          <p className="font-semibold text-white">
            {data.session.prenom} {data.session.nom}
          </p>
          <p className="font-mono-sfax">
            Matricule #{data.session.matricule}
          </p>
          {data.session.specialite && (
            <p className="mt-1">{data.session.specialite}</p>
          )}
        </div>
      </aside>

      {/* Contenu principal Web */}
      <div className="flex min-w-0 flex-1 flex-col pb-20 lg:pb-0">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 border-b-[1.5px] border-[#14232B] bg-[#FFFDF8] px-6 py-3.5">
          <div>
            <p className="font-mono-sfax text-xs uppercase text-[#0E5A6B]">
              CycloSfaxcity · Technicien #{data.session.matricule}
            </p>
            <h1 className="text-xl font-bold">
              Bonjour {data.session.prenom} {data.session.nom}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 rounded-full border border-[#5E7B3A] bg-[#5E7B3A]/15 px-3 py-1 font-mono-sfax text-xs font-semibold text-[#3D5223] sm:inline-flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#5E7B3A]" />
              Temps réel
            </span>
            {pendingQueue > 0 && !offline && (
              <button
                type="button"
                onClick={() => void syncOfflineQueue()}
                className="rounded border border-[#14232B] bg-[#F0A42B] px-3 py-1.5 font-mono-sfax text-xs font-semibold text-[#14232B]"
              >
                Synchroniser ({pendingQueue})
              </button>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="btn-sfax-outline inline-flex items-center gap-1.5 px-3 py-1.5 text-sm"
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </button>
          </div>
        </header>

        {offline && (
          <div className="flex items-center justify-between border-b border-[#14232B] bg-[#F0A42B] px-6 py-2.5 text-sm font-semibold text-[#14232B]">
            <span className="flex items-center gap-2">
              <WifiOff className="h-4 w-4" />
              Hors connexion : vos actions seront envoyées au retour du réseau (
              {pendingQueue} en attente)
            </span>
          </div>
        )}

        {toast && (
          <div className="mx-6 mt-4 rounded-[6px] border-[1.5px] border-[#14232B] bg-[#5E7B3A] px-4 py-3 text-base font-semibold text-white">
            {toast}
          </div>
        )}

        <main className="bg-zellige flex-1 p-6">
          {/* T1 · AUJOURD'HUI */}
          {tab === "T1" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Vue d&apos;ensemble du jour</h2>
                <span className="font-mono-sfax text-sm font-semibold text-[#0E5A6B]">
                  {formatDate(new Date())}
                </span>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                {/* Carte Missions du jour (toutes les missions actives!) */}
                <div className="card-sfax flex flex-col justify-between p-6 md:col-span-2">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono-sfax text-xs font-bold uppercase text-[#0E5A6B]">
                        Missions assignées ({activeMissions.length})
                      </span>
                      <Truck className="h-5 w-5 text-[#0E5A6B]" />
                    </div>

                    {activeMissions.length === 0 ? (
                      <p className="mt-4 text-base text-[#14232B]/70">
                        Aucune mission de rééquilibrage active aujourd&apos;hui.
                      </p>
                    ) : (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {activeMissions.map((m) => {
                          const cam = data.camions.find(
                            (c) => c.immatriculation === m.immatriculation_camion
                          );
                          const mEtapes = data.etapes.filter(
                            (e) => e.id_itineraire === m.id_itineraire
                          );
                          return (
                            <div
                              key={m.id_ordre}
                              className="rounded-[6px] border-[1.5px] border-[#14232B] bg-[#F6F1E7] p-4"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono-sfax text-sm font-bold">
                                  Ordre #{m.id_ordre}
                                </span>
                                <span className="rounded border border-[#14232B] bg-[#FFFDF8] px-2 py-0.5 font-mono-sfax text-xs font-semibold">
                                  {m.statut}
                                </span>
                              </div>
                              <p className="mt-2 font-mono-sfax text-base font-bold text-[#0E5A6B]">
                                Camion : {m.immatriculation_camion}
                              </p>
                              <p className="text-sm text-[#14232B]/80">
                                {cam?.modele ?? "Utilitaire"} · Cap.{" "}
                                {cam?.capacite ?? 12} vélos · {mEtapes.length}{" "}
                                étape(s)
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedOrdreId(m.id_ordre);
                                  setTab("T3");
                                }}
                                className="btn-sfax-primary mt-3 w-full py-2 text-sm"
                              >
                                {m.statut === "EN_COURS"
                                  ? "Reprendre cette mission"
                                  : "Démarrer cette mission"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Colonne droite : Contrôle + Réparations */}
                <div className="space-y-6">
                  <div className="card-sfax p-5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono-sfax text-xs font-bold uppercase text-[#5E7B3A]">
                        Contrôle journalier
                      </span>
                      <ClipboardCheck className="h-5 w-5 text-[#5E7B3A]" />
                    </div>
                    <p className="mt-2 font-mono-sfax text-2xl font-bold">
                      {checkedCount} / {activeBikesTotal} vélos
                    </p>
                    <button
                      type="button"
                      onClick={() => setTab("T2")}
                      className="btn-sfax-mer mt-4 w-full py-2.5 text-sm"
                    >
                      Contrôler des vélos
                    </button>
                  </div>

                  <div className="card-sfax p-5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono-sfax text-xs font-bold uppercase text-[#B8740B]">
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
                      className="btn-sfax-outline mt-4 w-full py-2.5 text-sm"
                    >
                      Voir mes réparations
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* T2 · CONTRÔLE JOURNALIER */}
          {tab === "T2" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="card-sfax space-y-4 p-6">
                <h2 className="text-2xl font-bold">Contrôle journalier</h2>
                <label className="block text-sm font-semibold">
                  Scanner ou saisir le n° de série
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={scanSerial}
                    onChange={(e) => setScanSerial(e.target.value.toUpperCase())}
                    placeholder="VSF-XXXXXX"
                    className="flex-1 rounded-[6px] border-[1.5px] border-[#14232B] bg-[#F6F1E7] px-3.5 py-2.5 font-mono-sfax text-lg"
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
                    className="btn-sfax-primary px-5"
                  >
                    <Camera className="h-5 w-5" />
                  </button>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-[#0E5A6B]">
                    Sélection rapide dans le parc :
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {data.velos.slice(0, 12).map((v) => (
                      <button
                        key={v.num_serie}
                        type="button"
                        onClick={() => {
                          setScanSerial(v.num_serie);
                          setSelectedBike(v);
                          setShowFaultForm(false);
                        }}
                        className="rounded border border-[#14232B] bg-[#F6F1E7] px-2.5 py-1.5 font-mono-sfax text-xs font-semibold hover:bg-[#E3D9C6]"
                      >
                        {v.num_serie}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {selectedBike && (
                <div className="card-sfax space-y-4 p-6">
                  <div className="flex items-center justify-between">
                    <span className="font-mono-sfax text-2xl font-bold">
                      {selectedBike.num_serie}
                    </span>
                    <StatusChip etat={selectedBike.etat} size="md" />
                  </div>

                  {selectedBike.etat === "LOUE" ||
                  selectedBike.etat === "REFORME" ? (
                    <p className="rounded bg-[#C8553D]/15 p-4 text-base font-semibold text-[#9B3925]">
                      Contrôle impossible : ce vélo est actuellement{" "}
                      {selectedBike.etat}.
                    </p>
                  ) : !showFaultForm ? (
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => submitControle(true)}
                        className="min-h-[84px] rounded-[6px] border-[1.5px] border-[#14232B] bg-[#5E7B3A] text-lg font-bold text-white shadow-[3px_3px_0_#14232B]"
                      >
                        <CheckCircle2 className="mx-auto mb-1 h-6 w-6" />
                        Bon état
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowFaultForm(true)}
                        className="min-h-[84px] rounded-[6px] border-[1.5px] border-[#14232B] bg-[#C8553D] text-lg font-bold text-white shadow-[3px_3px_0_#14232B]"
                      >
                        <AlertTriangle className="mx-auto mb-1 h-6 w-6" />
                        En panne
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
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
                              className={`rounded-[6px] border border-[#14232B] px-3.5 py-2 text-sm font-semibold ${
                                active
                                  ? "bg-[#C8553D] text-white"
                                  : "bg-[#F6F1E7]"
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
                        className="w-full rounded-[6px] border-[1.5px] border-[#14232B] bg-[#F6F1E7] p-3 text-base"
                      />
                      <button
                        type="button"
                        disabled={
                          busy ||
                          (diagChips.length === 0 &&
                            diagText.trim().length < 3)
                        }
                        onClick={() => submitControle(false)}
                        className="btn-sfax-primary w-full py-3 text-base"
                      >
                        Envoyer la réclamation
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* T3 · EXÉCUTION DE LA MISSION (Multi-missions + Camion visible!) */}
          {tab === "T3" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-2xl font-bold">
                  Mes missions ({data.ordresMission.length})
                </h2>

                {data.ordresMission.length > 0 && (
                  <select
                    value={currentMission?.id_ordre ?? ""}
                    onChange={(e) => setSelectedOrdreId(Number(e.target.value))}
                    className="rounded-[6px] border-[1.5px] border-[#14232B] bg-[#FFFDF8] px-3.5 py-2 font-mono-sfax text-sm font-semibold"
                  >
                    {data.ordresMission.map((m) => (
                      <option key={m.id_ordre} value={m.id_ordre}>
                        Ordre #{m.id_ordre} · {formatDate(m.date_mission)} ·{" "}
                        {m.immatriculation_camion} [{m.statut}]
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {!currentMission ? (
                <div className="card-sfax p-8 text-center text-base">
                  Aucune mission assignée.
                </div>
              ) : (
                <div className="grid gap-6 lg:grid-cols-3">
                  {/* Panneau Camion & Infos Mission */}
                  <div className="card-sfax space-y-4 p-6">
                    <span className="font-mono-sfax text-xs font-bold uppercase text-[#0E5A6B]">
                      Véhicule &amp; Ordre #{currentMission.id_ordre}
                    </span>
                    <div className="rounded border-2 border-[#14232B] bg-[#14232B] px-4 py-2 text-center font-mono-sfax text-xl font-bold text-[#FFFDF8]">
                      {currentMission.immatriculation_camion}
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <p>
                        <strong>Modèle :</strong>{" "}
                        {currentCamion?.modele ?? "Utilitaire VéloSf"}
                      </p>
                      <p>
                        <strong>Chargement :</strong>{" "}
                        <span className="font-mono-sfax font-bold text-[#0E5A6B]">
                          {bikesInTruck} / {currentCamion?.capacite ?? 12} vélos
                        </span>
                      </p>
                      <p>
                        <strong>Date :</strong>{" "}
                        {formatDate(currentMission.date_mission)}
                      </p>
                      <p>
                        <strong>Statut :</strong>{" "}
                        <span className="font-mono-sfax font-bold">
                          {currentMission.statut}
                        </span>
                      </p>
                    </div>

                    {bikesAboardList.length > 0 && (
                      <div className="space-y-2 border-t border-dotted border-[#14232B] pt-3">
                        <p className="font-mono-sfax text-xs font-bold uppercase text-[#0E5A6B]">
                          Vélos à bord ({bikesAboardList.length})
                        </p>
                        <div className="space-y-1.5">
                          {bikesAboardList.map((b) => (
                            <div
                              key={b.num_serie}
                              className="flex items-center justify-between gap-2 rounded border border-[#E3D9C6] bg-[#F6F1E7] px-2.5 py-1.5 text-xs"
                            >
                              <span className="font-mono-sfax font-bold">
                                {b.num_serie}
                              </span>
                              <StatusChip etat={b.etat} size="sm" />
                              {(b.etat === "EN_PANNE" ||
                                b.etat === "EN_REPARATION") && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    void handleUnloadBrokenBike(b.num_serie)
                                  }
                                  className="rounded border border-[#14232B] bg-[#FFFDF8] px-2 py-0.5 font-semibold hover:bg-[#E3D9C6]"
                                >
                                  Décharger atelier
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Liste des étapes */}
                  <div className="space-y-4 lg:col-span-2">
                    {etapesMission.map((etape) => {
                      const st = data.stations.find(
                        (s) => s.id_station === etape.id_station
                      );
                      const isCurrent =
                        currentEtape?.id_etape === etape.id_etape &&
                        currentMission.statut !== "TERMINE";
                      const brokenAtStation = data.velos.filter(
                        (v) =>
                          v.id_station === etape.id_station &&
                          v.etat === "EN_PANNE"
                      );
                      const effectiveCount = stepCount ?? etape.nb_velos;
                      return (
                        <div
                          key={etape.id_etape}
                          className={`card-sfax p-5 ${
                            etape.effectuee ? "opacity-65" : ""
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono-sfax text-sm font-bold text-[#0E5A6B]">
                              ÉTAPE {etape.ordre} · {etape.action}
                            </span>
                            <span className="font-mono-sfax text-sm font-semibold">
                              {etape.effectuee
                                ? `Effectuée (${etape.nb_velos_reel} réel)`
                                : `${etape.nb_velos} vélo(s)`}
                            </span>
                          </div>
                          <p className="mt-1 text-xl font-bold">{st?.nom}</p>

                          {brokenAtStation.length > 0 &&
                            currentMission.statut !== "TERMINE" &&
                            currentMission.statut !== "ANNULE" && (
                              <div className="mt-3 rounded border border-[#C8553D] bg-[#C8553D]/10 p-3">
                                <p className="font-mono-sfax text-xs font-bold uppercase text-[#9B3925]">
                                  Vélos en panne à récupérer ({brokenAtStation.length})
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {brokenAtStation.map((b) => (
                                    <button
                                      key={b.num_serie}
                                      type="button"
                                      disabled={busy}
                                      onClick={() =>
                                        void handlePickupBrokenBike(b.num_serie)
                                      }
                                      className="inline-flex items-center gap-1.5 rounded border border-[#14232B] bg-[#FFFDF8] px-2.5 py-1 font-mono-sfax text-xs font-semibold hover:bg-[#F0A42B]/25"
                                    >
                                      <AlertTriangle className="h-3.5 w-3.5 text-[#C8553D]" />
                                      Récupérer {b.num_serie}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                          {isCurrent && (
                            <div className="mt-4 space-y-3 border-t border-dotted border-[#14232B] pt-4">
                              <div className="flex items-center justify-between">
                                <span className="text-base font-semibold">
                                  Quantité réelle :
                                </span>
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setStepCount((c) =>
                                        Math.max(
                                          0,
                                          (c ?? etape.nb_velos) - 1
                                        )
                                      )
                                    }
                                    className="btn-sfax-outline h-12 w-12 text-xl"
                                  >
                                    −
                                  </button>
                                  <span className="font-mono-sfax text-2xl font-bold">
                                    {effectiveCount}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setStepCount(
                                        (c) => (c ?? etape.nb_velos) + 1
                                      )
                                    }
                                    className="btn-sfax-outline h-12 w-12 text-xl"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>

                              {effectiveCount !== etape.nb_velos && (
                                <input
                                  type="text"
                                  value={stepReason}
                                  onChange={(e) =>
                                    setStepReason(e.target.value)
                                  }
                                  placeholder="Motif de l'écart (obligatoire)..."
                                  className="w-full rounded border border-[#14232B] bg-[#F6F1E7] px-3 py-2 text-sm"
                                />
                              )}

                              <button
                                type="button"
                                disabled={busy}
                                onClick={handleFinishEtape}
                                className="btn-sfax-primary w-full py-3 text-base"
                              >
                                Étape terminée
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {!currentEtape && currentMission.statut !== "TERMINE" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={handleCloturerMission}
                        className="btn-sfax-primary w-full py-3.5 text-lg"
                      >
                        Clôturer la mission #{currentMission.id_ordre}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* T4 · MES RÉPARATIONS */}
          {tab === "T4" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">
                Mes réparations ({data.reparations.length})
              </h2>
              {data.reparations.length === 0 ? (
                <div className="card-sfax p-8 text-center text-base">
                  Aucune réparation assignée.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {data.reparations.map((rep) => {
                    const rec = data.reclamations.find(
                      (r) => r.id_reclamation === rep.id_reclamation
                    );
                    const isEditing =
                      activeRep?.id_reparation === rep.id_reparation;
                    return (
                      <div
                        key={rep.id_reparation}
                        className="card-sfax space-y-3 p-5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono-sfax text-lg font-bold">
                            {rec?.num_serie ?? `Rép #${rep.id_reparation}`}
                          </span>
                          <span className="rounded border border-[#14232B] bg-[#F6F1E7] px-2.5 py-0.5 font-mono-sfax text-xs font-semibold">
                            {rep.statut}
                          </span>
                        </div>
                        <p className="text-base text-[#14232B]/80">
                          {rec?.diagnostic}
                        </p>
                        <p className="font-mono-sfax text-xs text-[#0E5A6B]">
                          Planifiée : {formatDate(rep.date_planifiee)}
                        </p>

                        {rep.statut === "PLANIFIEE" && (
                          <button
                            type="button"
                            onClick={async () => {
                              await demarrerReparationAction(rep.id_reparation);
                              await refresh();
                            }}
                            className="btn-sfax-mer w-full py-2.5 text-sm"
                          >
                            Démarrer la réparation
                          </button>
                        )}

                        {rep.statut === "EN_COURS" && !isEditing && (
                          <button
                            type="button"
                            onClick={() => setActiveRep(rep)}
                            className="btn-sfax-primary w-full py-2.5 text-sm"
                          >
                            Clôturer
                          </button>
                        )}

                        {isEditing && (
                          <div className="space-y-3 border-t border-dotted border-[#14232B] pt-3">
                            <div className="flex flex-wrap gap-1.5">
                              {REPAIR_TEMPLATES.map((tpl) => (
                                <button
                                  key={tpl}
                                  type="button"
                                  onClick={() => setCompteRendu(tpl)}
                                  className="rounded border border-[#14232B] bg-[#F6F1E7] px-2.5 py-1 text-left text-xs"
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
                              className="btn-sfax-primary w-full py-2.5 text-base"
                            >
                              Valider la clôture
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Barre inférieure uniquement sur petit écran (< lg) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t-[1.5px] border-[#14232B] bg-[#FFFDF8] lg:hidden">
        {navItems.map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex min-h-[60px] flex-col items-center justify-center gap-1 text-xs font-semibold ${
                active
                  ? "bg-[#F0A42B] text-[#14232B]"
                  : "text-[#14232B]/70 hover:bg-[#F6F1E7]"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="truncate px-1">{label.split(" ")[0]}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
