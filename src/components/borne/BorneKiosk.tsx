"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import {
  CreditCard,
  Bike,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowLeft,
  QrCode,
  Shuffle,
  Wrench,
  Printer,
} from "lucide-react";
import type { Station, TypeVelo } from "@/lib/supabase/types";
import { SlotTicks } from "@/components/ui/SlotTicks";
import {
  formatDT,
  formatDate,
  formatDurationMinutes,
  formatElapsedSince,
  formatTunisianPhoneInput,
  calcOccasionnelAmounts,
  maskIdentity,
} from "@/lib/format";
import {
  getBorneBootstrapAction,
  verifierCarteAbonneAction,
  verifierCodeSecretAction,
  demarrerLocationAbonneAction,
  signalerVeloMauvaisEtatBorneAction,
  verifierCinOccasionnelAction,
  demarrerLocationOccasionnelAction,
  restituerVeloAction,
} from "@/app/actions/borne";

type Screen =
  | "K1"
  | "K2"
  | "K3"
  | "K4"
  | "K5"
  | "K6"
  | "K7"
  | "K8"
  | "K9"
  | "K10"
  | "K11";

interface BikeItem {
  num_serie: string;
  couleur: string;
  couleur_hex: string;
  date_acquisition: string;
  emplacement_dock: number | null;
  id_type: number;
  types_velo?: { libelle?: string } | null;
}

const FAULT_CHIPS = [
  "Freins",
  "Pneu",
  "Chaîne",
  "Selle",
  "Éclairage",
  "Autre",
];

