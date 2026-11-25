"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { calcOccasionnelAmounts } from "@/lib/format";

export async function getBorneBootstrapAction(stationId?: number) {
  const supabase = getSupabaseAdmin();

  const [{ data: stations, error: stErr }, { data: types, error: tyErr }] =
    await Promise.all([
      supabase.from("stations").select("*").order("id_station"),
      supabase.from("types_velo").select("*").order("id_type"),
    ]);

  if (stErr || tyErr) {
    return { error: "Impossible de charger les données de la station." };
  }

  const activeStation =
    stations?.find((s) => s.id_station === stationId) ??
    stations?.[0] ??
    null;

  let bikes: Array<Record<string, unknown>> = [];
  if (activeStation) {
    const { data: velos } = await supabase
      .from("velos")
      .select("*, types_velo(libelle)")
      .eq("id_station", activeStation.id_station)
      .eq("etat", "DISPONIBLE")
      .order("num_serie");
    bikes = velos ?? [];
  }

  return {
    stations: stations ?? [],
    types: types ?? [],
    activeStation,
    bikes,
  };
}

export async function verifierCarteAbonneAction(numCarteRaw: string) {
  const numCarte = Number.parseInt(numCarteRaw.trim(), 10);
  if (!Number.isFinite(numCarte) || numCarte <= 0) {
    return { status: "INCONNUE" as const, message: "Carte non reconnue." };
  }

  const supabase = getSupabaseAdmin();
  const { data: carte } = await supabase
    .from("cartes_adhesion")
    .select("*, utilisateurs(id_utilisateur, prenom, nom)")
    .eq("num_carte", numCarte)
    .maybeSingle();

  if (!carte) {
    return {
      status: "INCONNUE" as const,
      message: "Carte non reconnue. Veuillez contacter l'agence CycloSfaxcity.",
    };
  }

  if (carte.bloquee) {
    return {
      status: "BLOQUEE" as const,
      message:
        "Carte bloquée suite à 3 codes erronés. Présentez-vous à l'agence avec votre CIN pour la débloquer.",
    };
  }

  if (!carte.active) {
    return {
      status: "DESACTIVEE" as const,
      message: "Cette carte d'adhésion a été désactivée.",
    };
  }

  if (new Date(carte.date_expiration) < new Date(new Date().toDateString())) {
    return {
      status: "EXPIREE" as const,
      dateExpiration: carte.date_expiration,
      message: `Carte expirée le ${carte.date_expiration}. Renouvelez votre abonnement à l'agence.`,
    };
  }

  const user = Array.isArray(carte.utilisateurs)
    ? carte.utilisateurs[0]
    : carte.utilisateurs;

  return {
    status: "VALIDE" as const,
    numCarte: carte.num_carte,
    prenom: user?.prenom ?? "Abonné",
    tentativesRestantes: Math.max(0, 3 - (carte.tentatives_erronees ?? 0)),
  };
}

export async function verifierCodeSecretAction(numCarte: number, code: string) {
  if (!/^[0-9]{4}$/.test(code)) {
    return { ok: false, error: "Le code secret comporte 4 chiffres." };
  }

  const supabase = getSupabaseAdmin();
  const { data: carte } = await supabase
    .from("cartes_adhesion")
    .select("*")
    .eq("num_carte", numCarte)
    .maybeSingle();

  if (!carte || !carte.active || carte.bloquee) {
    return { ok: false, bloquee: true, error: "Carte indisponible ou bloquée." };
  }

  const normalizedHash = String(carte.code_secret_hash).replace(
    /^\$2y\$/,
    "$2b$"
  );
  const valid = await bcrypt.compare(code, normalizedHash);

  if (!valid) {
    const nextErr = (carte.tentatives_erronees ?? 0) + 1;
    const bloquee = nextErr >= 3;
    await supabase
      .from("cartes_adhesion")
      .update({
        tentatives_erronees: Math.min(3, nextErr),
        bloquee,
      })
      .eq("num_carte", numCarte);

    return {
      ok: false,
      bloquee,
      tentativesRestantes: Math.max(0, 3 - nextErr),
      error: bloquee
        ? "Carte bloquée après 3 tentatives erronées."
        : "Code erroné",
    };
  }

  await supabase
    .from("cartes_adhesion")
    .update({ tentatives_erronees: 0 })
    .eq("num_carte", numCarte);

  // Vérifier si une location est déjà en cours (K4)
  const { data: activeLoc } = await supabase
    .from("locations")
    .select(
      "id_location, num_serie, date_heure_debut, stations!locations_id_station_depart_fkey(nom), velos(couleur, couleur_hex, types_velo(libelle))"
    )
    .eq("id_utilisateur", carte.id_utilisateur)
    .is("date_heure_fin", null)
    .maybeSingle();

  if (activeLoc) {
    return {
      ok: true,
      dejaEnCours: true,
      activeLocation: activeLoc,
    };
  }

  return { ok: true, dejaEnCours: false };
}

