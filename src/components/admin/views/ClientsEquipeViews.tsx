"use client";

import { useState } from "react";
import {
  Plus,
  ShieldAlert,
  Unlock,
  RefreshCw,
  Ban,
  KeyRound,
  Pencil,
  Trash2,
  CreditCard,
  UserCheck,
} from "lucide-react";
import type {
  Utilisateur,
  CarteAdhesion,
  CarteCourteDuree,
  LocationRow,
  Station,
  Personnel,
  RolePersonnel,
} from "@/lib/supabase/types";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import {
  formatDate,
  formatDateTime,
  formatDT,
  formatElapsedSince,
  formatTunisianPhoneInput,
} from "@/lib/format";
import {
  createAbonneAction,
  gererCarteAdhesionAction,
  createPersonnelAction,
  updatePersonnelAction,
  deletePersonnelAction,
  togglePersonnelActifAction,
} from "@/app/actions/admin";

export function AbonnesView({
  utilisateurs,
  cartesAdhesion,
  cartesCourteDuree,
  locations,
  onRefresh,
}: {
  utilisateurs: Utilisateur[];
  cartesAdhesion: CarteAdhesion[];
  cartesCourteDuree: CarteCourteDuree[];
  locations: LocationRow[];
  onRefresh: () => Promise<void>;
}) {
  const [tab, setTab] = useState<"ABONNES" | "OCCASIONNELS">("ABONNES");
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [cin, setCin] = useState("");
  const [tel, setTel] = useState("+216 ");
  const [exp, setExp] = useState("2027-12-31");
  const [msg, setMsg] = useState<string | null>(null);
  const [createdPin, setCreatedPin] = useState<string | null>(null);
  const [hidePin, setHidePin] = useState(false);

  const abonnes = utilisateurs
    .filter((u) => u.type_utilisateur === "ABONNE")
    .filter(
      (u) =>
        !search ||
        `${u.nom} ${u.prenom} ${u.cin}`
          .toLowerCase()
          .includes(search.toLowerCase())
    );

  const filteredOccasionnels = cartesCourteDuree.filter((c) => {
    if (!search) return true;
    const u = utilisateurs.find((x) => x.id_utilisateur === c.id_utilisateur);
    return `${u?.nom ?? ""} ${u?.prenom ?? ""} ${u?.cin ?? ""} ${c.num_carte}`
      .toLowerCase()
      .includes(search.toLowerCase());
  });

  const activeCartesCount = cartesAdhesion.filter(
    (c) => c.active && !c.bloquee
  ).length;
  const blockedCartesCount = cartesAdhesion.filter((c) => c.bloquee).length;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await createAbonneAction({
      nom,
      prenom,
      cin,
      tel,
      dateExpiration: exp,
    });
    if (!res.ok) {
      setMsg(res.error ?? "Erreur");
      return;
    }
    setCreatedPin(res.pinClair ?? null);
    setHidePin(false);
    setNom("");
    setPrenom("");
    setCin("");
    setTel("+216 ");
    setShowNew(false);
    await onRefresh();
  }

  return (
    <div className="space-y-6">
      {/* Bandeau résumé amélioré */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="card-sfax-flat p-4">
          <p className="font-mono-sfax text-xs uppercase text-[#0E5A6B]">
            Abonnés
          </p>
          <p className="mt-1 font-mono-sfax text-2xl font-bold">
            {utilisateurs.filter((u) => u.type_utilisateur === "ABONNE").length}
          </p>
        </div>
        <div className="card-sfax-flat p-4">
          <p className="font-mono-sfax text-xs uppercase text-[#5E7B3A]">
            Cartes actives
          </p>
          <p className="mt-1 font-mono-sfax text-2xl font-bold text-[#5E7B3A]">
            {activeCartesCount}
          </p>
        </div>
        <div className="card-sfax-flat p-4">
          <p className="font-mono-sfax text-xs uppercase text-[#C8553D]">
            Cartes bloquées
          </p>
          <p className="mt-1 font-mono-sfax text-2xl font-bold text-[#C8553D]">
            {blockedCartesCount}
          </p>
        </div>
        <div className="card-sfax-flat p-4">
          <p className="font-mono-sfax text-xs uppercase text-[#B8740B]">
            Cartes courte durée
          </p>
          <p className="mt-1 font-mono-sfax text-2xl font-bold text-[#B8740B]">
            {cartesCourteDuree.length}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTab("ABONNES")}
              className={`inline-flex items-center gap-1.5 rounded-[6px] border-[1.5px] border-[#14232B] px-4 py-2 text-sm font-semibold ${
                tab === "ABONNES" ? "bg-[#0E5A6B] text-white" : "bg-[#FFFDF8]"
              }`}
            >
              <UserCheck className="h-4 w-4" />
              Abonnés ({abonnes.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("OCCASIONNELS")}
              className={`inline-flex items-center gap-1.5 rounded-[6px] border-[1.5px] border-[#14232B] px-4 py-2 text-sm font-semibold ${
                tab === "OCCASIONNELS"
                  ? "bg-[#0E5A6B] text-white"
                  : "bg-[#FFFDF8]"
              }`}
            >
              <CreditCard className="h-4 w-4" />
              Occasionnels ({cartesCourteDuree.length})
            </button>
          </div>

          <input
            type="text"
            placeholder="Filtrer par nom, CIN ou carte..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-[6px] border-[1.5px] border-[#14232B] bg-[#FFFDF8] px-3 py-2 text-sm"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            setShowNew((v) => !v);
            setCreatedPin(null);
          }}
          className="btn-sfax-primary inline-flex items-center gap-2 px-4 py-2.5 text-sm"
        >
          <Plus className="h-4 w-4" />
          Nouvel abonné
        </button>
      </div>

      {msg && (
        <div className="rounded border border-[#C8553D] bg-[#C8553D]/12 p-3 text-sm text-[#9B3925]">
          {msg}
        </div>
      )}

      {createdPin && (
        <div className="card-sfax border-[#5E7B3A] bg-[#5E7B3A]/10 p-5">
          <p className="font-semibold text-[#3D5223]">
            Code secret généré (affiché une seule fois) :
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className="font-mono-sfax text-3xl font-bold">
              {hidePin ? "••••" : createdPin}
            </span>
            <button
              type="button"
              onClick={() => setHidePin((v) => !v)}
              className="btn-sfax-outline px-3 py-1.5 text-xs"
            >
              {hidePin ? "Afficher" : "Masquer"}
            </button>
          </div>
        </div>
      )}

      {showNew && (
        <form
          onSubmit={handleCreate}
          className="card-sfax grid gap-4 p-5 md:grid-cols-3"
        >
          <input
            type="text"
            placeholder="Nom"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            required
            className="rounded border border-[#14232B] bg-[#F6F1E7] px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Prénom"
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            required
            className="rounded border border-[#14232B] bg-[#F6F1E7] px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="CIN (8 chiffres)"
            value={cin}
            onChange={(e) => setCin(e.target.value.replace(/\D/g, "").slice(0, 8))}
            required
            className="rounded border border-[#14232B] bg-[#F6F1E7] px-3 py-2 font-mono-sfax text-sm"
          />
          <input
            type="text"
            value={tel}
            onChange={(e) => setTel(formatTunisianPhoneInput(e.target.value))}
            required
            className="rounded border border-[#14232B] bg-[#F6F1E7] px-3 py-2 font-mono-sfax text-sm"
          />
          <input
            type="date"
            value={exp}
            onChange={(e) => setExp(e.target.value)}
            required
            className="rounded border border-[#14232B] bg-[#F6F1E7] px-3 py-2 font-mono-sfax text-sm"
          />
          <button type="submit" className="btn-sfax-primary px-4 py-2 text-sm">
            Créer la carte d&apos;adhésion
          </button>
        </form>
      )}

      {tab === "ABONNES" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {abonnes.map((u) => {
            const carte = cartesAdhesion.find(
              (c) => c.id_utilisateur === u.id_utilisateur
            );
            const loc = locations.find(
              (l) => l.id_utilisateur === u.id_utilisateur && !l.date_heure_fin
            );
            return (
              <div key={u.id_utilisateur} className="card-sfax space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold">
                      {u.prenom} {u.nom}
                    </h3>
                    <p className="font-mono-sfax text-sm text-[#0E5A6B]">
                      CIN {u.cin} · {u.tel}
                    </p>
                  </div>
                  {carte && (
                    <span
                      className={`bike-tag border px-2.5 py-1 font-mono-sfax text-xs font-bold ${
                        carte.bloquee
                          ? "border-[#C8553D] bg-[#C8553D]/15 text-[#9B3925]"
                          : !carte.active
                          ? "border-[#7A7A72] bg-[#7A7A72]/15 text-[#474742]"
                          : "border-[#5E7B3A] bg-[#5E7B3A]/15 text-[#3D5223]"
                      }`}
                    >
                      {carte.bloquee
                        ? "BLOQUÉE"
                        : !carte.active
                        ? "DÉSACTIVÉE"
                        : "ACTIVE"}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-[#E3D9C6] bg-[#F6F1E7] p-3 font-mono-sfax text-sm">
                  <span>
                    Carte <strong>#{carte?.num_carte ?? "—"}</strong> · exp.{" "}
                    {carte ? formatDate(carte.date_expiration) : "—"}
                  </span>
                  <span className="text-xs font-semibold text-[#0E5A6B]">
                    {loc ? `En location : ${loc.num_serie}` : "Aucune location"}
                  </span>
                </div>

                {carte && (
                  <div className="flex flex-wrap gap-2">
                    {carte.bloquee && (
                      <button
                        type="button"
                        onClick={async () => {
                          await gererCarteAdhesionAction(
                            carte.num_carte,
                            "DEBLOQUER"
                          );
                          await onRefresh();
                        }}
                        className="inline-flex items-center gap-1 rounded border border-[#14232B] bg-[#5E7B3A] px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        <Unlock className="h-3.5 w-3.5" /> Débloquer
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        await gererCarteAdhesionAction(
                          carte.num_carte,
                          "RENOUVELER"
                        );
                        await onRefresh();
                      }}
                      className="inline-flex items-center gap-1 rounded border border-[#14232B] bg-[#F6F1E7] px-3 py-1.5 text-xs font-semibold"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Renouveler
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const r = await gererCarteAdhesionAction(
                          carte.num_carte,
                          "RESET_PIN"
                        );
                        if (r.pinClair) setCreatedPin(r.pinClair);
                        await onRefresh();
                      }}
                      className="inline-flex items-center gap-1 rounded border border-[#14232B] bg-[#F6F1E7] px-3 py-1.5 text-xs font-semibold"
                    >
                      <KeyRound className="h-3.5 w-3.5" /> Reset PIN
                    </button>
                    {carte.active && (
                      <button
                        type="button"
                        onClick={async () => {
                          await gererCarteAdhesionAction(
                            carte.num_carte,
                            "DESACTIVER"
                          );
                          await onRefresh();
                        }}
                        className="inline-flex items-center gap-1 rounded border border-[#C8553D] px-3 py-1.5 text-xs font-semibold text-[#9B3925]"
                      >
                        <Ban className="h-3.5 w-3.5" /> Désactiver
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card-sfax-flat overflow-x-auto">
          {filteredOccasionnels.length === 0 ? (
            <div className="p-8 text-center text-base text-[#14232B]/70">
              Aucune carte de courte durée enregistrée pour le moment.
            </div>
          ) : (
            <table className="w-full text-left text-base">
              <thead className="border-b-[1.5px] border-[#14232B] bg-[#F6F1E7] font-mono-sfax text-xs uppercase">
                <tr>
                  <th className="p-3.5">Carte</th>
                  <th className="p-3.5">Usager</th>
                  <th className="p-3.5">CIN</th>
                  <th className="p-3.5">Frais</th>
                  <th className="p-3.5">Garantie</th>
                  <th className="p-3.5">Restituée</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3D9C6]">
                {filteredOccasionnels.map((c) => {
                  const u = utilisateurs.find(
                    (x) => x.id_utilisateur === c.id_utilisateur
                  );
                  return (
                    <tr key={c.num_carte}>
                      <td className="p-3.5 font-mono-sfax font-bold">
                        #{c.num_carte}
                      </td>
                      <td className="p-3.5">
                        {u?.prenom} {u?.nom}
                      </td>
                      <td className="p-3.5 font-mono-sfax">{u?.cin}</td>
                      <td className="p-3.5 font-mono-sfax">
                        {formatDT(Number(c.frais_exploitation))}
                      </td>
                      <td className="p-3.5 font-mono-sfax">
                        {formatDT(Number(c.montant_garantie))}
                      </td>
                      <td className="p-3.5 font-mono-sfax text-sm font-semibold">
                        {c.garantie_restituee ? "Oui" : "En attente"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export function LocationsView({
  locations,
  utilisateurs,
  stations,
  cartesCourteDuree,
}: {
  locations: LocationRow[];
  utilisateurs: Utilisateur[];
  stations: Station[];
  cartesCourteDuree: CarteCourteDuree[];
}) {
  const [tab, setTab] = useState<"EN_COURS" | "HISTORIQUE" | "GARANTIES">(
    "EN_COURS"
  );

  const enCours = locations.filter((l) => !l.date_heure_fin);
  const historique = locations.filter((l) => Boolean(l.date_heure_fin));
  const garanties = cartesCourteDuree.filter((c) => !c.garantie_restituee);

  const list = tab === "EN_COURS" ? enCours : historique;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("EN_COURS")}
          className={`rounded-[6px] border-[1.5px] border-[#14232B] px-4 py-2 text-sm font-semibold ${
            tab === "EN_COURS" ? "bg-[#0E5A6B] text-white" : "bg-[#FFFDF8]"
          }`}
        >
          En cours ({enCours.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("HISTORIQUE")}
          className={`rounded-[6px] border-[1.5px] border-[#14232B] px-4 py-2 text-sm font-semibold ${
            tab === "HISTORIQUE" ? "bg-[#0E5A6B] text-white" : "bg-[#FFFDF8]"
          }`}
        >
          Historique ({historique.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("GARANTIES")}
          className={`rounded-[6px] border-[1.5px] border-[#14232B] px-4 py-2 text-sm font-semibold ${
            tab === "GARANTIES" ? "bg-[#0E5A6B] text-white" : "bg-[#FFFDF8]"
          }`}
        >
          Garanties à suivre ({garanties.length})
        </button>
      </div>

      {tab === "GARANTIES" ? (
        <div className="card-sfax-flat overflow-x-auto">
          <table className="w-full text-left text-base">
            <thead className="border-b-[1.5px] border-[#14232B] bg-[#F6F1E7] font-mono-sfax text-xs uppercase">
              <tr>
                <th className="p-3.5">Carte</th>
                <th className="p-3.5">Usager</th>
                <th className="p-3.5">Émission</th>
                <th className="p-3.5">Garantie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3D9C6]">
              {garanties.map((g) => {
                const u = utilisateurs.find(
                  (x) => x.id_utilisateur === g.id_utilisateur
                );
                return (
                  <tr key={g.num_carte}>
                    <td className="p-3.5 font-mono-sfax font-bold">
                      #{g.num_carte}
                    </td>
                    <td className="p-3.5">
                      {u?.prenom} {u?.nom} ({u?.cin})
                    </td>
                    <td className="p-3.5 font-mono-sfax text-sm">
                      {formatDateTime(g.date_emission)}
                    </td>
                    <td className="p-3.5 font-mono-sfax font-semibold">
                      {formatDT(Number(g.montant_garantie))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card-sfax-flat overflow-x-auto">
          <table className="w-full text-left text-base">
            <thead className="border-b-[1.5px] border-[#14232B] bg-[#F6F1E7] font-mono-sfax text-xs uppercase">
              <tr>
                <th className="p-3.5">ID</th>
                <th className="p-3.5">Usager</th>
                <th className="p-3.5">Vélo</th>
                <th className="p-3.5">Départ</th>
                <th className="p-3.5">Arrivée</th>
                <th className="p-3.5">Durée / Début</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3D9C6]">
              {list.map((l) => {
                const u = utilisateurs.find(
                  (x) => x.id_utilisateur === l.id_utilisateur
                );
                const over24h =
                  !l.date_heure_fin &&
                  Date.now() - new Date(l.date_heure_debut).getTime() >
                    24 * 3600 * 1000;
                return (
                  <tr key={l.id_location}>
                    <td className="p-3.5 font-mono-sfax">#{l.id_location}</td>
                    <td className="p-3.5">
                      {u?.prenom} {u?.nom}{" "}
                      <span className="ml-1 rounded border border-[#14232B] px-1.5 py-0.5 font-mono-sfax text-xs">
                        {u?.type_utilisateur}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono-sfax font-semibold">
                      {l.num_serie}
                    </td>
                    <td className="p-3.5">
                      {
                        stations.find(
                          (s) => s.id_station === l.id_station_depart
                        )?.nom
                      }
                    </td>
                    <td className="p-3.5">
                      {l.id_station_arrivee_reelle
                        ? stations.find(
                            (s) => s.id_station === l.id_station_arrivee_reelle
                          )?.nom
                        : "—"}
                    </td>
                    <td className="p-3.5 font-mono-sfax text-sm">
                      {l.date_heure_fin
                        ? formatDateTime(l.date_heure_fin)
                        : formatElapsedSince(l.date_heure_debut)}
                      {over24h && (
                        <span className="ml-2 inline-flex items-center gap-1 font-bold text-[#C8553D]">
                          <ShieldAlert className="h-4 w-4" /> &gt; 24h
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function PersonnelView({
  personnel,
  onRefresh,
}: {
  personnel: Personnel[];
  onRefresh: () => Promise<void>;
}) {
  const [tab, setTab] = useState<RolePersonnel>("TECHNICIEN");
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Personnel | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Personnel | null>(null);

  const [matricule, setMatricule] = useState("2025");
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [tel, setTel] = useState("+216 ");
  const [specialite, setSpecialite] = useState("Freins & transmission");
  const [password, setPassword] = useState("Sfax2026!");
  const [err, setErr] = useState<string | null>(null);
  const [createdCreds, setCreatedCreds] = useState<{
    matricule: number;
    nom: string;
    prenom: string;
    password: string;
    role: RolePersonnel;
  } | null>(null);

  const list = personnel.filter((p) => p.role === tab);

  function startEdit(p: Personnel) {
    setEditing(p);
    setShowNew(true);
    setMatricule(String(p.matricule));
    setNom(p.nom);
    setPrenom(p.prenom);
    setTel(p.tel);
    setSpecialite(p.specialite ?? "Freins & transmission");
    setPassword("");
    setErr(null);
  }

  function startNew() {
    setEditing(null);
    setShowNew((v) => !v);
    setMatricule(tab === "TECHNICIEN" ? "2025" : "1005");
    setNom("");
    setPrenom("");
    setTel("+216 ");
    setSpecialite("Freins & transmission");
    setPassword("Sfax2026!");
    setErr(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (editing) {
      const res = await updatePersonnelAction({
        matricule: editing.matricule,
        nom,
        prenom,
        tel,
        role: tab,
        specialite: tab === "TECHNICIEN" ? specialite : null,
        newPassword: password || undefined,
      });
      if (!res.ok) {
        setErr(res.error ?? "Erreur");
        return;
      }
      setEditing(null);
    } else {
      const res = await createPersonnelAction({
        matricule: Number(matricule),
        nom,
        prenom,
        tel,
        role: tab,
        specialite: tab === "TECHNICIEN" ? specialite : null,
        password,
      });
      if (!res.ok) {
        setErr(res.error ?? "Erreur");
        return;
      }
      setCreatedCreds({
        matricule: Number(matricule),
        nom,
        prenom,
        password,
        role: tab,
      });
    }
    setShowNew(false);
    setNom("");
    setPrenom("");
    await onRefresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setTab("TECHNICIEN");
              setShowNew(false);
              setEditing(null);
            }}
            className={`rounded-[6px] border-[1.5px] border-[#14232B] px-4 py-2 text-sm font-semibold ${
              tab === "TECHNICIEN" ? "bg-[#0E5A6B] text-white" : "bg-[#FFFDF8]"
            }`}
          >
            Techniciens ({personnel.filter((p) => p.role === "TECHNICIEN").length})
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("RESPONSABLE");
              setShowNew(false);
              setEditing(null);
            }}
            className={`rounded-[6px] border-[1.5px] border-[#14232B] px-4 py-2 text-sm font-semibold ${
              tab === "RESPONSABLE" ? "bg-[#0E5A6B] text-white" : "bg-[#FFFDF8]"
            }`}
          >
            Responsables ({personnel.filter((p) => p.role === "RESPONSABLE").length})
          </button>
        </div>

        <button
          type="button"
          onClick={startNew}
          className="btn-sfax-primary inline-flex items-center gap-2 px-4 py-2.5 text-sm"
        >
          <Plus className="h-4 w-4" />
          Ajouter un {tab === "TECHNICIEN" ? "technicien" : "responsable"}
        </button>
      </div>

      {err && (
        <div className="rounded border border-[#C8553D] bg-[#C8553D]/12 p-3 text-sm text-[#9B3925]">
          {err}
        </div>
      )}

      {createdCreds && (
        <div className="card-sfax border-[#5E7B3A] bg-[#5E7B3A]/10 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-[#3D5223]">
                Compte {createdCreds.role} créé ! Remettez ces identifiants à{" "}
                {createdCreds.prenom} {createdCreds.nom} :
              </p>
              <p className="mt-2 font-mono-sfax text-base">
                Matricule : <strong>{createdCreds.matricule}</strong> · Mot de
                passe : <strong>{createdCreds.password}</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCreatedCreds(null)}
              className="btn-sfax-outline px-3 py-1 text-xs"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {showNew && (
        <form
          onSubmit={handleSave}
          className="card-sfax grid gap-4 p-5 md:grid-cols-3"
        >
          <input
            type="number"
            placeholder="Matricule"
            value={matricule}
            disabled={Boolean(editing)}
            onChange={(e) => setMatricule(e.target.value)}
            required
            className="rounded border border-[#14232B] bg-[#F6F1E7] px-3 py-2 font-mono-sfax text-sm disabled:opacity-60"
          />
          <input
            type="text"
            placeholder="Nom"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            required
            className="rounded border border-[#14232B] bg-[#F6F1E7] px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Prénom"
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
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
          {tab === "TECHNICIEN" && (
            <input
              type="text"
              placeholder="Spécialité"
              value={specialite}
              onChange={(e) => setSpecialite(e.target.value)}
              required
              className="rounded border border-[#14232B] bg-[#F6F1E7] px-3 py-2 text-sm"
            />
          )}
          <input
            type="text"
            placeholder={
              editing
                ? "Nouveau mot de passe (laisser vide = inchangé)"
                : "Mot de passe temporaire"
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={!editing}
            className="rounded border border-[#14232B] bg-[#F6F1E7] px-3 py-2 font-mono-sfax text-sm"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="btn-sfax-primary flex-1 px-4 py-2 text-sm"
            >
              {editing ? "Enregistrer" : "Créer"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowNew(false);
                setEditing(null);
              }}
              className="btn-sfax-outline px-3 py-2 text-sm"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      <div className="card-sfax-flat overflow-x-auto">
        <table className="w-full text-left text-base">
          <thead className="border-b-[1.5px] border-[#14232B] bg-[#F6F1E7] font-mono-sfax text-xs uppercase">
            <tr>
              <th className="p-3.5">Matricule</th>
              <th className="p-3.5">Nom &amp; Prénom</th>
              <th className="p-3.5">Téléphone</th>
              {tab === "TECHNICIEN" && <th className="p-3.5">Spécialité</th>}
              <th className="p-3.5">Statut</th>
              <th className="p-3.5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3D9C6]">
            {list.map((p) => (
              <tr key={p.matricule}>
                <td className="p-3.5 font-mono-sfax font-bold">
                  #{p.matricule}
                </td>
                <td className="p-3.5 font-semibold">
                  {p.prenom} {p.nom}
                </td>
                <td className="p-3.5 font-mono-sfax text-sm">{p.tel}</td>
                {tab === "TECHNICIEN" && (
                  <td className="p-3.5">{p.specialite}</td>
                )}
                <td className="p-3.5 font-mono-sfax text-sm font-semibold">
                  {p.actif ? (
                    <span className="text-[#5E7B3A]">Actif</span>
                  ) : (
                    <span className="text-[#C8553D]">Désactivé</span>
                  )}
                </td>
                <td className="p-3.5">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(p)}
                      className="inline-flex items-center gap-1 rounded border border-[#14232B] bg-[#F6F1E7] px-2.5 py-1 text-xs font-semibold"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Modifier
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const r = await togglePersonnelActifAction(
                          p.matricule,
                          !p.actif
                        );
                        if (!r.ok && r.error) setErr(r.error);
                        await onRefresh();
                      }}
                      className="btn-sfax-outline px-2.5 py-1 text-xs"
                    >
                      {p.actif ? "Désactiver" : "Réactiver"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(p)}
                      className="inline-flex items-center gap-1 rounded border border-[#C8553D] px-2.5 py-1 text-xs font-semibold text-[#9B3925]"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Supprimer
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={Boolean(confirmDelete)}
        title="Supprimer le membre du personnel"
        objectName={
          confirmDelete
            ? `${confirmDelete.prenom} ${confirmDelete.nom} (#${confirmDelete.matricule})`
            : ""
        }
        description="Cette action supprimera définitivement ce compte s'il n'est lié à aucune mission ou réparation."
        onClose={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (!confirmDelete) return;
          const r = await deletePersonnelAction(confirmDelete.matricule);
          if (!r.ok && r.error) setErr(r.error);
          setConfirmDelete(null);
          await onRefresh();
        }}
      />
    </div>
  );
}