export function BorneKiosk({
  initialStations,
  initialTypes,
  initialStation,
  initialBikes,
}: {
  initialStations: Station[];
  initialTypes: TypeVelo[];
  initialStation: Station | null;
  initialBikes: BikeItem[];
}) {
  const [stations, setStations] = useState<Station[]>(initialStations);
  const [types] = useState<TypeVelo[]>(initialTypes);
  const [activeStation, setActiveStation] = useState<Station | null>(
    initialStation
  );
  const [bikes, setBikes] = useState<BikeItem[]>(initialBikes);
  const [screen, setScreen] = useState<Screen>("K1");
  const [nowStr, setNowStr] = useState<string>("");
  const [inactivitySec, setInactivitySec] = useState(60);

  const isLecteurPanne = Boolean(activeStation?.lecteur_en_panne);
  const isHorsService = Boolean(activeStation?.borne_hors_service);

  // K2 & K3 Abonné state
  const [cardInput, setCardInput] = useState("");
  const [cardError, setCardError] = useState<string | null>(null);
  const [abonneNumCarte, setAbonneNumCarte] = useState<number | null>(null);
  const [abonnePrenom, setAbonnePrenom] = useState<string>("");
  const [pin, setPin] = useState("");
  const [pinAttempts, setPinAttempts] = useState(3);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinShake, setPinShake] = useState(false);
  const [randomKeypad, setRandomKeypad] = useState(false);
  const [activeRentalK4, setActiveRentalK4] = useState<{
    num_serie: string;
    date_heure_debut: string;
    stations?: { nom?: string } | null;
  } | null>(null);

  // K5 & K6 Bike selection & unlock
  const [typeFilter, setTypeFilter] = useState<number | "ALL">("ALL");
  const [hiddenFaultySerials, setHiddenFaultySerials] = useState<string[]>([]);
  const [confirmBike, setConfirmBike] = useState<BikeItem | null>(null);
  const [unlockedBike, setUnlockedBike] = useState<{
    numSerie: string;
    dock: number;
  } | null>(null);
  const [unlockCountdown, setUnlockCountdown] = useState(30);
  const [unlockDone, setUnlockDone] = useState(false);
  const [showFaultModal, setShowFaultModal] = useState(false);
  const [selectedFaults, setSelectedFaults] = useState<string[]>([]);

  // K7 & K11 Return
  const [returnSerial, setReturnSerial] = useState("");
  const [returnCardNum, setReturnCardNum] = useState("");
  const [returnDamaged, setReturnDamaged] = useState(false);
  const [returnResult, setReturnResult] = useState<{
    ok: boolean;
    error?: string;
    stationPleine?: boolean;
    alternatives?: Station[];
    elapsedMin?: number;
    stationDepartNom?: string;
    stationArriveeNom?: string;
    differentStationWarning?: boolean;
    garantieVersee?: number;
    retenue?: number;
    montantRembourse?: number;
    depassementMin?: number;
  } | null>(null);

  // K8, K9, K10 Occasionnel
  const [occNom, setOccNom] = useState("");
  const [occPrenom, setOccPrenom] = useState("");
  const [occCin, setOccCin] = useState("");
  const [occTel, setOccTel] = useState("+216 ");
  const [occDestId, setOccDestId] = useState<number>(0);
  const [occDuree, setOccDuree] = useState(60);
  const [occKnownBanner, setOccKnownBanner] = useState<string | null>(null);
  const [occCinBlocked, setOccCinBlocked] = useState<string | null>(null);
  const [occPaymentMethod, setOccPaymentMethod] = useState<
    "CARTE_BANCAIRE" | "E_DINAR"
  >("CARTE_BANCAIRE");
  const [occPaying, setOccPaying] = useState(false);
  const [occPayError, setOccPayError] = useState<string | null>(null);
  const [occCarteDelivree, setOccCarteDelivree] = useState<{
    numCarte: number;
    referencePaiement: string;
    numSerie: string;
    dock: number;
    frais: number;
    garantie: number;
  } | null>(null);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [rentalFlow, setRentalFlow] = useState<"ABONNE" | "OCCASIONNEL">("ABONNE");

  const [busy, setBusy] = useState(false);

  const resetToHome = useCallback(async () => {
    setScreen("K1");
    setCardInput("");
    setCardError(null);
    setAbonneNumCarte(null);
    setAbonnePrenom("");
    setPin("");
    setPinAttempts(3);
    setPinError(null);
    setActiveRentalK4(null);
    setConfirmBike(null);
    setUnlockedBike(null);
    setUnlockDone(false);
    setShowFaultModal(false);
    setSelectedFaults([]);
    setReturnSerial("");
    setReturnCardNum("");
    setReturnDamaged(false);
    setReturnResult(null);
    setOccNom("");
    setOccPrenom("");
    setOccCin("");
    setOccTel("+216 ");
    setOccKnownBanner(null);
    setOccCinBlocked(null);
    setOccPayError(null);
    setOccCarteDelivree(null);
    setRentalFlow("ABONNE");
    setTypeFilter("ALL");
    setInactivitySec(60);

    if (activeStation) {
      const fresh = await getBorneBootstrapAction(activeStation.id_station);
      if (fresh.stations) setStations(fresh.stations);
      if (fresh.activeStation) setActiveStation(fresh.activeStation);
      if (fresh.bikes) setBikes(fresh.bikes as unknown as BikeItem[]);
    }
  }, [activeStation]);

  // Live clock 24h
  useEffect(() => {
    const updateClock = () => {
      const d = new Date();
      setNowStr(
        `${String(d.getHours()).padStart(2, "0")}:${String(
          d.getMinutes()
        ).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`
      );
    };
    updateClock();
    const id = setInterval(updateClock, 1000);
    return () => clearInterval(id);
  }, []);

  // 60-second inactivity timer on screens != K1
  useEffect(() => {
    if (screen === "K1") return;
    const t = setInterval(() => {
      setInactivitySec((s) => {
        if (s <= 1) {
          void resetToHome();
          return 60;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [screen, resetToHome]);

  // 30-second unlock countdown on K6
  useEffect(() => {
    if (screen !== "K6" || unlockDone || showFaultModal) return;
    const t = setInterval(() => {
      setUnlockCountdown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [screen, unlockDone, showFaultModal]);

  const touchActivity = () => setInactivitySec(60);

  const syncBorne = useCallback(async () => {
    if (screen !== "K1" || !activeStation) return;
    const fresh = await getBorneBootstrapAction(activeStation.id_station);
    if (fresh.stations) setStations(fresh.stations);
    if (fresh.activeStation) setActiveStation(fresh.activeStation);
    if (fresh.bikes) setBikes(fresh.bikes as unknown as BikeItem[]);
  }, [screen, activeStation]);

  useRealtimeRefresh(syncBorne, "velosf-borne-realtime", 5000);

  async function switchStation(idStation: number) {
    const res = await getBorneBootstrapAction(idStation);
    if (res.stations) setStations(res.stations);
    if (res.activeStation) setActiveStation(res.activeStation);
    if (res.bikes) setBikes(res.bikes as unknown as BikeItem[]);
    setHiddenFaultySerials([]);
    setScreen("K1");
  }

  async function handleCheckCard(rawNum?: string) {
    const val = rawNum ?? cardInput;
    setBusy(true);
    setCardError(null);
    const res = await verifierCarteAbonneAction(val);
    setBusy(false);

    if (res.status === "VALIDE") {
      setAbonneNumCarte(res.numCarte);
      setAbonnePrenom(res.prenom);
      setPinAttempts(res.tentativesRestantes);
      setPin("");
      setPinError(null);
      setScreen("K3");
    } else {
      setCardError(res.message);
    }
  }

  async function handleValidatePin(codeToTest?: string) {
    const code = codeToTest ?? pin;
    if (!abonneNumCarte || code.length !== 4) return;
    setBusy(true);
    const res = await verifierCodeSecretAction(abonneNumCarte, code);
    setBusy(false);

    if (!res.ok) {
      setPinShake(true);
      setTimeout(() => setPinShake(false), 400);
      setPin("");
      if (res.bloquee) {
        setPinAttempts(0);
        setPinError("Carte bloquée après 3 tentatives erronées.");
      } else {
        setPinAttempts(res.tentativesRestantes ?? 0);
        setPinError(res.error ?? "Code erroné");
      }
      return;
    }

    if (res.dejaEnCours && res.activeLocation) {
      setActiveRentalK4(
        res.activeLocation as {
          num_serie: string;
          date_heure_debut: string;
          stations?: { nom?: string } | null;
        }
      );
      setScreen("K4");
    } else {
      setScreen("K5");
    }
  }

  async function handleConfirmBikeAbonne(bike: BikeItem) {
    if (!abonneNumCarte || !activeStation) return;
    setBusy(true);
    const res = await demarrerLocationAbonneAction(
      abonneNumCarte,
      bike.num_serie,
      activeStation.id_station
    );
    setBusy(false);
    if (!res.ok) {
      setCardError(res.error ?? "Erreur lors du déblocage.");
      return;
    }
    setConfirmBike(null);
    setUnlockedBike({ numSerie: bike.num_serie, dock: res.emplacement ?? 1 });
    setUnlockCountdown(30);
    setUnlockDone(false);
    setScreen("K6");
  }

  async function handleReportFaultyBike() {
    if (!unlockedBike || !activeStation) return;
    setBusy(true);
    await signalerVeloMauvaisEtatBorneAction(
      unlockedBike.numSerie,
      selectedFaults,
      activeStation.id_station
    );
    setBusy(false);
    setShowFaultModal(false);
    setHiddenFaultySerials((prev) => [...prev, unlockedBike.numSerie]);
    setSelectedFaults([]);
    setUnlockedBike(null);
    setScreen("K5");
  }

  async function handleCinChange(val: string) {
    const clean = val.replace(/\D/g, "").slice(0, 8);
    setOccCin(clean);
    setOccKnownBanner(null);
    setOccCinBlocked(null);
    if (clean.length === 8) {
      const res = await verifierCinOccasionnelAction(clean);
      if (res.blocked) {
        setOccCinBlocked(res.message ?? "CIN bloqué pour location.");
      } else if (res.known && res.user) {
        setOccNom(res.user.nom);
        setOccPrenom(res.user.prenom);
        setOccTel(res.user.tel);
        setOccKnownBanner(`Bon retour ${res.user.prenom}`);
      }
    }
  }

  async function handlePayOccasionnel() {
    if (!activeStation) return;
    const availableBike = bikes.find(
      (b) => !hiddenFaultySerials.includes(b.num_serie)
    );
    if (!availableBike) {
      setOccPayError("Aucun vélo disponible. Aucun montant débité.");
      return;
    }
    setOccPaying(true);
    setOccPayError(null);
    setCardError(null);
    setConfirmBike(null);
    setRentalFlow("OCCASIONNEL");
    setOccPaying(false);
    setScreen("K5");
  }

  async function handleConfirmBikeOccasionnel(bike: BikeItem) {
    if (!activeStation) return;
    setBusy(true);
    setCardError(null);
    const res = await demarrerLocationOccasionnelAction({
      nom: occNom,
      prenom: occPrenom,
      cin: occCin,
      tel: occTel,
      idStationDepart: activeStation.id_station,
      idStationDest:
        occDestId ||
        stations.find((s) => s.id_station !== activeStation.id_station)
          ?.id_station ||
        activeStation.id_station,
      dureeMinutes: occDuree,
      modePaiement: occPaymentMethod,
      numSerie: bike.num_serie,
    });
    setBusy(false);

    if (!res.ok) {
      setCardError(res.error ?? "Erreur lors de la création de la carte.");
      return;
    }

    setConfirmBike(null);
    setOccCarteDelivree({
      numCarte: res.numCarte!,
      referencePaiement: res.referencePaiement!,
      numSerie: bike.num_serie,
      dock: res.emplacement ?? 1,
      frais: res.frais ?? 0,
      garantie: res.garantie ?? 30,
    });
    setScreen("K10");
  }

  async function handleRestituer(isOccasionnel: boolean) {
    if (!activeStation || !returnSerial.trim()) return;
    setBusy(true);
    const res = await restituerVeloAction({
      numSerie: returnSerial.trim(),
      idStationArrivee: activeStation.id_station,
      mauvaisEtat: returnDamaged,
      numCarteCourteDuree:
        isOccasionnel && returnCardNum
          ? Number.parseInt(returnCardNum, 10)
          : undefined,
    });
    setBusy(false);
    setReturnResult(res);
  }

  const visibleBikes = bikes.filter(
    (b) =>
      !hiddenFaultySerials.includes(b.num_serie) &&
      (typeFilter === "ALL" || b.id_type === typeFilter)
  );

  const nearestWithBikes = stations
    .filter(
      (s) =>
        s.id_station !== activeStation?.id_station && s.nb_velos_actuel > 0
    )
    .slice(0, 3);

  const nearestWithSlots = stations
    .filter(
      (s) =>
        s.id_station !== activeStation?.id_station &&
        s.nb_velos_actuel < s.capacite
    )
    .slice(0, 3);

  const isStationVide = (activeStation?.nb_velos_actuel ?? 0) === 0;
  const isStationPleine =
    activeStation !== null &&
    activeStation.nb_velos_actuel >= activeStation.capacite;

  const keypadDigits = randomKeypad
    ? ["7", "2", "9", "4", "0", "6", "1", "8", "3", "5"]
    : ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

  const occAmounts = calcOccasionnelAmounts(occDuree);

  return (
    <div
      onClick={touchActivity}
      className="bg-zellige flex min-h-screen flex-col justify-between p-4 md:p-6"
    >
      {/* Barre supérieure de la borne */}
      <header className="card-sfax-flat flex flex-wrap items-center justify-between gap-4 px-5 py-3">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="rounded border border-[#14232B] bg-[#F6F1E7] px-2.5 py-1.5 text-xs font-semibold hover:bg-[#E3D9C6]"
          >
            <ArrowLeft className="inline h-3.5 w-3.5 mr-1" />
            Hub
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono-sfax rounded bg-[#0E5A6B] px-2 py-0.5 text-xs font-semibold text-white">
                BORNE VÉLOSF
              </span>
              {stations.length > 0 && (
                <select
                  aria-label="Choisir une station"
                  value={activeStation?.id_station ?? ""}
                  onChange={(e) => switchStation(Number(e.target.value))}
                  className="rounded border border-[#14232B] bg-[#F6F1E7] px-2 py-1 font-heading text-base font-semibold"
                >
                  {stations.map((s) => (
                    <option key={s.id_station} value={s.id_station}>
                      {s.nom}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <p className="mt-0.5 text-sm text-[#14232B]/75">
              {activeStation?.adresse ?? "Aucune station configurée"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-[6px] border-[1.5px] border-[#14232B] bg-[#F6F1E7] px-3 py-1.5 font-mono-sfax text-lg font-semibold">
            {nowStr || "00:00:00"}
          </div>
        </div>
      </header>

      {/* Ligne de route compte à rebours 60s d'inactivité */}
      {screen !== "K1" && (
        <div className="mx-auto my-2 w-full max-w-6xl">
          <div className="flex items-center justify-between text-xs font-mono-sfax text-[#0E5A6B]">
            <span>Session active — retour accueil dans {inactivitySec} s</span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full border border-[#14232B] bg-[#E3D9C6]">
            <div
              className="h-full bg-[#F0A42B] transition-all duration-1000"
              style={{ width: `${(inactivitySec / 60) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Corps principal */}
      <main className="mx-auto my-4 w-full max-w-6xl flex-1">
        {!activeStation ? (
          <div className="card-sfax mx-auto max-w-2xl p-10 text-center">
            <Bike className="mx-auto h-14 w-14 text-[#0E5A6B]" />
            <h2 className="mt-4 text-3xl font-bold">
              Aucune station configurée
            </h2>
            <p className="mt-2 text-base text-[#14232B]/75">
              Ajoutez au moins une station depuis le back-office Responsable
              pour activer la borne.
            </p>
            <Link
              href="/admin"
              className="btn-sfax-primary mt-6 inline-flex min-h-[56px] items-center px-6 text-base"
            >
              Accéder au back-office
            </Link>
          </div>
        ) : (
        <>
        {/* K1 : ACCUEIL DE LA STATION */}
        {screen === "K1" && (
          <div className="space-y-4">
            {isHorsService ? (
              <div className="card-sfax border-[#C8553D] bg-[#C8553D]/10 p-10 text-center">
                <Wrench className="mx-auto h-14 w-14 text-[#C8553D]" />
                <h2 className="mt-4 text-3xl font-bold">
                  Borne temporairement hors service pour maintenance
                </h2>
                <p className="mt-2 text-lg text-[#14232B]/80">
                  Veuillez vous diriger vers l&apos;une des stations voisines :
                </p>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {nearestWithBikes.map((s, idx) => (
                    <div key={s.id_station} className="card-sfax-flat p-4 text-left">
                      <p className="font-heading text-lg font-semibold">{s.nom}</p>
                      <p className="font-mono-sfax text-sm text-[#0E5A6B]">
                        {(idx + 1) * 350} m · {(idx + 1) * 4} min à pied ·{" "}
                        {s.nb_velos_actuel} vélos
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {isStationVide && (
                  <div className="card-sfax-flat border-[#C8553D] bg-[#C8553D]/12 p-4">
                    <p className="font-heading text-lg font-semibold text-[#9B3925]">
                      Station vide — aucun vélo disponible ici
                    </p>
                    <p className="mt-1 text-sm">
                      Stations les plus proches avec vélos :{" "}
                      {nearestWithBikes
                        .map(
                          (s, i) =>
                            `${s.nom} (${(i + 1) * 320} m, ${(i + 1) * 4} min, ${s.nb_velos_actuel} vélos)`
                        )
                        .join(" · ")}
                    </p>
                  </div>
                )}

                {isStationPleine && (
                  <div className="card-sfax-flat border-[#B8740B] bg-[#F0A42B]/20 p-4">
                    <p className="font-heading text-lg font-semibold text-[#7A4B00]">
                      Station pleine — restitution à la station la plus proche
                    </p>
                    <p className="mt-1 text-sm">
                      Places libres à proximité :{" "}
                      {nearestWithSlots
                        .map(
                          (s, i) =>
                            `${s.nom} (${(i + 1) * 350} m, ${s.capacite - s.nb_velos_actuel} places)`
                        )
                        .join(" · ")}
                    </p>
                  </div>
                )}

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Centre gauche : jauge slot-ticks */}
                  <div className="card-sfax flex flex-col justify-between p-8">
                    <div>
                      <span className="font-mono-sfax text-xs uppercase tracking-wider text-[#0E5A6B]">
                        État de la station
                      </span>
                      <h2 className="mt-2 text-3xl font-bold">
                        {activeStation?.nb_velos_actuel ?? 0} vélos disponibles
                      </h2>
                      <p className="mt-1 text-xl text-[#14232B]/75">
                        {(activeStation?.capacite ?? 0) -
                          (activeStation?.nb_velos_actuel ?? 0)}{" "}
                        places libres sur {activeStation?.capacite ?? 0}
                      </p>
                    </div>

                    <div className="my-8">
                      <SlotTicks
                        occupied={activeStation?.nb_velos_actuel ?? 0}
                        capacity={activeStation?.capacite ?? 1}
                        size="lg"
                        showText={false}
                      />
                    </div>

                    <p className="text-sm text-[#14232B]/70">
                      Assistance CycloSfaxcity :{" "}
                      <span className="font-mono-sfax font-semibold">
                        +216 74 000 111
                      </span>
                    </p>
                  </div>

                  {/* Centre droit : 3 gros boutons tactiles >= 64px */}
                  <div className="flex flex-col justify-center gap-4">
                    {isLecteurPanne ? (
                      <div className="card-sfax-flat border-[#C8553D] bg-[#C8553D]/10 p-5 text-base">
                        <strong>Lecteur optique en panne :</strong> la lecture
                        de carte d&apos;adhésion est temporairement indisponible.
                        La location occasionnelle reste active.
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isStationVide}
                        onClick={() => {
                          setRentalFlow("ABONNE");
                          setScreen("K2");
                        }}
                        className="btn-sfax-primary flex min-h-[84px] items-center justify-between px-7 text-left text-2xl font-bold"
                      >
                        <span className="flex items-center gap-4">
                          <CreditCard className="h-8 w-8" />
                          Je suis abonné
                        </span>
                        <span className="font-mono-sfax text-sm font-normal">
                          Carte d&apos;adhésion →
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isStationVide}
                      onClick={() => {
                        setRentalFlow("OCCASIONNEL");
                        setScreen("K8");
                      }}
                      className="btn-sfax-mer flex min-h-[84px] items-center justify-between px-7 text-left text-2xl font-bold disabled:opacity-50"
                    >
                      <span className="flex items-center gap-4">
                        <Bike className="h-8 w-8" />
                        Location occasionnelle
                      </span>
                      <span className="font-mono-sfax text-sm font-normal">
                        Carte courte durée →
                      </span>
                    </button>

                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setReturnResult(null);
                          setScreen("K7");
                        }}
                        className="btn-sfax-outline flex min-h-[76px] items-center justify-center gap-3 px-4 text-lg"
                      >
                        <RotateCcw className="h-6 w-6 text-[#0E5A6B]" />
                        <span>Restituer (Abonné)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReturnResult(null);
                          setScreen("K11");
                        }}
                        className="btn-sfax-outline flex min-h-[76px] items-center justify-center gap-3 px-4 text-lg"
                      >
                        <RotateCcw className="h-6 w-6 text-[#F0A42B]" />
                        <span>Retour (Occasionnel)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* K2 : LECTURE DE LA CARTE D'ADHÉSION */}
        {screen === "K2" && (
          <div className="card-sfax mx-auto max-w-2xl p-8 text-center">
            <div className="mx-auto flex h-28 w-28 animate-pulse items-center justify-center rounded-full border-4 border-[#F0A42B] bg-[#0E5A6B]/10">
              <CreditCard className="h-12 w-12 text-[#0E5A6B]" />
            </div>
            <h2 className="mt-6 text-3xl font-bold">
              Passez votre carte devant le lecteur
            </h2>
            <p className="mt-2 text-lg text-[#14232B]/75">
              Ou saisissez votre numéro de carte d&apos;adhésion.
            </p>

            {cardError && (
              <div className="mt-5 rounded-[6px] border-[1.5px] border-[#C8553D] bg-[#C8553D]/12 p-4 text-left text-base text-[#9B3925]">
                <AlertTriangle className="mr-2 inline h-5 w-5" />
                {cardError}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <input
                type="text"
                inputMode="numeric"
                value={cardInput}
                onChange={(e) => setCardInput(e.target.value)}
                placeholder="N° de carte"
                className="flex-1 rounded-[6px] border-[1.5px] border-[#14232B] bg-[#F6F1E7] px-4 py-4 font-mono-sfax text-2xl"
              />
              <button
                type="button"
                disabled={busy || !cardInput.trim()}
                onClick={() => handleCheckCard()}
                className="btn-sfax-primary min-h-[64px] px-7 text-xl"
              >
                {busy ? "Lecture..." : "Lire"}
              </button>
            </div>
          </div>
        )}

        {/* K3 : SAISIE DU CODE SECRET */}
        {screen === "K3" && (
          <div className="card-sfax mx-auto grid max-w-4xl gap-8 p-8 md:grid-cols-2">
            <div className="flex flex-col justify-between">
              <div>
                <span className="font-mono-sfax text-sm text-[#0E5A6B]">
                  CARTE #{abonneNumCarte}
                </span>
                <h2 className="mt-2 text-3xl font-bold">
                  Bonjour {abonnePrenom}
                </h2>
                <p className="mt-2 text-lg text-[#14232B]/75">
                  Composez votre code secret à 4 chiffres.
                </p>

                <div
                  className={`mt-6 flex gap-4 ${
                    pinShake ? "animate-shake" : ""
                  }`}
                >
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`flex h-16 w-16 items-center justify-center rounded-[6px] border-[1.5px] border-[#14232B] text-3xl font-bold ${
                        i < pin.length ? "bg-[#0E5A6B] text-white" : "bg-[#F6F1E7]"
                      }`}
                    >
                      {i < pin.length ? "•" : ""}
                    </div>
                  ))}
                </div>

                {/* 3 points d'essais restants */}
                <div className="mt-6 flex items-center gap-3">
                  <span className="text-sm font-medium">
                    Tentatives restantes : {pinAttempts}
                  </span>
                  <div className="flex gap-2">
                    {[1, 2, 3].map((dot) => (
                      <span
                        key={dot}
                        className={`h-3.5 w-3.5 rounded-full border border-[#14232B] ${
                          dot <= pinAttempts ? "bg-[#5E7B3A]" : "bg-[#E3D9C6]"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {pinError && (
                  <p
                    className={`mt-4 rounded-[6px] border-[1.5px] p-3 text-base font-semibold ${
                      pinAttempts <= 1
                        ? "border-[#C8553D] bg-[#C8553D]/15 text-[#9B3925]"
                        : "border-[#B8740B] bg-[#F0A42B]/20 text-[#7A4B00]"
                    }`}
                  >
                    {pinAttempts === 1
                      ? "Dernière tentative avant blocage de la carte !"
                      : pinError}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setRandomKeypad((v) => !v)}
                className="mt-4 inline-flex items-center gap-2 self-start text-sm font-medium text-[#0E5A6B] underline"
              >
                <Shuffle className="h-4 w-4" />
                {randomKeypad
                  ? "Clavier standard"
                  : "Mélanger le clavier (anti-regard)"}
              </button>
            </div>

            {/* Pavé numérique 80px */}
            <div className="grid grid-cols-3 gap-3">
              {keypadDigits.slice(0, 9).map((d) => (
                <button
                  key={d}
                  type="button"
                  disabled={pinAttempts === 0 || pin.length >= 4}
                  onClick={() => {
                    const next = pin + d;
                    setPin(next);
                  }}
                  className="btn-sfax-outline h-20 font-mono-sfax text-3xl font-bold"
                >
                  {d}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPin((p) => p.slice(0, -1))}
                className="btn-sfax-outline h-20 text-lg"
              >
                Effacer
              </button>
              <button
                type="button"
                disabled={pinAttempts === 0 || pin.length >= 4}
                onClick={() => setPin((p) => p + keypadDigits[9])}
                className="btn-sfax-outline h-20 font-mono-sfax text-3xl font-bold"
              >
                {keypadDigits[9]}
              </button>
              <button
                type="button"
                disabled={pin.length !== 4 || busy || pinAttempts === 0}
                onClick={() => handleValidatePin()}
                className="btn-sfax-primary h-20 text-lg"
              >
                Valider
              </button>
            </div>
          </div>
        )}

        {/* K4 : LOCATION DÉJÀ EN COURS */}
        {screen === "K4" && activeRentalK4 && (
          <div className="card-sfax mx-auto max-w-2xl p-8">
            <h2 className="text-3xl font-bold">
              Vous avez déjà un vélo en location
            </h2>
            <p className="mt-2 text-lg text-[#14232B]/75">
              Un seul vélo peut être loué à la fois par carte d&apos;adhésion.
            </p>
            <div className="card-sfax-flat mt-6 bg-[#F6F1E7] p-5">
              <p className="font-mono-sfax text-2xl font-bold text-[#0E5A6B]">
                {activeRentalK4.num_serie}
              </p>
              <p className="mt-2 text-base">
                Départ :{" "}
                <strong>
                  {activeRentalK4.stations?.nom ?? "Station"}
                </strong>{" "}
                · Durée écoulée :{" "}
                <span className="font-mono-sfax font-semibold">
                  {formatElapsedSince(activeRentalK4.date_heure_debut)}
                </span>
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-4">
              <button
                type="button"
                onClick={() => {
                  setReturnSerial(activeRentalK4.num_serie);
                  setScreen("K7");
                }}
                className="btn-sfax-primary min-h-[64px] flex-1 px-6 text-xl"
              >
                Restituer ce vélo ici
              </button>
              <button
                type="button"
                onClick={resetToHome}
                className="btn-sfax-outline min-h-[64px] px-6 text-xl"
              >
                Retour à l&apos;accueil
              </button>
            </div>
          </div>
        )}

        {/* K5 : CHOIX DU VÉLO */}
        {screen === "K5" && (
          <div className="space-y-4">
            {cardError && (
              <div className="rounded-[6px] border-[1.5px] border-[#C8553D] bg-[#C8553D]/12 p-4 text-base text-[#9B3925]">
                <AlertTriangle className="mr-2 inline h-5 w-5" />
                {cardError}
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-3xl font-bold">Choisissez votre vélo</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTypeFilter("ALL")}
                  className={`min-h-[48px] rounded-[6px] border-[1.5px] border-[#14232B] px-4 font-semibold ${
                    typeFilter === "ALL"
                      ? "bg-[#0E5A6B] text-white"
                      : "bg-[#FFFDF8]"
                  }`}
                >
                  Tous ({bikes.length - hiddenFaultySerials.length})
                </button>
                {types.map((t) => {
                  const count = bikes.filter(
                    (b) =>
                      !hiddenFaultySerials.includes(b.num_serie) &&
                      b.id_type === t.id_type
                  ).length;
                  return (
                    <button
                      key={t.id_type}
                      type="button"
                      onClick={() => setTypeFilter(t.id_type)}
                      className={`min-h-[48px] rounded-[6px] border-[1.5px] border-[#14232B] px-4 font-semibold ${
                        typeFilter === t.id_type
                          ? "bg-[#0E5A6B] text-white"
                          : "bg-[#FFFDF8]"
                      }`}
                    >
                      {t.libelle} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {visibleBikes.length === 0 ? (
              <div className="card-sfax p-8 text-center">
                <p className="text-2xl font-bold">
                  Aucun vélo disponible pour ce filtre
                </p>
                <button
                  type="button"
                  onClick={() => setTypeFilter("ALL")}
                  className="btn-sfax-primary mt-4 min-h-[56px] px-6 text-lg"
                >
                  Voir tous les types
                </button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                {visibleBikes.map((b) => (
                  <button
                    key={b.num_serie}
                    type="button"
                    onClick={() => setConfirmBike(b)}
                    className="card-sfax p-5 text-left transition-transform hover:-translate-y-0.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono-sfax text-xl font-bold text-[#14232B]">
                        {b.num_serie}
                      </span>
                      <span className="rounded border border-[#14232B] bg-[#F6F1E7] px-2.5 py-0.5 text-xs font-semibold">
                        {b.types_velo?.libelle ?? "Vélo"}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <span
                        className="h-4 w-4 rounded-full border border-[#14232B]"
                        style={{ backgroundColor: b.couleur_hex }}
                      />
                      <span>{b.couleur}</span>
                      <span className="ml-auto font-mono-sfax text-xs text-[#0E5A6B]">
                        Quai {String(b.emplacement_dock ?? 1).padStart(2, "0")}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-[#14232B]/70">
                      En service depuis {formatDate(b.date_acquisition)}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {confirmBike && (
              <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-[#14232B] bg-[#FFFDF8] p-6 shadow-2xl">
                <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xl font-bold">
                      Confirmer le vélo {confirmBike.num_serie} ?
                    </p>
                    <p className="text-sm text-[#14232B]/75">
                      {confirmBike.types_velo?.libelle} · {confirmBike.couleur} ·
                      Emplacement{" "}
                      {String(confirmBike.emplacement_dock ?? 1).padStart(2, "0")}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setConfirmBike(null)}
                      className="btn-sfax-outline min-h-[64px] px-6 text-lg"
                    >
                      Choisir un autre
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        rentalFlow === "OCCASIONNEL"
                          ? handleConfirmBikeOccasionnel(confirmBike)
                          : handleConfirmBikeAbonne(confirmBike)
                      }
                      className="btn-sfax-primary min-h-[64px] px-8 text-xl"
                    >
                      {busy ? "Déblocage..." : "Confirmer"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* K6 : VÉLO DÉBLOQUÉ OU MAUVAIS ÉTAT */}
        {screen === "K6" && unlockedBike && (
          <div className="card-sfax mx-auto max-w-3xl p-8 text-center">
            {unlockCountdown === 0 && !unlockDone ? (
              <>
                <AlertTriangle className="mx-auto h-14 w-14 text-[#C8553D]" />
                <h2 className="mt-4 text-3xl font-bold">
                  Vélo reverrouillé, location annulée
                </h2>
                <button
                  type="button"
                  onClick={resetToHome}
                  className="btn-sfax-primary mt-6 min-h-[64px] px-8 text-xl"
                >
                  Recommencer
                </button>
              </>
            ) : unlockDone ? (
              <>
                <CheckCircle2 className="mx-auto h-16 w-16 text-[#5E7B3A]" />
                <h2 className="mt-4 text-3xl font-bold">
                  Bonne route avec le vélo {unlockedBike.numSerie} !
                </h2>
                <p className="mt-2 text-lg text-[#14232B]/75">
                  Pensez à vérifier les freins et à restituer le vélo à une
                  station VéloSf avec place libre.
                </p>
                <button
                  type="button"
                  onClick={resetToHome}
                  className="btn-sfax-primary mt-6 min-h-[64px] px-8 text-xl"
                >
                  Terminer
                </button>
              </>
            ) : (
              <>
                <div className="mx-auto inline-block rounded-[6px] border-2 border-[#14232B] bg-[#F0A42B] px-8 py-4 font-mono-sfax text-4xl font-bold">
                  Emplacement {String(unlockedBike.dock).padStart(2, "0")}
                </div>
                <h2 className="mt-6 text-3xl font-bold">
                  Vélo {unlockedBike.numSerie} débloqué
                </h2>
                <p className="mt-2 text-xl">
                  Récupérez-le dans les{" "}
                  <span className="font-mono-sfax font-bold text-[#0E5A6B]">
                    {unlockCountdown} secondes
                  </span>
                </p>

                <div className="mt-8 flex flex-wrap justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => setUnlockDone(true)}
                    className="btn-sfax-primary min-h-[64px] px-8 text-xl"
                  >
                    J&apos;ai récupéré le vélo
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFaultModal(true)}
                    className="btn-sfax-outline min-h-[64px] px-6 text-xl text-[#9B3925]"
                  >
                    Ce vélo est en mauvais état
                  </button>
                </div>
              </>
            )}

            {showFaultModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14232B]/60 p-4">
                <div className="card-sfax w-full max-w-lg p-6 text-left">
                  <h3 className="text-2xl font-bold">
                    Quel problème constatez-vous ?
                  </h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {FAULT_CHIPS.map((chip) => {
                      const active = selectedFaults.includes(chip);
                      return (
                        <button
                          key={chip}
                          type="button"
                          onClick={() =>
                            setSelectedFaults((prev) =>
                              active
                                ? prev.filter((c) => c !== chip)
                                : [...prev, chip]
                            )
                          }
                          className={`min-h-[48px] rounded-[6px] border-[1.5px] border-[#14232B] px-4 font-semibold ${
                            active ? "bg-[#C8553D] text-white" : "bg-[#F6F1E7]"
                          }`}
                        >
                          {chip}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-4 text-sm text-[#5E7B3A] font-semibold">
                    Aucun frais ne vous sera facturé. Vous pourrez choisir un
                    autre vélo.
                  </p>
                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowFaultModal(false)}
                      className="btn-sfax-outline px-5 py-3"
                    >
                      Retour
                    </button>
                    <button
                      type="button"
                      disabled={busy || selectedFaults.length === 0}
                      onClick={handleReportFaultyBike}
                      className="btn-sfax-primary px-6 py-3"
                    >
                      Signaler et changer de vélo
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* K7 : RESTITUER UN VÉLO ABONNÉ */}
        {screen === "K7" && (
          <div className="card-sfax mx-auto max-w-2xl p-8">
            <h2 className="text-3xl font-bold">Restituer un vélo</h2>
            {!returnResult?.ok ? (
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-base font-semibold">
                    Numéro de série du vélo
                  </label>
                  <input
                    type="text"
                    value={returnSerial}
                    onChange={(e) =>
                      setReturnSerial(e.target.value.toUpperCase())
                    }
                    placeholder="VSF-XXXXXX"
                    className="mt-1.5 w-full rounded-[6px] border-[1.5px] border-[#14232B] bg-[#F6F1E7] px-4 py-4 font-mono-sfax text-2xl"
                  />
                </div>
                <label className="flex items-center gap-3 text-base">
                  <input
                    type="checkbox"
                    checked={returnDamaged}
                    onChange={(e) => setReturnDamaged(e.target.checked)}
                    className="h-5 w-5"
                  />
                  <span>Le vélo est endommagé (signaler au technicien)</span>
                </label>

                {returnResult?.error && (
                  <div className="rounded-[6px] border-[1.5px] border-[#C8553D] bg-[#C8553D]/12 p-4 text-[#9B3925]">
                    <p className="font-semibold">{returnResult.error}</p>
                    {returnResult.stationPleine && returnResult.alternatives && (
                      <ul className="mt-2 list-disc pl-5 text-sm">
                        {returnResult.alternatives.map((s) => (
                          <li key={s.id_station}>
                            {s.nom} — {s.capacite - s.nb_velos_actuel} places
                            libres
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  disabled={busy || !returnSerial.trim()}
                  onClick={() => handleRestituer(false)}
                  className="btn-sfax-primary min-h-[64px] w-full text-xl"
                >
                  {busy ? "Enregistrement..." : "Confirmer la restitution"}
                </button>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="rounded-[6px] border-[1.5px] border-[#5E7B3A] bg-[#5E7B3A]/12 p-5">
                  <CheckCircle2 className="mb-2 h-10 w-10 text-[#5E7B3A]" />
                  <h3 className="text-2xl font-bold">Restitution confirmée</h3>
                  <p className="mt-2 font-mono-sfax text-base">
                    {returnResult.stationDepartNom} •••••▶{" "}
                    {returnResult.stationArriveeNom}
                  </p>
                  <p className="mt-1 text-base">
                    Durée :{" "}
                    <strong>
                      {formatDurationMinutes(returnResult.elapsedMin ?? 0)}
                    </strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetToHome}
                  className="btn-sfax-primary min-h-[64px] w-full text-xl"
                >
                  Terminer
                </button>
              </div>
            )}
          </div>
        )}

        {/* K8 : OCCASIONNEL DEMANDE DE CARTE DE COURTE DURÉE */}
        {screen === "K8" && (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="card-sfax space-y-4 p-6 md:col-span-2">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                  Carte de courte durée (Occasionnel)
                </h2>
                <button
                  type="button"
                  onClick={() => setShowKeyboard((v) => !v)}
                  className="rounded border border-[#14232B] bg-[#F6F1E7] px-3 py-1.5 text-xs font-semibold"
                >
                  {showKeyboard ? "Masquer clavier" : "Clavier tactile"}
                </button>
              </div>

              {occKnownBanner && (
                <div className="rounded-[6px] border-[1.5px] border-[#5E7B3A] bg-[#5E7B3A]/15 p-3 font-semibold text-[#3D5223]">
                  {occKnownBanner} — vos coordonnées ont été pré-remplies.
                </div>
              )}
              {occCinBlocked && (
                <div className="rounded-[6px] border-[1.5px] border-[#C8553D] bg-[#C8553D]/15 p-3 font-semibold text-[#9B3925]">
                  <ShieldAlert className="mr-1.5 inline h-4 w-4" />
                  {occCinBlocked}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold">
                    CIN (8 chiffres)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={occCin}
                    onChange={(e) => handleCinChange(e.target.value)}
                    placeholder="8 chiffres"
                    className="mt-1 w-full rounded-[6px] border-[1.5px] border-[#14232B] bg-[#F6F1E7] px-3 py-3 font-mono-sfax text-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold">
                    Téléphone (+216 XX XXX XXX)
                  </label>
                  <input
                    type="text"
                    value={occTel}
                    onChange={(e) =>
                      setOccTel(formatTunisianPhoneInput(e.target.value))
                    }
                    className="mt-1 w-full rounded-[6px] border-[1.5px] border-[#14232B] bg-[#F6F1E7] px-3 py-3 font-mono-sfax text-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold">Nom</label>
                  <input
                    type="text"
                    value={occNom}
                    onChange={(e) => setOccNom(e.target.value)}
                    placeholder="Nom"
                    className="mt-1 w-full rounded-[6px] border-[1.5px] border-[#14232B] bg-[#F6F1E7] px-3 py-3 text-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold">Prénom</label>
                  <input
                    type="text"
                    value={occPrenom}
                    onChange={(e) => setOccPrenom(e.target.value)}
                    placeholder="Prénom"
                    className="mt-1 w-full rounded-[6px] border-[1.5px] border-[#14232B] bg-[#F6F1E7] px-3 py-3 text-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold">
                  Station de destination prévue
                </label>
                <select
                  value={occDestId}
                  onChange={(e) => setOccDestId(Number(e.target.value))}
                  className="mt-1 w-full rounded-[6px] border-[1.5px] border-[#14232B] bg-[#F6F1E7] px-3 py-3 text-lg"
                >
                  <option value={0}>Choisir la destination...</option>
                  {stations
                    .filter((s) => s.id_station !== activeStation?.id_station)
                    .map((s) => {
                      const full = s.nb_velos_actuel >= s.capacite;
                      return (
                        <option
                          key={s.id_station}
                          value={s.id_station}
                          disabled={full}
                        >
                          {s.nom} —{" "}
                          {full
                            ? "Pleine"
                            : `${s.capacite - s.nb_velos_actuel} places libres`}
                        </option>
                      );
                    })}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold">
                  Durée de location ({formatDurationMinutes(occDuree)})
                </label>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {[60, 120, 240, 480].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setOccDuree(m)}
                      className={`min-h-[48px] rounded-[6px] border-[1.5px] border-[#14232B] px-4 font-mono-sfax font-semibold ${
                        occDuree === m
                          ? "bg-[#0E5A6B] text-white"
                          : "bg-[#F6F1E7]"
                      }`}
                    >
                      {formatDurationMinutes(m)}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setOccDuree((d) => Math.max(30, d - 30))}
                    className="btn-sfax-outline h-12 w-12 text-xl"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() => setOccDuree((d) => Math.min(720, d + 30))}
                    className="btn-sfax-outline h-12 w-12 text-xl"
                  >
                    +
                  </button>
                </div>
              </div>

              {showKeyboard && (
                <div className="rounded-[6px] border border-[#14232B] bg-[#E3D9C6]/50 p-3 font-mono-sfax text-xs">
                  Clavier tactile virtuel activé (saisie directe disponible dans
                  les champs ci-dessus).
                </div>
              )}
            </div>

            {/* Colonne droite : résumé sticky en mono */}
            <div className="card-sfax flex flex-col justify-between p-6">
              <div>
                <span className="font-mono-sfax text-xs uppercase text-[#0E5A6B]">
                  Récapitulatif tarifaire
                </span>
                <h3 className="mt-1 text-xl font-bold">Montants à régler</h3>
                <div className="mt-6 space-y-3 font-mono-sfax text-base">
                  <div className="flex justify-between">
                    <span>Frais d&apos;exploitation</span>
                    <span>{formatDT(occAmounts.frais)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Montant de garantie</span>
                    <span>{formatDT(occAmounts.garantie)}</span>
                  </div>
                  <div className="border-t-2 border-dotted border-[#14232B] pt-3 flex justify-between text-xl font-bold text-[#0E5A6B]">
                    <span>Total</span>
                    <span>{formatDT(occAmounts.total)}</span>
                  </div>
                </div>
                <p className="mt-4 text-xs text-[#14232B]/70">
                  La garantie de {formatDT(occAmounts.garantie)} vous est
                  restituée intégralement au retour du vélo dans les temps.
                </p>
              </div>

              <button
                type="button"
                disabled={
                  Boolean(occCinBlocked) ||
                  !/^[0-9]{8}$/.test(occCin) ||
                  !occNom.trim() ||
                  !occPrenom.trim() ||
                  occDestId === 0
                }
                onClick={() => setScreen("K9")}
                className="btn-sfax-primary mt-6 min-h-[64px] w-full text-lg"
              >
                Continuer vers le paiement
              </button>
            </div>
          </div>
        )}

        {/* K9 : PAIEMENT */}
        {screen === "K9" && (
          <div className="card-sfax mx-auto max-w-2xl p-8">
            <h2 className="text-3xl font-bold">Paiement</h2>
            <div className="card-sfax-flat mt-4 bg-[#F6F1E7] p-4 font-mono-sfax text-sm">
              <p>Usager : {maskIdentity(occNom, occPrenom)}</p>
              <p>
                Durée : {formatDurationMinutes(occDuree)} · Total :{" "}
                <strong>{formatDT(occAmounts.total)}</strong>
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setOccPaymentMethod("CARTE_BANCAIRE")}
                className={`min-h-[84px] rounded-[6px] border-[1.5px] border-[#14232B] p-4 text-left text-lg font-bold ${
                  occPaymentMethod === "CARTE_BANCAIRE"
                    ? "bg-[#0E5A6B] text-white"
                    : "bg-[#FFFDF8]"
                }`}
              >
                Carte bancaire (TPE)
              </button>
              <button
                type="button"
                onClick={() => setOccPaymentMethod("E_DINAR")}
                className={`min-h-[84px] rounded-[6px] border-[1.5px] border-[#14232B] p-4 text-left text-lg font-bold ${
                  occPaymentMethod === "E_DINAR"
                    ? "bg-[#0E5A6B] text-white"
                    : "bg-[#FFFDF8]"
                }`}
              >
                e-DINAR
              </button>
            </div>

            {occPaying && (
              <div className="mt-5 flex items-center gap-3 rounded-[6px] border border-[#0E5A6B] bg-[#0E5A6B]/10 p-4 font-semibold text-[#0E5A6B]">
                <Clock className="h-5 w-5 animate-spin" />
                <span>Suivez les instructions sur le terminal...</span>
              </div>
            )}

            {occPayError && (
              <div className="mt-5 rounded-[6px] border-[1.5px] border-[#C8553D] bg-[#C8553D]/12 p-4 text-[#9B3925]">
                <p className="font-semibold">{occPayError}</p>
                <p className="mt-1 text-xs">
                  La demande est annulée et aucun montant n&apos;a été débité.
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={occPaying}
                onClick={() => handlePayOccasionnel()}
                className="btn-sfax-primary min-h-[64px] flex-1 text-xl"
              >
                Valider le paiement ({formatDT(occAmounts.total)})
              </button>
            </div>
          </div>
        )}

        {/* K10 : CARTE DÉLIVRÉE */}
        {screen === "K10" && occCarteDelivree && (
          <div className="card-sfax mx-auto max-w-xl p-8 text-center">
            <div className="mx-auto max-w-sm rounded-[6px] border-2 border-dashed border-[#14232B] bg-[#FFFDF8] p-6 text-left font-mono-sfax">
              <div className="flex items-center justify-between border-b border-dotted border-[#14232B] pb-3">
                <span className="font-bold">CARTE COURTE DURÉE</span>
                <Printer className="h-4 w-4" />
              </div>
              <p className="mt-3 text-2xl font-bold text-[#0E5A6B]">
                N° {occCarteDelivree.numCarte}
              </p>
              <p className="mt-1 text-xs">
                Réf. {occCarteDelivree.referencePaiement}
              </p>
              <p className="mt-3 text-sm">
                Vélo débloqué : <strong>{occCarteDelivree.numSerie}</strong> (Quai{" "}
                {String(occCarteDelivree.dock).padStart(2, "0")})
              </p>
              <p className="text-sm">
                Garantie versée : {formatDT(occCarteDelivree.garantie)}
              </p>
              <div className="mt-4 flex items-center justify-center rounded border border-[#14232B] bg-[#F6F1E7] p-3">
                <QrCode className="h-16 w-16 text-[#14232B]" />
              </div>
            </div>

            <button
              type="button"
              onClick={resetToHome}
              className="btn-sfax-primary mt-6 min-h-[64px] px-8 text-xl"
            >
              Bonne route — Terminer
            </button>
          </div>
        )}

        {/* K11 : RETOUR OCCASIONNEL & REMBOURSEMENT GARANTIE */}
        {screen === "K11" && (
          <div className="card-sfax mx-auto max-w-2xl p-8">
            <h2 className="text-3xl font-bold">
              Retour du vélo et remboursement de garantie
            </h2>

            {!returnResult?.ok ? (
              <div className="mt-6 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-base font-semibold">
                      N° de série du vélo
                    </label>
                    <input
                      type="text"
                      value={returnSerial}
                      onChange={(e) =>
                        setReturnSerial(e.target.value.toUpperCase())
                      }
                      placeholder="VSF-XXXXXX"
                      className="mt-1 w-full rounded-[6px] border-[1.5px] border-[#14232B] bg-[#F6F1E7] px-4 py-3 font-mono-sfax text-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-base font-semibold">
                      N° carte courte durée
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={returnCardNum}
                      onChange={(e) => setReturnCardNum(e.target.value)}
                      placeholder="N° de carte"
                      className="mt-1 w-full rounded-[6px] border-[1.5px] border-[#14232B] bg-[#F6F1E7] px-4 py-3 font-mono-sfax text-xl"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-3 text-base">
                  <input
                    type="checkbox"
                    checked={returnDamaged}
                    onChange={(e) => setReturnDamaged(e.target.checked)}
                    className="h-5 w-5"
                  />
                  <span>Vélo restitué en mauvais état</span>
                </label>

                {returnResult?.error && (
                  <div className="rounded-[6px] border-[1.5px] border-[#C8553D] bg-[#C8553D]/12 p-4 text-[#9B3925]">
                    {returnResult.error}
                  </div>
                )}

                <button
                  type="button"
                  disabled={busy || !returnSerial.trim()}
                  onClick={() => handleRestituer(true)}
                  className="btn-sfax-primary min-h-[64px] w-full text-xl"
                >
                  {busy ? "Calcul..." : "Valider le retour et rembourser"}
                </button>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {returnResult.differentStationWarning && (
                  <div className="rounded-[6px] border border-[#B8740B] bg-[#F0A42B]/20 p-3 text-sm text-[#7A4B00]">
                    Avertissement : retour effectué dans une station différente
                    de la destination prévue (autorisé).
                  </div>
                )}

                <div className="card-sfax-flat bg-[#F6F1E7] p-5 font-mono-sfax space-y-2">
                  <div className="flex justify-between">
                    <span>Garantie versée</span>
                    <span>{formatDT(returnResult.garantieVersee ?? 0)}</span>
                  </div>
                  <div className="flex justify-between text-[#C8553D]">
                    <span>
                      Retenues
                      {returnResult.depassementMin
                        ? ` (dépassement ${returnResult.depassementMin} min)`
                        : ""}
                    </span>
                    <span>− {formatDT(returnResult.retenue ?? 0)}</span>
                  </div>
                  <div className="border-t-2 border-dotted border-[#14232B] pt-2 flex justify-between text-2xl font-bold text-[#5E7B3A]">
                    <span>Montant remboursé</span>
                    <span>{formatDT(returnResult.montantRembourse ?? 0)}</span>
                  </div>
                </div>

                <p className="text-sm text-[#5E7B3A] font-semibold">
                  Carte courte durée désactivée · Garantie restituée. Merci !
                </p>

                <button
                  type="button"
                  onClick={resetToHome}
                  className="btn-sfax-primary min-h-[64px] w-full text-xl"
                >
                  Terminer
                </button>
              </div>
            )}
          </div>
        )}
        </>
        )}
      </main>

      {/* Pied de page persistant avec bouton Annuler >= 64px */}
      <footer className="mx-auto flex w-full max-w-6xl items-center justify-between pt-2">
        {screen !== "K1" ? (
          <button
            type="button"
            onClick={resetToHome}
            className="btn-sfax-outline min-h-[64px] px-8 text-xl"
          >
            Annuler
          </button>
        ) : (
          <span className="font-mono-sfax text-xs text-[#14232B]/60">
            CycloSfaxcity · VéloSf Borne Tactile
          </span>
        )}
        <span className="font-mono-sfax text-xs text-[#14232B]/60">
          Dinar Tunisien (DT) · Horloge 24h
        </span>
      </footer>
    </div>
  );
}