export async function demarrerLocationAbonneAction(
  numCarte: number,
  numSerie: string,
  idStation: number
) {
  const supabase = getSupabaseAdmin();
  const { data: velo } = await supabase
    .from("velos")
    .select("emplacement_dock")
    .eq("num_serie", numSerie)
    .maybeSingle();

  const { data, error } = await supabase.rpc("rpc_demarrer_location_abonne", {
    p_num_carte: numCarte,
    p_num_serie: numSerie,
    p_id_station: idStation,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    idLocation: data as number,
    emplacement: velo?.emplacement_dock ?? 1,
  };
}

async function findDefaultTechnicianMatricule(
  supabase: ReturnType<typeof getSupabaseAdmin>
): Promise<number | null> {
  const { data: tech } = await supabase
    .from("personnel")
    .select("matricule")
    .eq("role", "TECHNICIEN")
    .eq("actif", true)
    .order("matricule")
    .limit(1)
    .maybeSingle();
  if (tech?.matricule) return tech.matricule;

  const { data: anyStaff } = await supabase
    .from("personnel")
    .select("matricule")
    .eq("actif", true)
    .order("matricule")
    .limit(1)
    .maybeSingle();
  return anyStaff?.matricule ?? null;
}

export async function signalerVeloMauvaisEtatBorneAction(
  numSerie: string,
  motifs: string[],
  idStation: number
) {
  const supabase = getSupabaseAdmin();
  // Clôturer la location qui vient d'être ouverte sans frais et passer le vélo EN_PANNE
  const { error: restErr } = await supabase.rpc("rpc_restituer_velo", {
    p_num_serie: numSerie,
    p_id_station_arrivee: idStation,
    p_mauvais_etat: true,
    p_retenue: 0,
  });

  if (restErr) {
    return { ok: false, error: restErr.message };
  }

  const techMat = await findDefaultTechnicianMatricule(supabase);
  if (techMat !== null) {
    const diagnostic =
      motifs.length > 0
        ? `Signalement usager à la borne : ${motifs.join(", ")}`
        : "Signalement usager à la borne : vélo en mauvais état";

    await supabase.from("reclamations").insert({
      num_serie: numSerie,
      matricule_technicien: techMat,
      diagnostic,
      traitee: false,
    });
  }

  return { ok: true };
}

export async function verifierCinOccasionnelAction(cin: string) {
  if (!/^[0-9]{8}$/.test(cin)) {
    return { valid: false, error: "Le CIN doit contenir exactement 8 chiffres." };
  }
  const supabase = getSupabaseAdmin();
  const { data: user } = await supabase
    .from("utilisateurs")
    .select("*")
    .eq("cin", cin)
    .maybeSingle();

  if (!user) {
    return { valid: true, known: false };
  }

  const [{ data: activeLoc }, { data: unrefunded }] = await Promise.all([
    supabase
      .from("locations")
      .select("id_location, num_serie")
      .eq("id_utilisateur", user.id_utilisateur)
      .is("date_heure_fin", null)
      .maybeSingle(),
    supabase
      .from("cartes_courte_duree")
      .select("num_carte")
      .eq("id_utilisateur", user.id_utilisateur)
      .eq("garantie_restituee", false)
      .maybeSingle(),
  ]);

  if (activeLoc || unrefunded) {
    return {
      valid: true,
      known: true,
      blocked: true,
      message: activeLoc
        ? `Vous avez déjà le vélo ${activeLoc.num_serie} en cours de location.`
        : `Une garantie (carte #${unrefunded?.num_carte}) est en attente de restitution.`,
    };
  }

  return {
    valid: true,
    known: true,
    blocked: false,
    user: {
      nom: user.nom,
      prenom: user.prenom,
      tel: user.tel,
    },
  };
}

const occasionnelSchema = z.object({
  nom: z.string().min(2, "Nom requis"),
  prenom: z.string().min(2, "Prénom requis"),
  cin: z.string().regex(/^[0-9]{8}$/, "CIN à 8 chiffres requis"),
  tel: z
    .string()
    .regex(/^\+216 [0-9]{2} [0-9]{3} [0-9]{3}$/, "Format +216 XX XXX XXX requis"),
  idStationDepart: z.number().int().positive(),
  idStationDest: z.number().int().positive(),
  dureeMinutes: z.number().int().min(30).max(720),
  modePaiement: z.enum(["CARTE_BANCAIRE", "E_DINAR"]),
  numSerie: z.string().regex(/^VSF-[0-9]{6}$/),
});

export async function demarrerLocationOccasionnelAction(
  rawInput: z.infer<typeof occasionnelSchema>
) {
  const parsed = occasionnelSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides",
    };
  }

  const input = parsed.data;
  const { frais, garantie } = calcOccasionnelAmounts(input.dureeMinutes);
  const referencePaiement = `PAY-${Date.now().toString().slice(-6)}`;

  const supabase = getSupabaseAdmin();
  const { data: velo } = await supabase
    .from("velos")
    .select("emplacement_dock")
    .eq("num_serie", input.numSerie)
    .maybeSingle();

  const { data, error } = await supabase.rpc(
    "rpc_demarrer_location_occasionnel",
    {
      p_nom: input.nom.trim(),
      p_prenom: input.prenom.trim(),
      p_cin: input.cin,
      p_tel: input.tel,
      p_id_station_depart: input.idStationDepart,
      p_id_station_dest: input.idStationDest,
      p_duree_min: input.dureeMinutes,
      p_frais: frais,
      p_garantie: garantie,
      p_mode_paiement: input.modePaiement,
      p_reference_paiement: referencePaiement,
      p_num_serie: input.numSerie,
    }
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    ok: true,
    idLocation: row?.id_location as number,
    numCarte: row?.num_carte as number,
    referencePaiement,
    emplacement: velo?.emplacement_dock ?? 1,
    frais,
    garantie,
  };
}

