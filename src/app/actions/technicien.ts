"use server";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

export async function getTechnicienBootstrapAction() {
  const session = await requireRole(["TECHNICIEN", "RESPONSABLE"]);
  const supabase = getSupabaseAdmin();

  const [
    stations,
    velos,
    types,
    camions,
    reclamations,
    reparations,
    ordresMission,
    itineraires,
    etapes,
    controles,
  ] = await Promise.all([
    supabase.from("stations").select("*").order("id_station"),
    supabase.from("velos").select("*").order("num_serie"),
    supabase.from("types_velo").select("*"),
    supabase.from("camions").select("*"),
    supabase.from("reclamations").select("*").order("date_reclamation", { ascending: false }),
    supabase
      .from("reparations")
      .select("*")
      .eq("matricule_technicien", session.matricule)
      .order("date_planifiee"),
    supabase
      .from("ordres_mission")
      .select("*")
      .eq("matricule_technicien", session.matricule)
      .order("date_mission", { ascending: false }),
    supabase.from("itineraires").select("*"),
    supabase.from("etapes_itineraire").select("*").order("ordre"),
    supabase
      .from("controles_journaliers")
      .select("*")
      .eq("date_controle", new Date().toISOString().slice(0, 10)),
  ]);

  return {
    session,
    stations: stations.data ?? [],
    velos: velos.data ?? [],
    types: types.data ?? [],
    camions: camions.data ?? [],
    reclamations: reclamations.data ?? [],
    reparations: reparations.data ?? [],
    ordresMission: ordresMission.data ?? [],
    itineraires: itineraires.data ?? [],
    etapes: etapes.data ?? [],
    controlesAujourdhui: controles.data ?? [],
  };
}

export async function enregistrerControleJournalierAction(input: {
  numSerie: string;
  bonEtat: boolean;
  diagnostic?: string;
}) {
  const session = await requireRole(["TECHNICIEN", "RESPONSABLE"]);
  const supabase = getSupabaseAdmin();
  const serial = input.numSerie.trim().toUpperCase();

  const { data: velo } = await supabase
    .from("velos")
    .select("*")
    .eq("num_serie", serial)
    .maybeSingle();

  if (!velo) return { ok: false, error: `Vélo ${serial} introuvable.` };
  if (velo.etat === "LOUE") {
    return { ok: false, error: "Ce vélo est actuellement en cours de location." };
  }
  if (velo.etat === "REFORME") {
    return { ok: false, error: "Ce vélo est réformé et hors service." };
  }

  let idReclamation: number | null = null;
  if (!input.bonEtat) {
    if (!input.diagnostic || input.diagnostic.trim().length < 3) {
      return { ok: false, error: "Un diagnostic est obligatoire." };
    }
    const { data: rec, error: recErr } = await supabase
      .from("reclamations")
      .insert({
        num_serie: serial,
        matricule_technicien: session.matricule,
        diagnostic: input.diagnostic.trim(),
        traitee: false,
      })
      .select()
      .single();

    if (recErr) return { ok: false, error: recErr.message };
    idReclamation = rec.id_reclamation;

    await supabase
      .from("velos")
      .update({ etat: "EN_PANNE" })
      .eq("num_serie", serial);
  }

  const today = new Date().toISOString().slice(0, 10);
  const { error: ctrlErr } = await supabase
    .from("controles_journaliers")
    .upsert(
      {
        num_serie: serial,
        matricule_technicien: session.matricule,
        date_controle: today,
        bon_etat: input.bonEtat,
        id_reclamation: idReclamation,
      },
      { onConflict: "num_serie,date_controle" }
    );

  if (ctrlErr) return { ok: false, error: ctrlErr.message };
  return { ok: true, idReclamation };
}

