"use server";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { broadcastVelosfEvent } from "@/lib/realtime-server";

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

  if (!input.bonEtat) {
    await broadcastVelosfEvent({
      audience: "ALL",
      severity: "alert",
      kind: "RECLAMATION_CREATED",
      title: `Nouvelle réclamation #${idReclamation} (${serial})`,
      message: `${session.prenom} ${session.nom} : ${input.diagnostic?.trim() ?? "Panne signalée"}`,
      route: "R9",
    });
  } else {
    await broadcastVelosfEvent({
      audience: "RESPONSABLE",
      severity: "info",
      kind: "SYSTEM_SYNC",
      title: `Contrôle journalier (${serial})`,
      message: `Vélo ${serial} contrôlé en bon état par ${session.prenom} ${session.nom}.`,
      route: "R4",
    });
  }

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
      .eq("etat", "DISPONIBLE")
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

  const hasDiff = Boolean(input.motifEcart?.trim());
  await broadcastVelosfEvent({
    audience: "ALL",
    targetStationId: etape.id_station,
    severity: hasDiff ? "warning" : "info",
    kind: "MISSION_ETAPE_VALIDEE",
    title: hasDiff
      ? `Écart sur mission #${input.idOrdre} (étape ${etape.ordre})`
      : `Étape ${etape.ordre} exécutée (mission #${input.idOrdre})`,
    message: hasDiff
      ? `${etape.action} ${input.nbVelosReel}/${etape.nb_velos} vélo(s) — ${input.motifEcart!.trim()}`
      : `${etape.action} ${input.nbVelosReel} vélo(s) effectuée.`,
    route: "R14",
  });

  return { ok: true };
}

export async function recupererVeloEnPanneMissionAction(input: {
  idOrdre: number;
  numSerie: string;
}) {
  await requireRole(["TECHNICIEN", "RESPONSABLE"]);
  const supabase = getSupabaseAdmin();

  const [{ data: ordre }, { data: velo }] = await Promise.all([
    supabase.from("ordres_mission").select("*").eq("id_ordre", input.idOrdre).single(),
    supabase.from("velos").select("*").eq("num_serie", input.numSerie).single(),
  ]);

  if (!ordre) return { ok: false, error: "Ordre de mission introuvable." };
  if (ordre.statut === "TERMINE" || ordre.statut === "ANNULE") {
    return { ok: false, error: "Cette mission est déjà clôturée ou annulée." };
  }
  if (!velo) return { ok: false, error: "Vélo introuvable." };
  if (velo.etat !== "EN_PANNE" || !velo.id_station) {
    return {
      ok: false,
      error: "Ce vélo n'est pas en panne en station.",
    };
  }

  const [{ data: cam }, { count: aboardCount }] = await Promise.all([
    supabase
      .from("camions")
      .select("capacite")
      .eq("immatriculation", ordre.immatriculation_camion)
      .maybeSingle(),
    supabase
      .from("velos")
      .select("*", { count: "exact", head: true })
      .eq("immatriculation_camion", ordre.immatriculation_camion),
  ]);

  const maxCap = cam?.capacite ?? 12;
  if ((aboardCount ?? 0) >= maxCap) {
    return {
      ok: false,
      error: `Le camion ${ordre.immatriculation_camion} est plein (${aboardCount}/${maxCap}).`,
    };
  }

  if (ordre.statut === "NON_DEMARRE") {
    await supabase
      .from("ordres_mission")
      .update({ statut: "EN_COURS" })
      .eq("id_ordre", input.idOrdre);
  }

  const { error } = await supabase
    .from("velos")
    .update({
      id_station: null,
      emplacement_dock: null,
      immatriculation_camion: ordre.immatriculation_camion,
    })
    .eq("num_serie", input.numSerie);

  if (error) return { ok: false, error: error.message };

  await broadcastVelosfEvent({
    audience: "ALL",
    targetStationId: velo.id_station,
    severity: "info",
    kind: "MISSION_PANNE_RECUPEREE",
    title: `Vélo en panne récupéré (${input.numSerie})`,
    message: `Chargé dans le camion ${ordre.immatriculation_camion} (mission #${input.idOrdre}).`,
    route: "R4",
  });

  return { ok: true };
}

export async function dechargerVeloAtelierAction(input: {
  idOrdre: number;
  numSerie: string;
}) {
  await requireRole(["TECHNICIEN", "RESPONSABLE"]);
  const supabase = getSupabaseAdmin();

  const { data: ordre } = await supabase
    .from("ordres_mission")
    .select("immatriculation_camion")
    .eq("id_ordre", input.idOrdre)
    .single();

  if (!ordre) return { ok: false, error: "Ordre de mission introuvable." };

  const { data: velo } = await supabase
    .from("velos")
    .select("etat, immatriculation_camion")
    .eq("num_serie", input.numSerie)
    .single();

  if (!velo || velo.immatriculation_camion !== ordre.immatriculation_camion) {
    return { ok: false, error: "Ce vélo n'est pas à bord de ce camion." };
  }
  if (velo.etat !== "EN_PANNE" && velo.etat !== "EN_REPARATION") {
    return {
      ok: false,
      error: "Seuls les vélos en panne ou en réparation peuvent être déchargés à l'atelier.",
    };
  }

  const { error } = await supabase
    .from("velos")
    .update({ immatriculation_camion: null })
    .eq("num_serie", input.numSerie);

  if (error) return { ok: false, error: error.message };

  await broadcastVelosfEvent({
    audience: "RESPONSABLE",
    severity: "info",
    kind: "PARC_UPDATED",
    title: `Vélo déchargé à l'atelier (${input.numSerie})`,
    message: `Déchargé du camion ${ordre.immatriculation_camion}.`,
    route: "R4",
  });

  return { ok: true };
}

export async function cloturerMissionAction(idOrdre: number) {
  const session = await requireRole(["TECHNICIEN", "RESPONSABLE"]);
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("ordres_mission")
    .update({ statut: "TERMINE" })
    .eq("id_ordre", idOrdre);
  if (error) return { ok: false, error: error.message };

  await broadcastVelosfEvent({
    audience: "RESPONSABLE",
    severity: "success",
    kind: "MISSION_CLOTUREE",
    title: `Mission #${idOrdre} clôturée`,
    message: `Terminée par ${session.prenom} ${session.nom}.`,
    route: "R14",
  });

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

  await broadcastVelosfEvent({
    audience: "RESPONSABLE",
    severity: "info",
    kind: "REPARATION_DEMARREE",
    title: `Réparation #${idReparation} démarrée`,
    message: `${session.prenom} ${session.nom} a commencé l'intervention.`,
    route: "R11",
  });

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

    await broadcastVelosfEvent({
      audience: "RESPONSABLE",
      severity: "warning",
      kind: "REPARATION_CLOTUREE",
      title: `Pièces manquantes — Réparation #${input.idReparation}`,
      message: `${numSerie ?? "Vélo"} : ${input.compteRendu.trim()}`,
      route: "R11",
    });

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

  await broadcastVelosfEvent({
    audience: "ALL",
    severity: input.outcome === "REPARE" ? "success" : "alert",
    kind: "REPARATION_CLOTUREE",
    title:
      input.outcome === "REPARE"
        ? `Vélo réparé et remis en service (${numSerie ?? `#${input.idReparation}`})`
        : `Vélo déclaré irréparable (${numSerie ?? `#${input.idReparation}`})`,
    message: input.compteRendu.trim(),
    route: input.outcome === "REPARE" ? "R11" : "R3",
  });

  return { ok: true };
}
