"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import type { MotifReforme, RolePersonnel } from "@/lib/supabase/types";

export async function getAdminBootstrapAction() {
  await requireRole(["RESPONSABLE"]);
  const supabase = getSupabaseAdmin();

  const [
    stations,
    entrepots,
    types,
    fournisseurs,
    camions,
    velos,
    personnel,
    utilisateurs,
    cartesAdhesion,
    cartesCourteDuree,
    locations,
    reclamations,
    reparations,
    itineraires,
    etapes,
    ordresMission,
  ] = await Promise.all([
    supabase.from("stations").select("*").order("id_station"),
    supabase.from("entrepots").select("*").order("id_entrepot"),
    supabase.from("types_velo").select("*").order("id_type"),
    supabase.from("fournisseurs").select("*").order("nom"),
    supabase.from("camions").select("*").order("immatriculation"),
    supabase.from("velos").select("*").order("num_serie"),
    supabase
      .from("personnel")
      .select("matricule, nom, prenom, tel, role, specialite, actif, created_at")
      .order("matricule"),
    supabase.from("utilisateurs").select("*").order("id_utilisateur"),
    supabase
      .from("cartes_adhesion")
      .select("num_carte, id_utilisateur, date_emission, date_expiration, active, bloquee, tentatives_erronees, created_at")
      .order("num_carte"),
    supabase.from("cartes_courte_duree").select("*").order("num_carte", { ascending: false }),
    supabase.from("locations").select("*").order("date_heure_debut", { ascending: false }).limit(200),
    supabase.from("reclamations").select("*").order("date_reclamation", { ascending: false }),
    supabase.from("reparations").select("*").order("date_planifiee", { ascending: false }),
    supabase.from("itineraires").select("*").order("id_itineraire", { ascending: false }),
    supabase.from("etapes_itineraire").select("*").order("ordre"),
    supabase.from("ordres_mission").select("*").order("id_ordre", { ascending: false }),
  ]);

  return {
    stations: stations.data ?? [],
    entrepots: entrepots.data ?? [],
    types: types.data ?? [],
    fournisseurs: fournisseurs.data ?? [],
    camions: camions.data ?? [],
    velos: velos.data ?? [],
    personnel: personnel.data ?? [],
    utilisateurs: utilisateurs.data ?? [],
    cartesAdhesion: cartesAdhesion.data ?? [],
    cartesCourteDuree: cartesCourteDuree.data ?? [],
    locations: locations.data ?? [],
    reclamations: reclamations.data ?? [],
    reparations: reparations.data ?? [],
    itineraires: itineraires.data ?? [],
    etapes: etapes.data ?? [],
    ordresMission: ordresMission.data ?? [],
  };
}

export async function createStationAction(input: {
  nom: string;
  adresse: string;
  capacite: number;
  id_entrepot: number | null;
}) {
  await requireRole(["RESPONSABLE"]);
  if (!input.nom.trim() || !input.adresse.trim() || input.capacite < 1) {
    return { ok: false, error: "Nom, adresse et capacité (>= 1) requis." };
  }
  const supabase = getSupabaseAdmin();
  const { data: dup } = await supabase
    .from("stations")
    .select("id_station")
    .ilike("adresse", input.adresse.trim())
    .maybeSingle();
  if (dup) {
    return { ok: false, error: "Une station existe déjà à cette adresse." };
  }

  const { data, error } = await supabase
    .from("stations")
    .insert({
      nom: input.nom.trim(),
      adresse: input.adresse.trim(),
      capacite: input.capacite,
      id_entrepot: input.id_entrepot,
      map_x: 20 + Math.floor(Math.random() * 60),
      map_y: 15 + Math.floor(Math.random() * 65),
    })
    .select()
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, station: data };
}

