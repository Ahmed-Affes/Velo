"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  TrendingUp,
  Bike,
  MapPin,
  Building2,
  Tags,
  AlertCircle,
  Wrench,
  Route,
  ClipboardList,
  Truck,
  Users,
  History,
  UserCog,
  Bell,
  Search,
  LogOut,
} from "lucide-react";
import type { StaffSession } from "@/lib/auth";
import type {
  Station,
  Entrepot,
  TypeVelo,
  Fournisseur,
  Camion,
  Velo,
  Personnel,
  Utilisateur,
  CarteAdhesion,
  CarteCourteDuree,
  LocationRow,
  Reclamation,
  Reparation,
  Itineraire,
  EtapeItineraire,
  OrdreMission,
} from "@/lib/supabase/types";
import { getAdminBootstrapAction } from "@/app/actions/admin";
import {
  TableauDeBordView,
  MouvementsView,
  type AdminRoute,
} from "./views/PilotageViews";
import {
  StationsView,
  ParcVelosView,
  FicheVeloView,
  AcquerirVeloView,
  FournisseursView,
  TypesEntrepotsView,
} from "./views/ParcViews";
import {
  ReclamationsView,
  PlanifierReparationView,
  ReparationsView,
  ItinerairesView,
  OrdresMissionView,
  CamionsView,
} from "./views/MaintenanceLogistiqueViews";
import {
  AbonnesView,
  LocationsView,
  PersonnelView,
} from "./views/ClientsEquipeViews";

interface AdminBootstrap {
  stations: Station[];
  entrepots: Entrepot[];
  types: TypeVelo[];
  fournisseurs: Fournisseur[];
  camions: Camion[];
  velos: Velo[];
  personnel: Personnel[];
  utilisateurs: Utilisateur[];
  cartesAdhesion: CarteAdhesion[];
  cartesCourteDuree: CarteCourteDuree[];
  locations: LocationRow[];
  reclamations: Reclamation[];
  reparations: Reparation[];
  itineraires: Itineraire[];
  etapes: EtapeItineraire[];
  ordresMission: OrdreMission[];
}

const NAV_GROUPS: {
  title: string;
  items: { id: AdminRoute; label: string; Icon: typeof LayoutDashboard }[];
}[] = [
  {
    title: "Pilotage",
    items: [
      { id: "R1", label: "Tableau de bord", Icon: LayoutDashboard },
      { id: "R12", label: "Mouvements", Icon: TrendingUp },
    ],
  },
  {
    title: "Parc",
    items: [
      { id: "R3", label: "Vélos", Icon: Bike },
      { id: "R2", label: "Stations", Icon: MapPin },
      { id: "R6", label: "Fournisseurs", Icon: Building2 },
      { id: "R7", label: "Types & entrepôts", Icon: Tags },
    ],
  },
  {
    title: "Maintenance",
    items: [
      { id: "R9", label: "Réclamations", Icon: AlertCircle },
      { id: "R11", label: "Réparations", Icon: Wrench },
    ],
  },
  {
    title: "Logistique",
    items: [
      { id: "R13", label: "Itinéraires", Icon: Route },
      { id: "R14", label: "Ordres de mission", Icon: ClipboardList },
      { id: "R15", label: "Camions", Icon: Truck },
    ],
  },
  {
    title: "Clients",
    items: [
      { id: "R16", label: "Abonnés & cartes", Icon: Users },
      { id: "R17", label: "Locations", Icon: History },
    ],
  },
  {
    title: "Équipe",
    items: [{ id: "R18", label: "Personnel", Icon: UserCog }],
  },
];

const ROUTE_LABELS: Record<AdminRoute, string> = {
  R1: "Pilotage / Tableau de bord",
  R2: "Parc / Stations",
  R3: "Parc / Vélos",
  R4: "Parc / Fiche d'un vélo",
  R5: "Parc / Acquérir un vélo",
  R6: "Parc / Fournisseurs",
  R7: "Parc / Types & entrepôts",
  R9: "Maintenance / Réclamations",
  R10: "Maintenance / Planifier une réparation",
  R11: "Maintenance / Réparations",
  R12: "Pilotage / Mouvements du réseau",
  R13: "Logistique / Créer un itinéraire",
  R14: "Logistique / Ordres de mission",
  R15: "Logistique / Camions",
  R16: "Clients / Abonnés & cartes",
  R17: "Clients / Locations",
  R18: "Équipe / Personnel",
};

