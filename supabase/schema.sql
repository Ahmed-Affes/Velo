-- ============================================================================
-- VéloSf — Schéma Complet PostgreSQL / Supabase
-- Système de gestion de vélos en libre-service (CycloSfaxcity, Sfax)
-- Conforme aux diagrammes UML (VeloSf_Diagrammes_UML.pdf), au sujet (VELOSF_MCO.pdf)
-- et aux règles métier de l'application.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. ÉNUMÉRATIONS
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE etat_velo AS ENUM ('DISPONIBLE', 'LOUE', 'EN_PANNE', 'EN_REPARATION', 'REFORME');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE role_personnel AS ENUM ('RESPONSABLE', 'TECHNICIEN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE statut_reparation AS ENUM ('PLANIFIEE', 'EN_COURS', 'TERMINEE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE action_etape AS ENUM ('PRENDRE', 'DEPOSER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE statut_ordre_mission AS ENUM ('NON_DEMARRE', 'EN_COURS', 'TERMINE', 'ANNULE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE type_utilisateur AS ENUM ('ABONNE', 'OCCASIONNEL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE motif_reforme AS ENUM ('AMORTI', 'ACCIDENT', 'IRREPARABLE', 'AUTRE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. TABLES DE RÉFÉRENCE & INFRASTRUCTURE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS entrepots (
  id_entrepot SERIAL PRIMARY KEY,
  nom VARCHAR(120) NOT NULL,
  adresse VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stations (
  id_station SERIAL PRIMARY KEY,
  nom VARCHAR(120) NOT NULL,
  adresse VARCHAR(255) NOT NULL UNIQUE,
  capacite INT NOT NULL CHECK (capacite > 0),
  nb_velos_actuel INT NOT NULL DEFAULT 0 CHECK (nb_velos_actuel >= 0 AND nb_velos_actuel <= capacite),
  id_entrepot INT REFERENCES entrepots(id_entrepot) ON DELETE RESTRICT,
  latitude DOUBLE PRECISION NOT NULL DEFAULT 34.7406,
  longitude DOUBLE PRECISION NOT NULL DEFAULT 10.7603,
  map_x INT NOT NULL DEFAULT 50,
  map_y INT NOT NULL DEFAULT 50,
  borne_hors_service BOOLEAN NOT NULL DEFAULT FALSE,
  lecteur_en_panne BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS types_velo (
  id_type SERIAL PRIMARY KEY,
  libelle VARCHAR(80) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fournisseurs (
  id_fournisseur SERIAL PRIMARY KEY,
  nom VARCHAR(150) NOT NULL,
  adresse VARCHAR(255) NOT NULL,
  tel VARCHAR(20) NOT NULL CHECK (tel ~ '^\+216 [0-9]{2} [0-9]{3} [0-9]{3}$'),
  archive BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS camions (
  immatriculation VARCHAR(20) PRIMARY KEY CHECK (immatriculation ~ '^[0-9]{1,3} TUN [0-9]{1,4}$'),
  disponible BOOLEAN NOT NULL DEFAULT TRUE,
  id_entrepot INT REFERENCES entrepots(id_entrepot) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. PARC DE VÉLOS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS velos (
  num_serie VARCHAR(24) PRIMARY KEY CHECK (num_serie ~ '^VSF-[0-9]{6}$'),
  couleur VARCHAR(60) NOT NULL,
  couleur_hex VARCHAR(7) NOT NULL DEFAULT '#0E5A6B',
  date_acquisition DATE NOT NULL DEFAULT CURRENT_DATE CHECK (date_acquisition <= CURRENT_DATE),
  etat etat_velo NOT NULL DEFAULT 'DISPONIBLE',
  motif_reforme motif_reforme,
  motif_reforme_detail TEXT,
  date_reforme DATE,
  id_type INT NOT NULL REFERENCES types_velo(id_type) ON DELETE RESTRICT,
  id_fournisseur INT NOT NULL REFERENCES fournisseurs(id_fournisseur) ON DELETE RESTRICT,
  id_station INT REFERENCES stations(id_station) ON DELETE RESTRICT,
  emplacement_dock INT,
  immatriculation_camion VARCHAR(20) REFERENCES camions(immatriculation) ON DELETE RESTRICT,
  remplace_num_serie VARCHAR(24) REFERENCES velos(num_serie) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Un vélo ne peut pas être simultanément en station et dans un camion
  CONSTRAINT chk_velo_localisation_exclusive CHECK (
    NOT (id_station IS NOT NULL AND immatriculation_camion IS NOT NULL)
  ),
  -- Un vélo loué ou réformé n'est ni en station ni dans un camion
  CONSTRAINT chk_velo_etat_localisation CHECK (
    (etat NOT IN ('LOUE', 'REFORME')) OR (id_station IS NULL AND immatriculation_camion IS NULL)
  ),
  -- Un vélo réformé doit avoir un motif et une date de réforme
  CONSTRAINT chk_velo_reforme_fields CHECK (
    (etat <> 'REFORME') OR (motif_reforme IS NOT NULL AND date_reforme IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_velos_station ON velos(id_station) WHERE id_station IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_velos_etat ON velos(etat);

-- 4. PERSONNEL (Responsables & Techniciens)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS personnel (
  matricule INT PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  tel VARCHAR(20) NOT NULL CHECK (tel ~ '^\+216 [0-9]{2} [0-9]{3} [0-9]{3}$'),
  role role_personnel NOT NULL,
  specialite VARCHAR(120),
  password_hash TEXT NOT NULL,
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  failed_attempts INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_tech_specialite CHECK (role <> 'TECHNICIEN' OR (specialite IS NOT NULL AND length(trim(specialite)) > 0))
);

-- 5. UTILISATEURS & CARTES (Abonnés & Occasionnels)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS utilisateurs (
  id_utilisateur SERIAL PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  cin CHAR(8) NOT NULL UNIQUE CHECK (cin ~ '^[0-9]{8}$'),
  tel VARCHAR(20) NOT NULL CHECK (tel ~ '^\+216 [0-9]{2} [0-9]{3} [0-9]{3}$'),
  type_utilisateur type_utilisateur NOT NULL,
  date_adhesion DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_abonne_date CHECK (type_utilisateur <> 'ABONNE' OR date_adhesion IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS cartes_adhesion (
  num_carte SERIAL PRIMARY KEY,
  id_utilisateur INT NOT NULL REFERENCES utilisateurs(id_utilisateur) ON DELETE RESTRICT,
  date_emission DATE NOT NULL DEFAULT CURRENT_DATE,
  date_expiration DATE NOT NULL,
  code_secret_hash TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  bloquee BOOLEAN NOT NULL DEFAULT FALSE,
  tentatives_erronees INT NOT NULL DEFAULT 0 CHECK (tentatives_erronees >= 0 AND tentatives_erronees <= 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_carte_dates CHECK (date_expiration > date_emission)
);

-- Un seul abonnement actif non bloqué par utilisateur
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_carte_abonne
  ON cartes_adhesion(id_utilisateur) WHERE active = TRUE AND bloquee = FALSE;

CREATE TABLE IF NOT EXISTS cartes_courte_duree (
  num_carte SERIAL PRIMARY KEY,
  id_utilisateur INT NOT NULL REFERENCES utilisateurs(id_utilisateur) ON DELETE RESTRICT,
  date_emission TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  frais_exploitation NUMERIC(10,3) NOT NULL CHECK (frais_exploitation >= 0),
  montant_garantie NUMERIC(10,3) NOT NULL CHECK (montant_garantie >= 0),
  retenue NUMERIC(10,3) NOT NULL DEFAULT 0 CHECK (retenue >= 0 AND retenue <= montant_garantie),
  duree_location_min INT NOT NULL CHECK (duree_location_min >= 30 AND duree_location_min <= 720),
  id_station_destination_prevue INT NOT NULL REFERENCES stations(id_station) ON DELETE RESTRICT,
  garantie_restituee BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  mode_paiement VARCHAR(30) NOT NULL DEFAULT 'CARTE_BANCAIRE',
  reference_paiement VARCHAR(40) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. LOCATIONS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS locations (
  id_location SERIAL PRIMARY KEY,
  id_utilisateur INT NOT NULL REFERENCES utilisateurs(id_utilisateur) ON DELETE RESTRICT,
  num_serie VARCHAR(24) NOT NULL REFERENCES velos(num_serie) ON DELETE RESTRICT,
  num_carte_adhesion INT REFERENCES cartes_adhesion(num_carte) ON DELETE RESTRICT,
  num_carte_courte_duree INT REFERENCES cartes_courte_duree(num_carte) ON DELETE RESTRICT,
  id_station_depart INT NOT NULL REFERENCES stations(id_station) ON DELETE RESTRICT,
  id_station_arrivee_reelle INT REFERENCES stations(id_station) ON DELETE RESTRICT,
  id_station_destination_prevue INT REFERENCES stations(id_station) ON DELETE RESTRICT,
  date_heure_debut TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_heure_fin TIMESTAMPTZ,
  velo_restitue_en_mauvais_etat BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_location_carte_exclusive CHECK (
    (num_carte_adhesion IS NOT NULL AND num_carte_courte_duree IS NULL) OR
    (num_carte_adhesion IS NULL AND num_carte_courte_duree IS NOT NULL)
  ),
  CONSTRAINT chk_location_dates CHECK (date_heure_fin IS NULL OR date_heure_fin >= date_heure_debut)
);

-- Règle métier : un utilisateur ne peut avoir qu'une seule location en cours
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_location_en_cours_user
  ON locations(id_utilisateur) WHERE date_heure_fin IS NULL;

-- Règle métier : un vélo ne peut avoir qu'une seule location en cours
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_location_en_cours_velo
  ON locations(num_serie) WHERE date_heure_fin IS NULL;

-- 7. MAINTENANCE : RÉCLAMATIONS, RÉPARATIONS & CONTRÔLES JOURNALIERS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reclamations (
  id_reclamation SERIAL PRIMARY KEY,
  num_serie VARCHAR(24) NOT NULL REFERENCES velos(num_serie) ON DELETE RESTRICT,
  matricule_technicien INT NOT NULL REFERENCES personnel(matricule) ON DELETE RESTRICT,
  date_reclamation TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  diagnostic TEXT NOT NULL CHECK (length(trim(diagnostic)) >= 3),
  traitee BOOLEAN NOT NULL DEFAULT FALSE,
  photos TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reparations (
  id_reparation SERIAL PRIMARY KEY,
  id_reclamation INT NOT NULL UNIQUE REFERENCES reclamations(id_reclamation) ON DELETE RESTRICT,
  matricule_technicien INT NOT NULL REFERENCES personnel(matricule) ON DELETE RESTRICT,
  date_planifiee DATE NOT NULL,
  date_realisation DATE,
  statut statut_reparation NOT NULL DEFAULT 'PLANIFIEE',
  compte_rendu TEXT,
  pieces_manquantes BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_reparation_cloture CHECK (
    statut <> 'TERMINEE' OR (date_realisation IS NOT NULL AND compte_rendu IS NOT NULL AND length(trim(compte_rendu)) >= 15)
  )
);

CREATE TABLE IF NOT EXISTS controles_journaliers (
  id_controle SERIAL PRIMARY KEY,
  num_serie VARCHAR(24) NOT NULL REFERENCES velos(num_serie) ON DELETE RESTRICT,
  matricule_technicien INT NOT NULL REFERENCES personnel(matricule) ON DELETE RESTRICT,
  date_controle DATE NOT NULL DEFAULT CURRENT_DATE,
  bon_etat BOOLEAN NOT NULL,
  id_reclamation INT REFERENCES reclamations(id_reclamation) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (num_serie, date_controle)
);

-- 8. LOGISTIQUE : ITINÉRAIRES, ÉTAPES & ORDRES DE MISSION
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS itineraires (
  id_itineraire SERIAL PRIMARY KEY,
  date_itineraire DATE NOT NULL DEFAULT CURRENT_DATE,
  matricule_responsable INT NOT NULL REFERENCES personnel(matricule) ON DELETE RESTRICT,
  brouillon BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS etapes_itineraire (
  id_etape SERIAL PRIMARY KEY,
  id_itineraire INT NOT NULL REFERENCES itineraires(id_itineraire) ON DELETE CASCADE,
  ordre INT NOT NULL CHECK (ordre >= 1),
  action action_etape NOT NULL,
  id_station INT NOT NULL REFERENCES stations(id_station) ON DELETE RESTRICT,
  nb_velos INT NOT NULL CHECK (nb_velos > 0),
  effectuee BOOLEAN NOT NULL DEFAULT FALSE,
  nb_velos_reel INT,
  motif_ecart TEXT,
  UNIQUE (id_itineraire, ordre)
);

CREATE TABLE IF NOT EXISTS ordres_mission (
  id_ordre SERIAL PRIMARY KEY,
  id_itineraire INT NOT NULL UNIQUE REFERENCES itineraires(id_itineraire) ON DELETE RESTRICT,
  matricule_technicien INT NOT NULL REFERENCES personnel(matricule) ON DELETE RESTRICT,
  immatriculation_camion VARCHAR(20) NOT NULL REFERENCES camions(immatriculation) ON DELETE RESTRICT,
  matricule_responsable INT NOT NULL REFERENCES personnel(matricule) ON DELETE RESTRICT,
  date_mission DATE NOT NULL DEFAULT CURRENT_DATE,
  statut statut_ordre_mission NOT NULL DEFAULT 'NON_DEMARRE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. TRIGGER DE SYNCHRONISATION DU NOMBRE DE VÉLOS PAR STATION
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_sync_station_nb_velos()
RETURNS TRIGGER AS $$
DECLARE
  v_station_id INT;
  v_count INT;
  v_cap INT;
BEGIN
  IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') AND OLD.id_station IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count FROM velos WHERE id_station = OLD.id_station;
    UPDATE stations SET nb_velos_actuel = v_count WHERE id_station = OLD.id_station;
  END IF;

  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.id_station IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count FROM velos WHERE id_station = NEW.id_station;
    SELECT capacite INTO v_cap FROM stations WHERE id_station = NEW.id_station;
    IF v_count > v_cap THEN
      RAISE EXCEPTION 'Capacité de la station % dépassée (% / %)', NEW.id_station, v_count, v_cap;
    END IF;
    UPDATE stations SET nb_velos_actuel = v_count WHERE id_station = NEW.id_station;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_station_nb_velos ON velos;
CREATE TRIGGER trg_sync_station_nb_velos
AFTER INSERT OR UPDATE OF id_station, etat OR DELETE ON velos
FOR EACH ROW EXECUTE FUNCTION fn_sync_station_nb_velos();

-- 10. FONCTIONS ATOMIQUES (RPC) ANTI-CONCURRENCE
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rpc_demarrer_location_abonne(
  p_num_carte INT,
  p_num_serie VARCHAR,
  p_id_station INT
) RETURNS INT AS $$
DECLARE
  v_carte RECORD;
  v_velo RECORD;
  v_loc_id INT;
BEGIN
  SELECT * INTO v_carte FROM cartes_adhesion WHERE num_carte = p_num_carte FOR UPDATE;
  IF NOT FOUND OR NOT v_carte.active OR v_carte.bloquee OR v_carte.date_expiration < CURRENT_DATE THEN
    RAISE EXCEPTION 'Carte d''adhésion invalide, expirée ou bloquée';
  END IF;

  IF EXISTS (SELECT 1 FROM locations WHERE id_utilisateur = v_carte.id_utilisateur AND date_heure_fin IS NULL) THEN
    RAISE EXCEPTION 'L''abonné a déjà une location en cours';
  END IF;

  SELECT * INTO v_velo FROM velos WHERE num_serie = p_num_serie FOR UPDATE;
  IF NOT FOUND OR v_velo.etat <> 'DISPONIBLE' OR v_velo.id_station <> p_id_station THEN
    RAISE EXCEPTION 'Vélo % indisponible dans cette station', p_num_serie;
  END IF;

  UPDATE velos SET etat = 'LOUE', id_station = NULL, emplacement_dock = NULL WHERE num_serie = p_num_serie;

  INSERT INTO locations (id_utilisateur, num_serie, num_carte_adhesion, id_station_depart, date_heure_debut)
  VALUES (v_carte.id_utilisateur, p_num_serie, p_num_carte, p_id_station, NOW())
  RETURNING id_location INTO v_loc_id;

  RETURN v_loc_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION rpc_demarrer_location_occasionnel(
  p_nom VARCHAR,
  p_prenom VARCHAR,
  p_cin CHAR(8),
  p_tel VARCHAR,
  p_id_station_depart INT,
  p_id_station_dest INT,
  p_duree_min INT,
  p_frais NUMERIC,
  p_garantie NUMERIC,
  p_mode_paiement VARCHAR,
  p_reference_paiement VARCHAR,
  p_num_serie VARCHAR
) RETURNS TABLE (id_location INT, num_carte INT) AS $$
DECLARE
  v_user_id INT;
  v_carte_id INT;
  v_velo RECORD;
  v_loc_id INT;
BEGIN
  SELECT id_utilisateur INTO v_user_id FROM utilisateurs WHERE cin = p_cin FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO utilisateurs (nom, prenom, cin, tel, type_utilisateur)
    VALUES (p_nom, p_prenom, p_cin, p_tel, 'OCCASIONNEL')
    RETURNING id_utilisateur INTO v_user_id;
  ELSE
    UPDATE utilisateurs SET nom = p_nom, prenom = p_prenom, tel = p_tel WHERE id_utilisateur = v_user_id;
  END IF;

  IF EXISTS (SELECT 1 FROM locations WHERE id_utilisateur = v_user_id AND date_heure_fin IS NULL) THEN
    RAISE EXCEPTION 'Un vélo est déjà en cours de location pour ce CIN';
  END IF;

  IF EXISTS (SELECT 1 FROM cartes_courte_duree WHERE id_utilisateur = v_user_id AND garantie_restituee = FALSE) THEN
    RAISE EXCEPTION 'Une garantie non restituée existe déjà pour ce CIN';
  END IF;

  SELECT * INTO v_velo FROM velos WHERE num_serie = p_num_serie FOR UPDATE;
  IF NOT FOUND OR v_velo.etat <> 'DISPONIBLE' OR v_velo.id_station <> p_id_station_depart THEN
    RAISE EXCEPTION 'Vélo % indisponible dans cette station', p_num_serie;
  END IF;

  INSERT INTO cartes_courte_duree (
    id_utilisateur, frais_exploitation, montant_garantie, duree_location_min,
    id_station_destination_prevue, mode_paiement, reference_paiement
  ) VALUES (
    v_user_id, p_frais, p_garantie, p_duree_min,
    p_id_station_dest, p_mode_paiement, p_reference_paiement
  ) RETURNING cartes_courte_duree.num_carte INTO v_carte_id;

  UPDATE velos SET etat = 'LOUE', id_station = NULL, emplacement_dock = NULL WHERE num_serie = p_num_serie;

  INSERT INTO locations (
    id_utilisateur, num_serie, num_carte_courte_duree, id_station_depart, id_station_destination_prevue, date_heure_debut
  ) VALUES (
    v_user_id, p_num_serie, v_carte_id, p_id_station_depart, p_id_station_dest, NOW()
  ) RETURNING locations.id_location INTO v_loc_id;

  RETURN QUERY SELECT v_loc_id, v_carte_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION rpc_restituer_velo(
  p_num_serie VARCHAR,
  p_id_station_arrivee INT,
  p_mauvais_etat BOOLEAN DEFAULT FALSE,
  p_retenue NUMERIC DEFAULT 0
) RETURNS INT AS $$
DECLARE
  v_loc RECORD;
  v_station RECORD;
  v_next_dock INT;
BEGIN
  SELECT * INTO v_station FROM stations WHERE id_station = p_id_station_arrivee FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Station introuvable';
  END IF;
  IF v_station.nb_velos_actuel >= v_station.capacite THEN
    RAISE EXCEPTION 'Station pleine';
  END IF;

  SELECT * INTO v_loc FROM locations WHERE num_serie = p_num_serie AND date_heure_fin IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aucune location en cours pour le vélo %', p_num_serie;
  END IF;

  v_next_dock := v_station.nb_velos_actuel + 1;

  UPDATE locations
  SET date_heure_fin = NOW(),
      id_station_arrivee_reelle = p_id_station_arrivee,
      velo_restitue_en_mauvais_etat = p_mauvais_etat
  WHERE id_location = v_loc.id_location;

  UPDATE velos
  SET etat = CASE WHEN p_mauvais_etat THEN 'EN_PANNE'::etat_velo ELSE 'DISPONIBLE'::etat_velo END,
      id_station = p_id_station_arrivee,
      emplacement_dock = v_next_dock
  WHERE num_serie = p_num_serie;

  IF v_loc.num_carte_courte_duree IS NOT NULL THEN
    UPDATE cartes_courte_duree
    SET garantie_restituee = TRUE,
        active = FALSE,
        retenue = p_retenue
    WHERE num_carte = v_loc.num_carte_courte_duree;
  END IF;

  RETURN v_loc.id_location;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 11. ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE entrepots ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE types_velo ENABLE ROW LEVEL SECURITY;
ALTER TABLE fournisseurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE camions ENABLE ROW LEVEL SECURITY;
ALTER TABLE velos ENABLE ROW LEVEL SECURITY;
ALTER TABLE personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE utilisateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cartes_adhesion ENABLE ROW LEVEL SECURITY;
ALTER TABLE cartes_courte_duree ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reclamations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reparations ENABLE ROW LEVEL SECURITY;
ALTER TABLE controles_journaliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE itineraires ENABLE ROW LEVEL SECURITY;
ALTER TABLE etapes_itineraire ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordres_mission ENABLE ROW LEVEL SECURITY;
