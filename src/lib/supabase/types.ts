export type EtatVelo =
  | "DISPONIBLE"
  | "LOUE"
  | "EN_PANNE"
  | "EN_REPARATION"
  | "REFORME";

export type RolePersonnel = "RESPONSABLE" | "TECHNICIEN";

export type StatutReparation = "PLANIFIEE" | "EN_COURS" | "TERMINEE";

export type ActionEtape = "PRENDRE" | "DEPOSER";

export type StatutOrdreMission =
  | "NON_DEMARRE"
  | "EN_COURS"
  | "TERMINE"
  | "ANNULE";

export type TypeUtilisateur = "ABONNE" | "OCCASIONNEL";

export type MotifReforme = "AMORTI" | "ACCIDENT" | "IRREPARABLE" | "AUTRE";

export interface Entrepot {
  id_entrepot: number;
  nom: string;
  adresse: string;
  created_at: string;
}

export interface Station {
  id_station: number;
  nom: string;
  adresse: string;
  capacite: number;
  nb_velos_actuel: number;
  id_entrepot: number | null;
  latitude: number;
  longitude: number;
  map_x: number;
  map_y: number;
  borne_hors_service: boolean;
  lecteur_en_panne: boolean;
  created_at: string;
}

export interface TypeVelo {
  id_type: number;
  libelle: string;
  created_at: string;
}

export interface Fournisseur {
  id_fournisseur: number;
  nom: string;
  adresse: string;
  tel: string;
  archive: boolean;
  created_at: string;
}

export interface Camion {
  immatriculation: string;
  disponible: boolean;
  id_entrepot: number | null;
  created_at: string;
}

export interface Velo {
  num_serie: string;
  couleur: string;
  couleur_hex: string;
  date_acquisition: string;
  etat: EtatVelo;
  motif_reforme: MotifReforme | null;
  motif_reforme_detail: string | null;
  date_reforme: string | null;
  id_type: number;
  id_fournisseur: number;
  id_station: number | null;
  emplacement_dock: number | null;
  immatriculation_camion: string | null;
  remplace_num_serie: string | null;
  created_at: string;
}

export interface Personnel {
  matricule: number;
  nom: string;
  prenom: string;
  tel: string;
  role: RolePersonnel;
  specialite: string | null;
  actif: boolean;
  failed_attempts: number;
  locked_until: string | null;
  created_at: string;
}

export interface Utilisateur {
  id_utilisateur: number;
  nom: string;
  prenom: string;
  cin: string;
  tel: string;
  type_utilisateur: TypeUtilisateur;
  date_adhesion: string | null;
  created_at: string;
}

export interface CarteAdhesion {
  num_carte: number;
  id_utilisateur: number;
  date_emission: string;
  date_expiration: string;
  active: boolean;
  bloquee: boolean;
  tentatives_erronees: number;
  created_at: string;
}

export interface CarteCourteDuree {
  num_carte: number;
  id_utilisateur: number;
  date_emission: string;
  frais_exploitation: number;
  montant_garantie: number;
  retenue: number;
  duree_location_min: number;
  id_station_destination_prevue: number;
  garantie_restituee: boolean;
  active: boolean;
  mode_paiement: string;
  reference_paiement: string;
  created_at: string;
}

export interface LocationRow {
  id_location: number;
  id_utilisateur: number;
  num_serie: string;
  num_carte_adhesion: number | null;
  num_carte_courte_duree: number | null;
  id_station_depart: number;
  id_station_arrivee_reelle: number | null;
  id_station_destination_prevue: number | null;
  date_heure_debut: string;
  date_heure_fin: string | null;
  velo_restitue_en_mauvais_etat: boolean;
  created_at: string;
}

export interface Reclamation {
  id_reclamation: number;
  num_serie: string;
  matricule_technicien: number;
  date_reclamation: string;
  diagnostic: string;
  traitee: boolean;
  photos: string[];
  created_at: string;
}

export interface Reparation {
  id_reparation: number;
  id_reclamation: number;
  matricule_technicien: number;
  date_planifiee: string;
  date_realisation: string | null;
  statut: StatutReparation;
  compte_rendu: string | null;
  pieces_manquantes: boolean;
  created_at: string;
}

export interface Itineraire {
  id_itineraire: number;
  date_itineraire: string;
  matricule_responsable: number;
  brouillon: boolean;
  created_at: string;
}

export interface EtapeItineraire {
  id_etape: number;
  id_itineraire: number;
  ordre: number;
  action: ActionEtape;
  id_station: number;
  nb_velos: number;
  effectuee: boolean;
  nb_velos_reel: number | null;
  motif_ecart: string | null;
}

export interface OrdreMission {
  id_ordre: number;
  id_itineraire: number;
  matricule_technicien: number;
  immatriculation_camion: string;
  matricule_responsable: number;
  date_mission: string;
  statut: StatutOrdreMission;
  created_at: string;
}