export function AdminShell({
  session,
  initialData,
}: {
  session: StaffSession;
  initialData: AdminBootstrap;
}) {
  const router = useRouter();
  const [data, setData] = useState<AdminBootstrap>(initialData);
  const [route, setRoute] = useState<AdminRoute>("R1");
  const [selectedBikeSerial, setSelectedBikeSerial] = useState<string | null>(
    null
  );
  const [selectedRecId, setSelectedRecId] = useState<number | null>(null);
  const [prefillEtapes, setPrefillEtapes] = useState<
    { action: "PRENDRE" | "DEPOSER"; idStation: number; nbVelos: number }[]
  >([]);
  const [globalSearch, setGlobalSearch] = useState("");

  async function refresh() {
    const fresh = await getAdminBootstrapAction();
    setData(fresh as AdminBootstrap);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  function handleGlobalSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = globalSearch.trim().toUpperCase();
    if (!q) return;
    const bike = data.velos.find((v) => v.num_serie === q);
    if (bike) {
      setSelectedBikeSerial(bike.num_serie);
      setRoute("R4");
      return;
    }
    if (data.utilisateurs.some((u) => u.cin === q)) {
      setRoute("R16");
      return;
    }
    if (data.personnel.some((p) => String(p.matricule) === q)) {
      setRoute("R18");
    }
  }

  const unhandledRecs = data.reclamations.filter((r) => !r.traitee).length;
  const activeVelo =
    data.velos.find((v) => v.num_serie === selectedBikeSerial) ?? data.velos[0];
  const activeRec =
    data.reclamations.find((r) => r.id_reclamation === selectedRecId) ??
    data.reclamations[0];

  return (
    <div className="flex min-h-screen bg-[#F6F1E7]">
      {/* Rail de navigation gauche */}
      <aside className="hidden w-64 shrink-0 flex-col border-r-[1.5px] border-[#14232B] bg-[#0E5A6B] text-[#FFFDF8] lg:flex">
        <div className="border-b border-[#9DB8BF]/30 px-5 py-4">
          <Link href="/" className="font-heading text-2xl font-bold">
            VéloSf
          </Link>
          <p className="font-mono-sfax text-[11px] text-[#9DB8BF]">
            BACK-OFFICE RESPONSABLE
          </p>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto p-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="mb-1.5 px-2 font-mono-sfax text-[10px] uppercase tracking-wider text-[#9DB8BF]">
                {group.title}
              </p>
              <div className="space-y-1">
                {group.items.map(({ id, label, Icon }) => {
                  const active = route === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setRoute(id)}
                      className={`flex w-full items-center gap-2.5 rounded-[6px] px-3 py-2 text-left text-sm font-medium transition-colors ${
                        active
                          ? "bg-[#F0A42B] font-semibold text-[#14232B]"
                          : "text-[#FFFDF8]/90 hover:bg-[#14232B]/25"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Zone principale */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b-[1.5px] border-[#14232B] bg-[#FFFDF8] px-6 py-3">
          <form onSubmit={handleGlobalSearch} className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#14232B]/50" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Recherche globale : VSF-000412, CIN, matricule..."
              className="w-full rounded-[6px] border-[1.5px] border-[#14232B] bg-[#F6F1E7] py-1.5 pl-9 pr-3 font-mono-sfax text-sm"
            />
          </form>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setRoute("R9")}
              className="relative rounded-[6px] border border-[#14232B] bg-[#F6F1E7] p-2 hover:bg-[#E3D9C6]"
              aria-label="Réclamations non traitées"
            >
              <Bell className="h-4 w-4" />
              {unhandledRecs > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border border-[#14232B] bg-[#C8553D] px-1 font-mono-sfax text-[10px] font-bold text-white">
                  {unhandledRecs}
                </span>
              )}
            </button>

            <div className="text-right text-xs">
              <p className="font-semibold">
                {session.prenom} {session.nom}
              </p>
              <p className="font-mono-sfax text-[#0E5A6B]">
                Matricule #{session.matricule}
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="btn-sfax-outline inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
            >
              <LogOut className="h-3.5 w-3.5" />
              Déconnexion
            </button>
          </div>
        </header>

        {/* Fil d'Ariane */}
        <div className="border-b border-[#E3D9C6] bg-[#F6F1E7] px-6 py-2 font-mono-sfax text-xs text-[#0E5A6B]">
          VéloSf / {ROUTE_LABELS[route]}
        </div>

        {/* Contenu de l'écran actif */}
        <main className="bg-zellige flex-1 p-6">
          {route === "R1" && (
            <TableauDeBordView
              stations={data.stations}
              velos={data.velos}
              reclamations={data.reclamations}
              ordresMission={data.ordresMission}
              camions={data.camions}
              locations={data.locations}
              onNavigate={setRoute}
            />
          )}
          {route === "R2" && (
            <StationsView
              stations={data.stations}
              entrepots={data.entrepots}
              onRefresh={refresh}
            />
          )}
          {route === "R3" && (
            <ParcVelosView
              velos={data.velos}
              types={data.types}
              fournisseurs={data.fournisseurs}
              stations={data.stations}
              onSelectBike={(serial) => {
                setSelectedBikeSerial(serial);
                setRoute("R4");
              }}
              onAcquerir={() => setRoute("R5")}
            />
          )}
          {route === "R4" && activeVelo && (
            <FicheVeloView
              velo={activeVelo}
              types={data.types}
              fournisseurs={data.fournisseurs}
              stations={data.stations}
              locations={data.locations}
              reclamations={data.reclamations}
              reparations={data.reparations}
              onBack={() => setRoute("R3")}
              onRefresh={refresh}
              onNavigatePlanifier={(idRec) => {
                setSelectedRecId(idRec);
                setRoute("R10");
              }}
            />
          )}
          {route === "R5" && (
            <AcquerirVeloView
              types={data.types}
              fournisseurs={data.fournisseurs}
              stations={data.stations}
              velos={data.velos}
              onDone={refresh}
            />
          )}
          {route === "R6" && (
            <FournisseursView
              fournisseurs={data.fournisseurs}
              velos={data.velos}
              onRefresh={refresh}
            />
          )}
          {route === "R7" && (
            <TypesEntrepotsView
              types={data.types}
              entrepots={data.entrepots}
              velos={data.velos}
              stations={data.stations}
              onRefresh={refresh}
            />
          )}
          {route === "R9" && (
            <ReclamationsView
              reclamations={data.reclamations}
              personnel={data.personnel}
              onPlanifier={(idRec) => {
                setSelectedRecId(idRec);
                setRoute("R10");
              }}
              onSelectBike={(serial) => {
                setSelectedBikeSerial(serial);
                setRoute("R4");
              }}
            />
          )}
          {route === "R10" && activeRec && (
            <PlanifierReparationView
              reclamation={activeRec}
              personnel={data.personnel}
              reparations={data.reparations}
              onDone={async () => {
                await refresh();
                setRoute("R11");
              }}
            />
          )}
          {route === "R11" && (
            <ReparationsView
              reparations={data.reparations}
              reclamations={data.reclamations}
              personnel={data.personnel}
              onRefresh={refresh}
            />
          )}
          {route === "R12" && (
            <MouvementsView
              stations={data.stations}
              locations={data.locations}
              onPrefillItinerary={(fromId, toId, count) => {
                setPrefillEtapes([
                  { action: "PRENDRE", idStation: fromId, nbVelos: count },
                  { action: "DEPOSER", idStation: toId, nbVelos: count },
                ]);
                setRoute("R13");
              }}
            />
          )}
          {route === "R13" && (
            <ItinerairesView
              stations={data.stations}
              personnel={data.personnel}
              camions={data.camions}
              initialEtapes={prefillEtapes}
              onDone={async () => {
                await refresh();
                setRoute("R14");
              }}
            />
          )}
          {route === "R14" && (
            <OrdresMissionView
              ordresMission={data.ordresMission}
              etapes={data.etapes}
              personnel={data.personnel}
              stations={data.stations}
              onCreateNew={() => setRoute("R13")}
            />
          )}
          {route === "R15" && (
            <CamionsView
              camions={data.camions}
              velos={data.velos}
              entrepots={data.entrepots}
              onRefresh={refresh}
            />
          )}
          {route === "R16" && (
            <AbonnesView
              utilisateurs={data.utilisateurs}
              cartesAdhesion={data.cartesAdhesion}
              cartesCourteDuree={data.cartesCourteDuree}
              locations={data.locations}
              onRefresh={refresh}
            />
          )}
          {route === "R17" && (
            <LocationsView
              locations={data.locations}
              utilisateurs={data.utilisateurs}
              stations={data.stations}
              cartesCourteDuree={data.cartesCourteDuree}
            />
          )}
          {route === "R18" && (
            <PersonnelView personnel={data.personnel} onRefresh={refresh} />
          )}
        </main>
      </div>
    </div>
  );
}