export async function updateStationAction(input: {
  idStation: number;
  nom: string;
  adresse: string;
  capacite: number;
  id_entrepot: number | null;
  borne_hors_service?: boolean;
  lecteur_en_panne?: boolean;
}) {
  await requireRole(["RESPONSABLE"]);
  if (!input.nom.trim() || !input.adresse.trim() || input.capacite < 1) {
    return { ok: false, error: "Nom, adresse et capacité (>= 1) requis." };
  }
  const supabase = getSupabaseAdmin();
  const { data: st } = await supabase
    .from("stations")
    .select("nb_velos_actuel")
    .eq("id_station", input.idStation)
    .single();

  if (st && input.capacite < st.nb_velos_actuel) {
    return {
      ok: false,
      error: `Capacité impossible : ${st.nb_velos_actuel} vélos sont actuellement présents à la station.`,
    };
  }

  const { error } = await supabase
    .from("stations")
    .update({
      nom: input.nom.trim(),
      adresse: input.adresse.trim(),
      capacite: input.capacite,
      id_entrepot: input.id_entrepot,
      borne_hors_service: Boolean(input.borne_hors_service),
      lecteur_en_panne: Boolean(input.lecteur_en_panne),
    })
    .eq("id_station", input.idStation);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateStationCapacityAction(
  idStation: number,
  capacite: number
) {
  await requireRole(["RESPONSABLE"]);
  const supabase = getSupabaseAdmin();
  const { data: st } = await supabase
    .from("stations")
    .select("nb_velos_actuel")
    .eq("id_station", idStation)
    .single();

  if (st && capacite < st.nb_velos_actuel) {
    return {
      ok: false,
      error: `Capacité impossible : ${st.nb_velos_actuel} vélos sont actuellement présents à la station.`,
    };
  }
  const { error } = await supabase
    .from("stations")
    .update({ capacite })
    .eq("id_station", idStation);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteStationAction(idStation: number) {
  await requireRole(["RESPONSABLE"]);
  const supabase = getSupabaseAdmin();
  const { data: st } = await supabase
    .from("stations")
    .select("nb_velos_actuel")
    .eq("id_station", idStation)
    .single();

  if (st && st.nb_velos_actuel > 0) {
    return {
      ok: false,
      hasBikes: true,
      error: `Impossible de supprimer : ${st.nb_velos_actuel} vélo(s) sont encore à cette station. Transférez les vélos d'abord.`,
    };
  }
  const { error } = await supabase
    .from("stations")
    .delete()
    .eq("id_station", idStation);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function createEntrepotAction(nom: string, adresse: string) {
  await requireRole(["RESPONSABLE"]);
  if (!nom.trim() || !adresse.trim()) {
    return { ok: false, error: "Nom et adresse requis." };
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("entrepots")
    .insert({ nom: nom.trim(), adresse: adresse.trim() })
    .select()
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, entrepot: data };
}

export async function updateEntrepotAction(
  idEntrepot: number,
  nom: string,
  adresse: string
) {
  await requireRole(["RESPONSABLE"]);
  if (!nom.trim() || !adresse.trim()) {
    return { ok: false, error: "Nom et adresse requis." };
  }
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("entrepots")
    .update({ nom: nom.trim(), adresse: adresse.trim() })
    .eq("id_entrepot", idEntrepot);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteEntrepotAction(idEntrepot: number) {
  await requireRole(["RESPONSABLE"]);
  const supabase = getSupabaseAdmin();
  const { count } = await supabase
    .from("stations")
    .select("*", { count: "exact", head: true })
    .eq("id_entrepot", idEntrepot);
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: `Suppression refusée : ${count} station(s) sont rattachées à cet entrepôt.`,
    };
  }
  const { error } = await supabase
    .from("entrepots")
    .delete()
    .eq("id_entrepot", idEntrepot);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function createTypeVeloAction(libelle: string) {
  await requireRole(["RESPONSABLE"]);
  if (!libelle.trim()) return { ok: false, error: "Libellé requis." };
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("types_velo")
    .insert({ libelle: libelle.trim() })
    .select()
    .single();
  if (error) {
    return {
      ok: false,
      error: error.message.includes("unique")
        ? "Ce type de vélo existe déjà."
        : error.message,
    };
  }
  return { ok: true, type: data };
}

export async function updateTypeVeloAction(idType: number, libelle: string) {
  await requireRole(["RESPONSABLE"]);
  if (!libelle.trim()) return { ok: false, error: "Libellé requis." };
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("types_velo")
    .update({ libelle: libelle.trim() })
    .eq("id_type", idType);
  if (error) {
    return {
      ok: false,
      error: error.message.includes("unique")
        ? "Ce type de vélo existe déjà."
        : error.message,
    };
  }
  return { ok: true };
}

export async function deleteTypeVeloAction(idType: number) {
  await requireRole(["RESPONSABLE"]);
  const supabase = getSupabaseAdmin();
  const { count } = await supabase
    .from("velos")
    .select("*", { count: "exact", head: true })
    .eq("id_type", idType);
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: `Suppression refusée : ${count} vélo(s) utilisent encore ce type.`,
    };
  }
  const { error } = await supabase
    .from("types_velo")
    .delete()
    .eq("id_type", idType);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function createFournisseurAction(input: {
  nom: string;
  adresse: string;
  tel: string;
}) {
  await requireRole(["RESPONSABLE"]);
  if (!/^\+216 [0-9]{2} [0-9]{3} [0-9]{3}$/.test(input.tel)) {
    return { ok: false, error: "Téléphone invalide (+216 XX XXX XXX)." };
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("fournisseurs")
    .insert({
      nom: input.nom.trim(),
      adresse: input.adresse.trim(),
      tel: input.tel,
    })
    .select()
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, fournisseur: data };
}

export async function updateFournisseurAction(input: {
  idFournisseur: number;
  nom: string;
  adresse: string;
  tel: string;
  archive?: boolean;
}) {
  await requireRole(["RESPONSABLE"]);
  if (!input.nom.trim() || !input.adresse.trim()) {
    return { ok: false, error: "Nom et adresse requis." };
  }
  if (!/^\+216 [0-9]{2} [0-9]{3} [0-9]{3}$/.test(input.tel)) {
    return { ok: false, error: "Téléphone invalide (+216 XX XXX XXX)." };
  }
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("fournisseurs")
    .update({
      nom: input.nom.trim(),
      adresse: input.adresse.trim(),
      tel: input.tel,
      ...(typeof input.archive === "boolean" ? { archive: input.archive } : {}),
    })
    .eq("id_fournisseur", input.idFournisseur);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function archiveOrDeleteFournisseurAction(idFournisseur: number) {
  await requireRole(["RESPONSABLE"]);
  const supabase = getSupabaseAdmin();
  const { count } = await supabase
    .from("velos")
    .select("*", { count: "exact", head: true })
    .eq("id_fournisseur", idFournisseur);

  if ((count ?? 0) > 0) {
    await supabase
      .from("fournisseurs")
      .update({ archive: true })
      .eq("id_fournisseur", idFournisseur);
    return {
      ok: true,
      archived: true,
      message: `Fournisseur archivé (${count} vélos liés conservés).`,
    };
  }

  const { error } = await supabase
    .from("fournisseurs")
    .delete()
    .eq("id_fournisseur", idFournisseur);
  if (error) return { ok: false, error: error.message };
  return { ok: true, archived: false };
}

const acquerirSchema = z.object({
  numSeries: z.array(z.string().regex(/^VSF-[0-9]{6}$/, "Format VSF-XXXXXX requis")).min(1),
  couleur: z.string().min(2),
  couleurHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  idType: z.number().int().positive(),
  idFournisseur: z.number().int().positive(),
  idStation: z.number().int().positive(),
  dateAcquisition: z.string(),
  remplaceNumSerie: z.string().nullable().optional(),
});

export async function acquerirVelosAction(
  raw: z.infer<typeof acquerirSchema>
) {
  await requireRole(["RESPONSABLE"]);
  const parsed = acquerirSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Formulaire invalide",
    };
  }
  const input = parsed.data;
  const supabase = getSupabaseAdmin();

  const { data: station } = await supabase
    .from("stations")
    .select("capacite, nb_velos_actuel")
    .eq("id_station", input.idStation)
    .single();

  if (!station) return { ok: false, error: "Station introuvable." };
  const freeSlots = station.capacite - station.nb_velos_actuel;
  if (input.numSeries.length > freeSlots) {
    return {
      ok: false,
      error: `Capacité insuffisante : seulement ${freeSlots} place(s) libre(s) dans cette station.`,
    };
  }

  const failures: { serial: string; reason: string }[] = [];
  const created: string[] = [];

  for (let i = 0; i < input.numSeries.length; i++) {
    const serial = input.numSeries[i];
    const { error } = await supabase.from("velos").insert({
      num_serie: serial,
      couleur: input.couleur,
      couleur_hex: input.couleurHex,
      date_acquisition: input.dateAcquisition,
      etat: "DISPONIBLE",
      id_type: input.idType,
      id_fournisseur: input.idFournisseur,
      id_station: input.idStation,
      emplacement_dock: station.nb_velos_actuel + created.length + 1,
      remplace_num_serie: i === 0 ? input.remplaceNumSerie ?? null : null,
    });
    if (error) {
      failures.push({
        serial,
        reason: error.message.includes("duplicate")
          ? "Numéro de série déjà existant"
          : error.message,
      });
    } else {
      created.push(serial);
    }
  }

  if (created.length > 0 && input.remplaceNumSerie) {
    await supabase
      .from("velos")
      .update({
        etat: "REFORME",
        motif_reforme: "AMORTI",
        motif_reforme_detail: `Remplacé par ${created[0]}`,
        date_reforme: new Date().toISOString().slice(0, 10),
        id_station: null,
        emplacement_dock: null,
        immatriculation_camion: null,
      })
      .eq("num_serie", input.remplaceNumSerie);
  }

  return { ok: created.length > 0, created, failures };
}

export async function updateVeloAction(input: {
  numSerie: string;
  couleur: string;
  couleurHex: string;
  idType: number;
  idFournisseur: number;
  dateAcquisition: string;
  idStation: number | null;
}) {
  await requireRole(["RESPONSABLE"]);
  const supabase = getSupabaseAdmin();

  const { data: velo } = await supabase
    .from("velos")
    .select("*")
    .eq("num_serie", input.numSerie)
    .single();

  if (!velo) return { ok: false, error: "Vélo introuvable." };
  if (velo.etat === "LOUE") {
    return {
      ok: false,
      error: "Impossible de modifier un vélo actuellement en cours de location.",
    };
  }
  if (velo.etat === "REFORME") {
    return {
      ok: false,
      error: "Impossible de modifier un vélo réformé.",
    };
  }

  let nextStationId = velo.id_station;
  let nextDock = velo.emplacement_dock;

  if (!velo.immatriculation_camion && input.idStation !== velo.id_station) {
    if (input.idStation === null) {
      nextStationId = null;
      nextDock = null;
    } else {
      const { data: st } = await supabase
        .from("stations")
        .select("capacite, nb_velos_actuel")
        .eq("id_station", input.idStation)
        .single();
      if (!st) return { ok: false, error: "Station introuvable." };
      if (st.nb_velos_actuel >= st.capacite) {
        return {
          ok: false,
          error: "La station sélectionnée est pleine.",
        };
      }
      nextStationId = input.idStation;
      nextDock = st.nb_velos_actuel + 1;
    }
  }

  const { error } = await supabase
    .from("velos")
    .update({
      couleur: input.couleur,
      couleur_hex: input.couleurHex,
      id_type: input.idType,
      id_fournisseur: input.idFournisseur,
      date_acquisition: input.dateAcquisition,
      id_station: velo.immatriculation_camion ? null : nextStationId,
      emplacement_dock: velo.immatriculation_camion ? null : nextDock,
    })
    .eq("num_serie", input.numSerie);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteVeloAction(numSerie: string) {
  await requireRole(["RESPONSABLE"]);
  const supabase = getSupabaseAdmin();

  const { data: velo } = await supabase
    .from("velos")
    .select("etat")
    .eq("num_serie", numSerie)
    .single();

  if (!velo) return { ok: false, error: "Vélo introuvable." };
  if (velo.etat === "LOUE") {
    return {
      ok: false,
      error: "Impossible de supprimer un vélo en cours de location.",
    };
  }

  const [{ count: locs }, { count: recs }, { count: ctrls }] = await Promise.all([
    supabase
      .from("locations")
      .select("*", { count: "exact", head: true })
      .eq("num_serie", numSerie),
    supabase
      .from("reclamations")
      .select("*", { count: "exact", head: true })
      .eq("num_serie", numSerie),
    supabase
      .from("controles_journaliers")
      .select("*", { count: "exact", head: true })
      .eq("num_serie", numSerie),
  ]);

  if ((locs ?? 0) > 0 || (recs ?? 0) > 0 || (ctrls ?? 0) > 0) {
    return {
      ok: false,
      error: `Suppression refusée : ce vélo est lié à ${locs ?? 0} location(s), ${recs ?? 0} réclamation(s) et ${ctrls ?? 0} contrôle(s). Utilisez « Réformer ce vélo ».`,
    };
  }

  const { error } = await supabase
    .from("velos")
    .delete()
    .eq("num_serie", numSerie);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function reformerVeloAction(input: {
  numSerie: string;
  motif: MotifReforme;
  detail: string;
  dateReforme: string;
}) {
  await requireRole(["RESPONSABLE"]);
  const supabase = getSupabaseAdmin();

  const { data: velo } = await supabase
    .from("velos")
    .select("*")
    .eq("num_serie", input.numSerie)
    .single();

  if (!velo) return { ok: false, error: "Vélo introuvable." };
  if (velo.etat === "LOUE") {
    return {
      ok: false,
      error: "Impossible de réformer un vélo en cours de location. Attendez la fin de la location.",
    };
  }
  if (velo.etat === "EN_REPARATION") {
    return {
      ok: false,
      error: "Une réparation est en cours sur ce vélo. Clôturez-la ou annulez-la d'abord.",
    };
  }

  const { error } = await supabase
    .from("velos")
    .update({
      etat: "REFORME",
      motif_reforme: input.motif,
      motif_reforme_detail: input.detail.trim() || null,
      date_reforme: input.dateReforme,
      id_station: null,
      emplacement_dock: null,
      immatriculation_camion: null,
    })
    .eq("num_serie", input.numSerie);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function planifierReparationAction(input: {
  idReclamation: number;
  matriculeTechnicien: number;
  datePlanifiee: string;
}) {
  await requireRole(["RESPONSABLE"]);
  if (input.datePlanifiee < new Date().toISOString().slice(0, 10)) {
    return { ok: false, error: "La date planifiée ne peut pas être dans le passé." };
  }
  const supabase = getSupabaseAdmin();

  const { data: rec } = await supabase
    .from("reclamations")
    .select("*")
    .eq("id_reclamation", input.idReclamation)
    .single();
  if (!rec) return { ok: false, error: "Réclamation introuvable." };

  const { data: existing } = await supabase
    .from("reparations")
    .select("id_reparation")
    .eq("id_reclamation", input.idReclamation)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("reparations")
      .update({
        matricule_technicien: input.matriculeTechnicien,
        date_planifiee: input.datePlanifiee,
      })
      .eq("id_reparation", existing.id_reparation);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("reparations").insert({
      id_reclamation: input.idReclamation,
      matricule_technicien: input.matriculeTechnicien,
      date_planifiee: input.datePlanifiee,
      statut: "PLANIFIEE",
    });
    if (error) return { ok: false, error: error.message };
  }

  await supabase
    .from("reclamations")
    .update({ traitee: true })
    .eq("id_reclamation", input.idReclamation);

  await supabase
    .from("velos")
    .update({ etat: "EN_REPARATION" })
    .eq("num_serie", rec.num_serie);

  return { ok: true };
}

export async function rouvrirReparationAction(idReparation: number) {
  await requireRole(["RESPONSABLE"]);
  const supabase = getSupabaseAdmin();
  const { data: rep } = await supabase
    .from("reparations")
    .select("*, reclamations(num_serie)")
    .eq("id_reparation", idReparation)
    .single();
  if (!rep) return { ok: false, error: "Réparation introuvable." };

  await supabase
    .from("reparations")
    .update({ statut: "PLANIFIEE", date_realisation: null })
    .eq("id_reparation", idReparation);

  const numSerie = (rep.reclamations as { num_serie?: string } | null)?.num_serie;
  if (numSerie) {
    await supabase
      .from("velos")
      .update({ etat: "EN_PANNE" })
      .eq("num_serie", numSerie);
  }
  return { ok: true };
}

async function validateMissionResources(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  params: {
    matriculeTechnicien: number;
    immatriculationCamion: string;
    dateMission: string;
    excludeOrdreId?: number;
  }
): Promise<{ ok: true; truckCap: number } | { ok: false; error: string }> {
  const [{ data: tech }, { data: cam }, { data: activeOrders }] =
    await Promise.all([
      supabase
        .from("personnel")
        .select("matricule, role, actif")
        .eq("matricule", params.matriculeTechnicien)
        .maybeSingle(),
      supabase
        .from("camions")
        .select("immatriculation, capacite, disponible")
        .eq("immatriculation", params.immatriculationCamion)
        .maybeSingle(),
      supabase
        .from("ordres_mission")
        .select("id_ordre, matricule_technicien, immatriculation_camion")
        .eq("date_mission", params.dateMission)
        .in("statut", ["NON_DEMARRE", "EN_COURS"]),
    ]);

  if (!tech || tech.role !== "TECHNICIEN" || !tech.actif) {
    return {
      ok: false,
      error: "Technicien introuvable ou indisponible (inactif).",
    };
  }
  if (!cam) {
    return { ok: false, error: "Camion introuvable." };
  }
  if (!cam.disponible) {
    return {
      ok: false,
      error: `Le camion ${cam.immatriculation} est actuellement indisponible.`,
    };
  }

  const conflicts = (activeOrders ?? []).filter(
    (o) => o.id_ordre !== params.excludeOrdreId
  );
  if (
    conflicts.some((o) => o.matricule_technicien === params.matriculeTechnicien)
  ) {
    return {
      ok: false,
      error:
        "Ce technicien a déjà une mission active prévue à cette date. Choisissez un autre technicien.",
    };
  }
  if (
    conflicts.some((o) => o.immatriculation_camion === params.immatriculationCamion)
  ) {
    return {
      ok: false,
      error: `Le camion ${cam.immatriculation} est déjà affecté à une mission active à cette date. Choisissez un autre camion.`,
    };
  }

  return { ok: true, truckCap: cam.capacite ?? 12 };
}

export async function createItineraireEtMissionAction(input: {
  dateItineraire: string;
  brouillon: boolean;
  etapes: { action: "PRENDRE" | "DEPOSER"; idStation: number; nbVelos: number }[];
  mission?: {
    matriculeTechnicien: number;
    immatriculationCamion: string;
  };
}) {
  const session = await requireRole(["RESPONSABLE"]);
  if (input.etapes.length === 0) {
    return { ok: false, error: "Au moins une étape est requise." };
  }

  const supabase = getSupabaseAdmin();

  let truckCap = 999;
  if (input.mission) {
    const resCheck = await validateMissionResources(supabase, {
      matriculeTechnicien: input.mission.matriculeTechnicien,
      immatriculationCamion: input.mission.immatriculationCamion,
      dateMission: input.dateItineraire,
    });
    if (!resCheck.ok) {
      return { ok: false, error: resCheck.error };
    }
    truckCap = resCheck.truckCap;
  }

  // Simulation étape par étape : vérifie qu'aucune station ne passe < 0 ou > capacité
  const { data: stationsRows } = await supabase
    .from("stations")
    .select("id_station, nom, capacite, nb_velos_actuel");
  const stationMap = new Map(
    (stationsRows ?? []).map((s) => [s.id_station, { ...s }])
  );

  let truckLoad = 0;

  for (let i = 0; i < input.etapes.length; i++) {
    const step = input.etapes[i];
    const st = stationMap.get(step.idStation);
    if (!st) {
      return { ok: false, error: `Étape ${i + 1} : station introuvable.` };
    }
    if (step.nbVelos <= 0) {
      return { ok: false, error: `Étape ${i + 1} : quantité invalide.` };
    }

    if (step.action === "PRENDRE") {
      if (st.nb_velos_actuel < step.nbVelos) {
        return {
          ok: false,
          error: `Étape ${i + 1} (${st.nom}) : impossible de prendre ${step.nbVelos} vélo(s), seulement ${st.nb_velos_actuel}/${st.capacite} disponible(s).`,
        };
      }
      if (truckLoad + step.nbVelos > truckCap) {
        return {
          ok: false,
          error: `Étape ${i + 1} : capacité du camion (${truckCap} vélos) dépassée.`,
        };
      }
      st.nb_velos_actuel -= step.nbVelos;
      truckLoad += step.nbVelos;
    } else {
      const freeSlots = st.capacite - st.nb_velos_actuel;
      if (freeSlots < step.nbVelos) {
        return {
          ok: false,
          error: `Étape ${i + 1} (${st.nom}) : impossible de déposer ${step.nbVelos} vélo(s), seulement ${freeSlots} place(s) libre(s) (${st.nb_velos_actuel}/${st.capacite}).`,
        };
      }
      if (truckLoad < step.nbVelos) {
        return {
          ok: false,
          error: `Étape ${i + 1} (${st.nom}) : le camion n'a que ${truckLoad} vélo(s) à bord pour un dépôt de ${step.nbVelos}.`,
        };
      }
      st.nb_velos_actuel += step.nbVelos;
      truckLoad -= step.nbVelos;
    }
  }

  const taken = input.etapes
    .filter((e) => e.action === "PRENDRE")
    .reduce((acc, e) => acc + e.nbVelos, 0);
  const dropped = input.etapes
    .filter((e) => e.action === "DEPOSER")
    .reduce((acc, e) => acc + e.nbVelos, 0);

  if (!input.brouillon && taken !== dropped) {
    return {
      ok: false,
      error: `Déséquilibre : ${taken} vélos pris ≠ ${dropped} vélos déposés.`,
    };
  }

  const { data: it, error: itErr } = await supabase
    .from("itineraires")
    .insert({
      date_itineraire: input.dateItineraire,
      matricule_responsable: session.matricule,
      brouillon: input.brouillon,
    })
    .select()
    .single();

  if (itErr || !it) {
    return { ok: false, error: itErr?.message ?? "Erreur création itinéraire" };
  }

  const rows = input.etapes.map((e, idx) => ({
    id_itineraire: it.id_itineraire,
    ordre: idx + 1,
    action: e.action,
    id_station: e.idStation,
    nb_velos: e.nbVelos,
  }));

  const { error: etErr } = await supabase.from("etapes_itineraire").insert(rows);
  if (etErr) return { ok: false, error: etErr.message };

  if (input.mission) {
    const { error: omErr } = await supabase.from("ordres_mission").insert({
      id_itineraire: it.id_itineraire,
      matricule_technicien: input.mission.matriculeTechnicien,
      immatriculation_camion: input.mission.immatriculationCamion,
      matricule_responsable: session.matricule,
      date_mission: input.dateItineraire,
      statut: "NON_DEMARRE",
    });
    if (omErr) return { ok: false, error: omErr.message };
  }

  return { ok: true, idItineraire: it.id_itineraire };
}

export async function updateOrdreMissionAction(input: {
  idOrdre: number;
  matriculeTechnicien: number;
  immatriculationCamion: string;
  dateMission: string;
  statut: "NON_DEMARRE" | "EN_COURS" | "TERMINE" | "ANNULE";
}) {
  await requireRole(["RESPONSABLE"]);
  const supabase = getSupabaseAdmin();
  if (input.statut === "NON_DEMARRE" || input.statut === "EN_COURS") {
    const resCheck = await validateMissionResources(supabase, {
      matriculeTechnicien: input.matriculeTechnicien,
      immatriculationCamion: input.immatriculationCamion,
      dateMission: input.dateMission,
      excludeOrdreId: input.idOrdre,
    });
    if (!resCheck.ok) {
      return { ok: false, error: resCheck.error };
    }
  }
  const { error } = await supabase
    .from("ordres_mission")
    .update({
      matricule_technicien: input.matriculeTechnicien,
      immatriculation_camion: input.immatriculationCamion,
      date_mission: input.dateMission,
      statut: input.statut,
    })
    .eq("id_ordre", input.idOrdre);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteOrdreMissionAction(idOrdre: number) {
  await requireRole(["RESPONSABLE"]);
  const supabase = getSupabaseAdmin();
  const { data: om } = await supabase
    .from("ordres_mission")
    .select("statut")
    .eq("id_ordre", idOrdre)
    .single();
  if (om?.statut === "EN_COURS") {
    return {
      ok: false,
      error: "Impossible de supprimer un ordre de mission en cours d'exécution.",
    };
  }
  const { error } = await supabase
    .from("ordres_mission")
    .delete()
    .eq("id_ordre", idOrdre);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function toggleCamionDisponibleAction(
  immatriculation: string,
  disponible: boolean
) {
  await requireRole(["RESPONSABLE"]);
  const supabase = getSupabaseAdmin();
  if (!disponible) {
    const { count } = await supabase
      .from("velos")
      .select("*", { count: "exact", head: true })
      .eq("immatriculation_camion", immatriculation);
    if ((count ?? 0) > 0) {
      return {
        ok: false,
        error: `Impossible : ${count} vélo(s) sont actuellement à bord de ce camion. Déchargez-les d'abord.`,
      };
    }
  }
  const { error } = await supabase
    .from("camions")
    .update({ disponible })
    .eq("immatriculation", immatriculation);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function createCamionAction(input: {
  immatriculation: string;
  modele: string;
  capacite: number;
  kilometrage: number;
  idEntrepot: number | null;
}) {
  await requireRole(["RESPONSABLE"]);
  if (!/^[0-9]{1,3} TUN [0-9]{1,4}$/.test(input.immatriculation.trim())) {
    return { ok: false, error: "Format tunisien requis (ex: 123 TUN 4567)." };
  }
  if (input.capacite < 1) {
    return { ok: false, error: "Capacité minimale : 1 vélo." };
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("camions")
    .insert({
      immatriculation: input.immatriculation.trim(),
      modele: input.modele.trim() || "Renault Master",
      capacite: input.capacite,
      kilometrage: Math.max(0, input.kilometrage),
      disponible: true,
      id_entrepot: input.idEntrepot,
    })
    .select()
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, camion: data };
}

export async function updateCamionAction(input: {
  immatriculation: string;
  modele: string;
  capacite: number;
  kilometrage: number;
  idEntrepot: number | null;
  disponible: boolean;
}) {
  await requireRole(["RESPONSABLE"]);
  const supabase = getSupabaseAdmin();
  const { count } = await supabase
    .from("velos")
    .select("*", { count: "exact", head: true })
    .eq("immatriculation_camion", input.immatriculation);

  if (!input.disponible && (count ?? 0) > 0) {
    return {
      ok: false,
      error: `Impossible : ${count} vélo(s) sont à bord de ce camion.`,
    };
  }
  if (input.capacite < (count ?? 0)) {
    return {
      ok: false,
      error: `Capacité inférieure au nombre de vélos à bord (${count}).`,
    };
  }

  const { error } = await supabase
    .from("camions")
    .update({
      modele: input.modele.trim() || "Renault Master",
      capacite: input.capacite,
      kilometrage: Math.max(0, input.kilometrage),
      id_entrepot: input.idEntrepot,
      disponible: input.disponible,
    })
    .eq("immatriculation", input.immatriculation);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteCamionAction(immatriculation: string) {
  await requireRole(["RESPONSABLE"]);
  const supabase = getSupabaseAdmin();
  const [{ count: bikes }, { count: missions }] = await Promise.all([
    supabase
      .from("velos")
      .select("*", { count: "exact", head: true })
      .eq("immatriculation_camion", immatriculation),
    supabase
      .from("ordres_mission")
      .select("*", { count: "exact", head: true })
      .eq("immatriculation_camion", immatriculation),
  ]);
  if ((bikes ?? 0) > 0 || (missions ?? 0) > 0) {
    return {
      ok: false,
      error: `Suppression refusée : ce camion est lié à ${bikes ?? 0} vélo(s) et ${missions ?? 0} mission(s).`,
    };
  }
  const { error } = await supabase
    .from("camions")
    .delete()
    .eq("immatriculation", immatriculation);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function createAbonneAction(input: {
  nom: string;
  prenom: string;
  cin: string;
  tel: string;
  dateExpiration: string;
}) {
  await requireRole(["RESPONSABLE"]);
  if (!/^[0-9]{8}$/.test(input.cin)) {
    return { ok: false, error: "Le CIN doit contenir 8 chiffres." };
  }
  if (!/^\+216 [0-9]{2} [0-9]{3} [0-9]{3}$/.test(input.tel)) {
    return { ok: false, error: "Téléphone invalide (+216 XX XXX XXX)." };
  }

  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from("utilisateurs")
    .select("id_utilisateur")
    .eq("cin", input.cin)
    .maybeSingle();

  if (existing) {
    return {
      ok: false,
      error: "Ce CIN est déjà enregistré dans la base.",
    };
  }

  const { data: user, error: uErr } = await supabase
    .from("utilisateurs")
    .insert({
      nom: input.nom.trim(),
      prenom: input.prenom.trim(),
      cin: input.cin,
      tel: input.tel,
      type_utilisateur: "ABONNE",
      date_adhesion: new Date().toISOString().slice(0, 10),
    })
    .select()
    .single();

  if (uErr || !user) return { ok: false, error: uErr?.message ?? "Erreur" };

  const pin = String(Math.floor(1000 + Math.random() * 9000));
  const codeSecretHash = await bcrypt.hash(pin, 10);

  const { data: carte, error: cErr } = await supabase
    .from("cartes_adhesion")
    .insert({
      id_utilisateur: user.id_utilisateur,
      date_emission: new Date().toISOString().slice(0, 10),
      date_expiration: input.dateExpiration,
      code_secret_hash: codeSecretHash,
      active: true,
      bloquee: false,
    })
    .select("num_carte, date_emission, date_expiration")
    .single();

  if (cErr || !carte) return { ok: false, error: cErr?.message ?? "Erreur carte" };

  return { ok: true, user, carte, pinClair: pin };
}

export async function gererCarteAdhesionAction(
  numCarte: number,
  action: "DEBLOQUER" | "DESACTIVER" | "RENOUVELER" | "RESET_PIN"
) {
  await requireRole(["RESPONSABLE"]);
  const supabase = getSupabaseAdmin();

  if (action === "DEBLOQUER") {
    await supabase
      .from("cartes_adhesion")
      .update({ bloquee: false, tentatives_erronees: 0 })
      .eq("num_carte", numCarte);
    return { ok: true };
  }
  if (action === "DESACTIVER") {
    await supabase
      .from("cartes_adhesion")
      .update({ active: false })
      .eq("num_carte", numCarte);
    return { ok: true };
  }
  if (action === "RENOUVELER") {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    await supabase
      .from("cartes_adhesion")
      .update({
        active: true,
        bloquee: false,
        date_expiration: nextYear.toISOString().slice(0, 10),
      })
      .eq("num_carte", numCarte);
    return { ok: true };
  }
  const pin = String(Math.floor(1000 + Math.random() * 9000));
  const codeSecretHash = await bcrypt.hash(pin, 10);
  await supabase
    .from("cartes_adhesion")
    .update({ code_secret_hash: codeSecretHash, bloquee: false, tentatives_erronees: 0 })
    .eq("num_carte", numCarte);
  return { ok: true, pinClair: pin };
}

export async function createPersonnelAction(input: {
  matricule: number;
  nom: string;
  prenom: string;
  tel: string;
  role: RolePersonnel;
  specialite?: string | null;
  password: string;
}) {
  await requireRole(["RESPONSABLE"]);
  if (input.password.length < 6) {
    return { ok: false, error: "Mot de passe temporaire min. 6 caractères." };
  }
  if (input.role === "TECHNICIEN" && !input.specialite?.trim()) {
    return { ok: false, error: "La spécialité est obligatoire pour un technicien." };
  }

  const supabase = getSupabaseAdmin();
  const passwordHash = await bcrypt.hash(input.password, 10);
  const { data, error } = await supabase
    .from("personnel")
    .insert({
      matricule: input.matricule,
      nom: input.nom.trim(),
      prenom: input.prenom.trim(),
      tel: input.tel,
      role: input.role,
      specialite: input.role === "TECHNICIEN" ? input.specialite?.trim() : null,
      password_hash: passwordHash,
      actif: true,
    })
    .select("matricule, nom, prenom, tel, role, specialite, actif")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, person: data };
}

export async function updatePersonnelAction(input: {
  matricule: number;
  nom: string;
  prenom: string;
  tel: string;
  role: RolePersonnel;
  specialite?: string | null;
  newPassword?: string;
}) {
  await requireRole(["RESPONSABLE"]);
  if (!/^\+216 [0-9]{2} [0-9]{3} [0-9]{3}$/.test(input.tel)) {
    return { ok: false, error: "Téléphone invalide (+216 XX XXX XXX)." };
  }
  if (input.role === "TECHNICIEN" && !input.specialite?.trim()) {
    return { ok: false, error: "La spécialité est obligatoire pour un technicien." };
  }
  const supabase = getSupabaseAdmin();
  const updateData: Record<string, unknown> = {
    nom: input.nom.trim(),
    prenom: input.prenom.trim(),
    tel: input.tel,
    role: input.role,
    specialite: input.role === "TECHNICIEN" ? input.specialite?.trim() : null,
  };
  if (input.newPassword && input.newPassword.trim().length >= 6) {
    updateData.password_hash = await bcrypt.hash(input.newPassword.trim(), 10);
  }
  const { error } = await supabase
    .from("personnel")
    .update(updateData)
    .eq("matricule", input.matricule);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deletePersonnelAction(matricule: number) {
  await requireRole(["RESPONSABLE"]);
  const supabase = getSupabaseAdmin();
  const { data: target } = await supabase
    .from("personnel")
    .select("role")
    .eq("matricule", matricule)
    .single();

  if (target?.role === "RESPONSABLE") {
    const { count } = await supabase
      .from("personnel")
      .select("*", { count: "exact", head: true })
      .eq("role", "RESPONSABLE")
      .eq("actif", true);
    if ((count ?? 0) <= 1) {
      return {
        ok: false,
        error: "Impossible de supprimer le dernier Responsable actif.",
      };
    }
  }

  const [{ count: reps }, { count: missions }] = await Promise.all([
    supabase
      .from("reparations")
      .select("*", { count: "exact", head: true })
      .eq("matricule_technicien", matricule),
    supabase
      .from("ordres_mission")
      .select("*", { count: "exact", head: true })
      .eq("matricule_technicien", matricule),
  ]);

  if ((reps ?? 0) > 0 || (missions ?? 0) > 0) {
    return {
      ok: false,
      error: `Suppression refusée : ce membre est lié à ${reps ?? 0} réparation(s) et ${missions ?? 0} mission(s). Désactivez-le plutôt.`,
    };
  }

  const { error } = await supabase
    .from("personnel")
    .delete()
    .eq("matricule", matricule);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function togglePersonnelActifAction(
  matricule: number,
  actif: boolean
) {
  await requireRole(["RESPONSABLE"]);
  const supabase = getSupabaseAdmin();

  if (!actif) {
    const { data: target } = await supabase
      .from("personnel")
      .select("role")
      .eq("matricule", matricule)
      .single();

    if (target?.role === "RESPONSABLE") {
      const { count } = await supabase
        .from("personnel")
        .select("*", { count: "exact", head: true })
        .eq("role", "RESPONSABLE")
        .eq("actif", true);
      if ((count ?? 0) <= 1) {
        return {
          ok: false,
          error: "Impossible de désactiver le dernier Responsable actif.",
        };
      }
    }
  }

  const { error } = await supabase
    .from("personnel")
    .update({ actif })
    .eq("matricule", matricule);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
