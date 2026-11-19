"use client";

import { useState } from "react";
import { Plus, ShieldAlert, Unlock, RefreshCw, Ban, KeyRound } from "lucide-react";
import type {
  Utilisateur,
  CarteAdhesion,
  CarteCourteDuree,
  LocationRow,
  Station,
  Personnel,
} from "@/lib/supabase/types";
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
  const [showNew, setShowNew] = useState(false);
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [cin, setCin] = useState("");
  const [tel, setTel] = useState("+216 ");
  const [exp, setExp] = useState("2027-12-31");
  const [msg, setMsg] = useState<string | null>(null);
  const [createdPin, setCreatedPin] = useState<string | null>(null);
  const [hidePin, setHidePin] = useState(false);

  const abonnes = utilisateurs.filter((u) => u.type_utilisateur === "ABONNE");
  const occasionnels = utilisateurs.filter(
    (u) => u.type_utilisateur === "OCCASIONNEL"
  );

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
    await onRefresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab("ABONNES")}
            className={`rounded-[6px] border-[1.5px] border-[#14232B] px-4 py-2 text-sm font-semibold ${
              tab === "ABONNES" ? "bg-[#0E5A6B] text-white" : "bg-[#FFFDF8]"
            }`}
          >
            Abonnés ({abonnes.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("OCCASIONNELS")}
            className={`rounded-[6px] border-[1.5px] border-[#14232B] px-4 py-2 text-sm font-semibold ${
              tab === "OCCASIONNELS" ? "bg-[#0E5A6B] text-white" : "bg-[#FFFDF8]"
            }`}
          >
            Occasionnels ({occasionnels.length})
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowNew((v) => !v);
            setCreatedPin(null);
          }}
          className="btn-sfax-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
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
        <div className="card-sfax border-[#5E7B3A] bg-[#5E7B3A]/10 p-4">
          <p className="font-semibold text-[#3D5223]">
            Abonné et carte créés ! Code secret généré (affiché une seule fois) :
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className="font-mono-sfax text-2xl font-bold">
              {hidePin ? "••••" : createdPin}
            </span>
            <button
              type="button"
              onClick={() => setHidePin((v) => !v)}
              className="btn-sfax-outline px-3 py-1 text-xs"
            >
              {hidePin ? "Afficher" : "Masquer"}
            </button>
          </div>
        </div>
      )}

      {showNew && (
        <form onSubmit={handleCreate} className="card-sfax grid gap-4 p-5 md:grid-cols-3">
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
        <div className="card-sfax-flat overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b-[1.5px] border-[#14232B] bg-[#F6F1E7] font-mono-sfax text-xs uppercase">
              <tr>
                <th className="p-3">Abonné</th>
                <th className="p-3">CIN</th>
                <th className="p-3">Téléphone</th>
                <th className="p-3">Carte</th>
                <th className="p-3">Location en cours</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3D9C6]">
              {abonnes.map((u) => {
                const carte = cartesAdhesion.find(
                  (c) => c.id_utilisateur === u.id_utilisateur
                );
                const loc = locations.find(
                  (l) => l.id_utilisateur === u.id_utilisateur && !l.date_heure_fin
                );
                return (
                  <tr key={u.id_utilisateur}>
                    <td className="p-3 font-semibold">
                      {u.prenom} {u.nom}
                    </td>
                    <td className="p-3 font-mono-sfax">{u.cin}</td>
                    <td className="p-3 font-mono-sfax text-xs">{u.tel}</td>
                    <td className="p-3 font-mono-sfax text-xs">
                      {carte ? (
                        <div>
                          <span className="font-bold">#{carte.num_carte}</span> · exp.{" "}
                          {formatDate(carte.date_expiration)}
                          <div className="mt-0.5">
                            {carte.bloquee ? (
                              <span className="text-[#C8553D] font-bold">BLOQUÉE</span>
                            ) : !carte.active ? (
                              <span className="text-[#7A7A72]">DÉSACTIVÉE</span>
                            ) : (
                              <span className="text-[#5E7B3A] font-bold">ACTIVE</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-3 font-mono-sfax text-xs">
                      {loc ? loc.num_serie : "Aucune"}
                    </td>
                    <td className="p-3">
                      {carte && (
                        <div className="flex flex-wrap gap-1.5">
                          {carte.bloquee && (
                            <button
                              type="button"
                              onClick={async () => {
                                await gererCarteAdhesionAction(carte.num_carte, "DEBLOQUER");
                                await onRefresh();
                              }}
                              className="inline-flex items-center gap-1 rounded border border-[#14232B] bg-[#5E7B3A] px-2 py-1 text-xs text-white"
                            >
                              <Unlock className="h-3 w-3" /> Débloquer
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={async () => {
                              await gererCarteAdhesionAction(carte.num_carte, "RENOUVELER");
                              await onRefresh();
                            }}
                            className="inline-flex items-center gap-1 rounded border border-[#14232B] bg-[#F6F1E7] px-2 py-1 text-xs"
                          >
                            <RefreshCw className="h-3 w-3" /> Renouveler
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
                            className="inline-flex items-center gap-1 rounded border border-[#14232B] bg-[#F6F1E7] px-2 py-1 text-xs"
                          >
                            <KeyRound className="h-3 w-3" /> Reset PIN
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
                              className="inline-flex items-center gap-1 rounded border border-[#C8553D] px-2 py-1 text-xs text-[#9B3925]"
                            >
                              <Ban className="h-3 w-3" /> Désactiver
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card-sfax-flat overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b-[1.5px] border-[#14232B] bg-[#F6F1E7] font-mono-sfax text-xs uppercase">
              <tr>
                <th className="p-3">Carte</th>
                <th className="p-3">Usager</th>
                <th className="p-3">CIN</th>
                <th className="p-3">Frais</th>
                <th className="p-3">Garantie</th>
                <th className="p-3">Restituée</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3D9C6]">
              {cartesCourteDuree.map((c) => {
                const u = utilisateurs.find((x) => x.id_utilisateur === c.id_utilisateur);
                return (
                  <tr key={c.num_carte}>
                    <td className="p-3 font-mono-sfax font-bold">#{c.num_carte}</td>
                    <td className="p-3">
                      {u?.prenom} {u?.nom}
                    </td>
                    <td className="p-3 font-mono-sfax">{u?.cin}</td>
                    <td className="p-3 font-mono-sfax">
                      {formatDT(Number(c.frais_exploitation))}
                    </td>
                    <td className="p-3 font-mono-sfax">
                      {formatDT(Number(c.montant_garantie))}
                    </td>
                    <td className="p-3 font-mono-sfax text-xs">
                      {c.garantie_restituee ? "Oui" : "En attente"}
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
          <table className="w-full text-left text-sm">
            <thead className="border-b-[1.5px] border-[#14232B] bg-[#F6F1E7] font-mono-sfax text-xs uppercase">
              <tr>
                <th className="p-3">Carte</th>
                <th className="p-3">Usager</th>
                <th className="p-3">Émission</th>
                <th className="p-3">Garantie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3D9C6]">
              {garanties.map((g) => {
                const u = utilisateurs.find((x) => x.id_utilisateur === g.id_utilisateur);
                return (
                  <tr key={g.num_carte}>
                    <td className="p-3 font-mono-sfax font-bold">#{g.num_carte}</td>
                    <td className="p-3">
                      {u?.prenom} {u?.nom} ({u?.cin})
                    </td>
                    <td className="p-3 font-mono-sfax text-xs">
                      {formatDateTime(g.date_emission)}
                    </td>
                    <td className="p-3 font-mono-sfax font-semibold">
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
          <table className="w-full text-left text-sm">
            <thead className="border-b-[1.5px] border-[#14232B] bg-[#F6F1E7] font-mono-sfax text-xs uppercase">
              <tr>
                <th className="p-3">ID</th>
                <th className="p-3">Usager</th>
                <th className="p-3">Vélo</th>
                <th className="p-3">Départ</th>
                <th className="p-3">Arrivée</th>
                <th className="p-3">Durée / Début</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3D9C6]">
              {list.map((l) => {
                const u = utilisateurs.find((x) => x.id_utilisateur === l.id_utilisateur);
                const over24h =
                  !l.date_heure_fin &&
                  Date.now() - new Date(l.date_heure_debut).getTime() >
                    24 * 3600 * 1000;
                return (
                  <tr key={l.id_location}>
                    <td className="p-3 font-mono-sfax">#{l.id_location}</td>
                    <td className="p-3">
                      {u?.prenom} {u?.nom}{" "}
                      <span className="ml-1 rounded border border-[#14232B] px-1.5 py-0.5 font-mono-sfax text-[10px]">
                        {u?.type_utilisateur}
                      </span>
                    </td>
                    <td className="p-3 font-mono-sfax font-semibold">
                      {l.num_serie}
                    </td>
                    <td className="p-3">
                      {stations.find((s) => s.id_station === l.id_station_depart)?.nom}
                    </td>
                    <td className="p-3">
                      {l.id_station_arrivee_reelle
                        ? stations.find(
                            (s) => s.id_station === l.id_station_arrivee_reelle
                          )?.nom
                        : "—"}
                    </td>
                    <td className="p-3 font-mono-sfax text-xs">
                      {l.date_heure_fin
                        ? formatDateTime(l.date_heure_fin)
                        : formatElapsedSince(l.date_heure_debut)}
                      {over24h && (
                        <span className="ml-2 inline-flex items-center gap-1 font-bold text-[#C8553D]">
                          <ShieldAlert className="h-3.5 w-3.5" /> &gt; 24h
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
  const [tab, setTab] = useState<"TECHNICIEN" | "RESPONSABLE">("TECHNICIEN");
  const [showNew, setShowNew] = useState(false);
  const [matricule, setMatricule] = useState("2025");
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [tel, setTel] = useState("+216 ");
  const [specialite, setSpecialite] = useState("Freins & transmission");
  const [password, setPassword] = useState("Sfax2026!");
  const [err, setErr] = useState<string | null>(null);

  const list = personnel.filter((p) => p.role === tab);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
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
            onClick={() => setTab("TECHNICIEN")}
            className={`rounded-[6px] border-[1.5px] border-[#14232B] px-4 py-2 text-sm font-semibold ${
              tab === "TECHNICIEN" ? "bg-[#0E5A6B] text-white" : "bg-[#FFFDF8]"
            }`}
          >
            Techniciens
          </button>
          <button
            type="button"
            onClick={() => setTab("RESPONSABLE")}
            className={`rounded-[6px] border-[1.5px] border-[#14232B] px-4 py-2 text-sm font-semibold ${
              tab === "RESPONSABLE" ? "bg-[#0E5A6B] text-white" : "bg-[#FFFDF8]"
            }`}
          >
            Responsables
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowNew((v) => !v)}
          className="btn-sfax-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
        >
          <Plus className="h-4 w-4" />
          Ajouter un membre
        </button>
      </div>

      {err && (
        <div className="rounded border border-[#C8553D] bg-[#C8553D]/12 p-3 text-sm text-[#9B3925]">
          {err}
        </div>
      )}

      {showNew && (
        <form onSubmit={handleCreate} className="card-sfax grid gap-4 p-5 md:grid-cols-3">
          <input
            type="number"
            placeholder="Matricule"
            value={matricule}
            onChange={(e) => setMatricule(e.target.value)}
            required
            className="rounded border border-[#14232B] bg-[#F6F1E7] px-3 py-2 font-mono-sfax text-sm"
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
            placeholder="Mot de passe temporaire"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="rounded border border-[#14232B] bg-[#F6F1E7] px-3 py-2 font-mono-sfax text-sm"
          />
          <button type="submit" className="btn-sfax-primary px-4 py-2 text-sm">
            Enregistrer
          </button>
        </form>
      )}

      <div className="card-sfax-flat overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b-[1.5px] border-[#14232B] bg-[#F6F1E7] font-mono-sfax text-xs uppercase">
            <tr>
              <th className="p-3">Matricule</th>
              <th className="p-3">Nom &amp; Prénom</th>
              <th className="p-3">Téléphone</th>
              {tab === "TECHNICIEN" && <th className="p-3">Spécialité</th>}
              <th className="p-3">Statut</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3D9C6]">
            {list.map((p) => (
              <tr key={p.matricule}>
                <td className="p-3 font-mono-sfax font-bold">{p.matricule}</td>
                <td className="p-3 font-semibold">
                  {p.prenom} {p.nom}
                </td>
                <td className="p-3 font-mono-sfax text-xs">{p.tel}</td>
                {tab === "TECHNICIEN" && (
                  <td className="p-3">{p.specialite}</td>
                )}
                <td className="p-3 font-mono-sfax text-xs">
                  {p.actif ? "Actif" : "Désactivé"}
                </td>
                <td className="p-3">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