export async function executerEtapeMissionAction(input: {
  idOrdre: number;
  idEtape: number;
  nbVelosReel: number;
  motifEcart?: string;
}) {
  await requireRole(["TECHNICIEN", "RESPONSABLE"]);
  const supabase = getSupabaseAdmin();

  const [{ data: ordre }, { data: etape }] = await Promise.all([
    supabase.from("ordres_mission").select("*").eq("id_ordre", input.idOrdre).single(),
    supabase.from("etapes_itineraire").select("*").eq("id_etape", input.idEtape).single(),
  ]);

  if (!ordre || !etape) return { ok: false, error: "Étape ou mission introuvable." };

  if (ordre.statut === "NON_DEMARRE") {
    await supabase
      .from("ordres_mission")
      .update({ statut: "EN_COURS" })
      .eq("id_ordre", input.idOrdre);
  }

  if (etape.action === "PRENDRE" && input.nbVelosReel > 0) {
    const { data: stationBikes } = await supabase
      .from("velos")
      .select("num_serie")
      .eq("id_station", etape.id_station)
      .eq("etat", "DISPONIBLE")
      .limit(input.nbVelosReel);

    for (const b of stationBikes ?? []) {
      await supabase
        .from("velos")
        .update({
          id_station: null,
          emplacement_dock: null,
          immatriculation_camion: ordre.immatriculation_camion,
        })
        .eq("num_serie", b.num_serie);
    }
  } else if (etape.action === "DEPOSER" && input.nbVelosReel > 0) {
    const { data: truckBikes } = await supabase
      .from("velos")
      .select("num_serie")
      .eq("immatriculation_camion", ordre.immatriculation_camion)
      .limit(input.nbVelosReel);

    for (let i = 0; i < (truckBikes?.length ?? 0); i++) {
      await supabase
        .from("velos")
        .update({
          id_station: etape.id_station,
          immatriculation_camion: null,
          emplacement_dock: i + 1,
        })
        .eq("num_serie", truckBikes![i].num_serie);
    }
  }

  await supabase
    .from("etapes_itineraire")
    .update({
      effectuee: true,
      nb_velos_reel: input.nbVelosReel,
      motif_ecart: input.motifEcart?.trim() || null,
    })
    .eq("id_etape", input.idEtape);

  return { ok: true };
}

export async function cloturerMissionAction(idOrdre: number) {
  await requireRole(["TECHNICIEN", "RESPONSABLE"]);
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("ordres_mission")
    .update({ statut: "TERMINE" })
    .eq("id_ordre", idOrdre);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function demarrerReparationAction(idReparation: number) {
  const session = await requireRole(["TECHNICIEN", "RESPONSABLE"]);
  const supabase = getSupabaseAdmin();
  const { data: rep } = await supabase
    .from("reparations")
    .select("*")
    .eq("id_reparation", idReparation)
    .single();
  if (!rep || rep.matricule_technicien !== session.matricule) {
    return { ok: false, error: "Réparation non attribuée à votre matricule." };
  }
  await supabase
    .from("reparations")
    .update({ statut: "EN_COURS" })
    .eq("id_reparation", idReparation);
  return { ok: true };
}

export async function cloturerReparationAction(input: {
  idReparation: number;
  compteRendu: string;
  outcome: "REPARE" | "IRREPARABLE" | "PIECES_MANQUANTES";
}) {
  const session = await requireRole(["TECHNICIEN", "RESPONSABLE"]);
  if (input.compteRendu.trim().length < 15) {
    return { ok: false, error: "Le compte rendu doit contenir au moins 15 caractères." };
  }
  const supabase = getSupabaseAdmin();
  const { data: rep } = await supabase
    .from("reparations")
    .select("*, reclamations(num_serie)")
    .eq("id_reparation", input.idReparation)
    .single();

  if (!rep || rep.matricule_technicien !== session.matricule) {
    return { ok: false, error: "Réparation non attribuée à votre matricule." };
  }

  const numSerie = (rep.reclamations as { num_serie?: string } | null)?.num_serie;

  if (input.outcome === "PIECES_MANQUANTES") {
    await supabase
      .from("reparations")
      .update({
        pieces_manquantes: true,
        compte_rendu: input.compteRendu.trim(),
      })
      .eq("id_reparation", input.idReparation);
    return { ok: true };
  }

  await supabase
    .from("reparations")
    .update({
      statut: "TERMINEE",
      date_realisation: new Date().toISOString().slice(0, 10),
      compte_rendu: input.compteRendu.trim(),
    })
    .eq("id_reparation", input.idReparation);

  if (numSerie) {
    await supabase
      .from("velos")
      .update({
        etat: input.outcome === "REPARE" ? "DISPONIBLE" : "EN_PANNE",
      })
      .eq("num_serie", numSerie);
  }

  return { ok: true };
}