export async function restituerVeloAction(input: {
  numSerie: string;
  idStationArrivee: number;
  mauvaisEtat: boolean;
  numCarteCourteDuree?: number;
}) {
  const supabase = getSupabaseAdmin();

  const { data: station } = await supabase
    .from("stations")
    .select("*")
    .eq("id_station", input.idStationArrivee)
    .maybeSingle();

  if (!station) {
    return { ok: false, error: "Station introuvable." };
  }

  if (station.nb_velos_actuel >= station.capacite) {
    const { data: alternatives } = await supabase
      .from("stations")
      .select("*")
      .neq("id_station", input.idStationArrivee)
      .order("nb_velos_actuel", { ascending: true })
      .limit(3);

    return {
      ok: false,
      stationPleine: true,
      alternatives: (alternatives ?? []).filter(
        (s) => s.nb_velos_actuel < s.capacite
      ),
      error: "Cette station est pleine.",
    };
  }

  const { data: loc } = await supabase
    .from("locations")
    .select(
      "*, cartes_courte_duree(*), stations!locations_id_station_depart_fkey(nom)"
    )
    .eq("num_serie", input.numSerie.toUpperCase())
    .is("date_heure_fin", null)
    .maybeSingle();

  if (!loc) {
    return {
      ok: false,
      error: `Aucune location en cours trouvée pour le vélo ${input.numSerie}.`,
    };
  }

  const ccd = Array.isArray(loc.cartes_courte_duree)
    ? loc.cartes_courte_duree[0]
    : loc.cartes_courte_duree;

  if (input.numCarteCourteDuree && loc.num_carte_courte_duree !== input.numCarteCourteDuree) {
    return {
      ok: false,
      error: "Le numéro de carte de courte durée ne correspond pas à ce vélo.",
    };
  }

  const elapsedMin = Math.max(
    1,
    Math.floor((Date.now() - new Date(loc.date_heure_debut).getTime()) / 60000)
  );

  let retenue = 0;
  let depassementMin = 0;
  if (ccd) {
    if (elapsedMin > ccd.duree_location_min) {
      depassementMin = elapsedMin - ccd.duree_location_min;
      retenue += Math.min(ccd.montant_garantie, Math.ceil(depassementMin / 15) * 1.0);
    }
    if (input.mauvaisEtat) {
      retenue = Math.min(ccd.montant_garantie, retenue + 10.0);
    }
  }

  const { error } = await supabase.rpc("rpc_restituer_velo", {
    p_num_serie: input.numSerie.toUpperCase(),
    p_id_station_arrivee: input.idStationArrivee,
    p_mauvais_etat: input.mauvaisEtat,
    p_retenue: retenue,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  if (input.mauvaisEtat) {
    const techMat = await findDefaultTechnicianMatricule(supabase);
    if (techMat !== null) {
      await supabase.from("reclamations").insert({
        num_serie: input.numSerie.toUpperCase(),
        matricule_technicien: techMat,
        diagnostic: "Vélo restitué en mauvais état par l'usager.",
        traitee: false,
      });
    }
  }

  const differentStationWarning =
    loc.id_station_destination_prevue &&
    loc.id_station_destination_prevue !== input.idStationArrivee;

  return {
    ok: true,
    elapsedMin,
    stationDepartNom:
      (loc.stations as { nom?: string } | null)?.nom ?? "Station départ",
    stationArriveeNom: station.nom,
    differentStationWarning,
    garantieVersee: ccd ? Number(ccd.montant_garantie) : 0,
    retenue,
    montantRembourse: ccd
      ? Math.max(0, Number(ccd.montant_garantie) - retenue)
      : 0,
    depassementMin,
  };
}
