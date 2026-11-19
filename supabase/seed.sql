-- ============================================================================
-- VéloSf — Données de démonstration ("Salines de Sfax")
-- À exécuter APRÈS supabase/schema.sql dans Supabase SQL Editor.
-- Mots de passe personnel : Sfax2026!
-- Code secret carte abonné Mohamed Gharbi (carte #10001) : 1234
-- Code secret carte abonnée Amira Bouaziz (carte #10002) : 4321
-- ============================================================================

INSERT INTO entrepots (id_entrepot, nom, adresse) VALUES
  (1, 'Entrepôt Poudrière', 'Rue de la Poudrière, Zone Industrielle, Sfax 3002')
ON CONFLICT (id_entrepot) DO NOTHING;

SELECT setval('entrepots_id_entrepot_seq', (SELECT COALESCE(MAX(id_entrepot), 1) FROM entrepots));

INSERT INTO stations (id_station, nom, adresse, capacite, nb_velos_actuel, id_entrepot, latitude, longitude, map_x, map_y) VALUES
  (1, 'Bab Diwan – Médina', 'Place Bab Diwan, Médina de Sfax', 20, 0, 1, 34.7355, 10.7615, 48, 62),
  (2, 'Gare SNCFT', 'Avenue Habib Bourguiba, Centre-ville', 16, 0, 1, 34.7398, 10.7634, 58, 52),
  (3, 'Port de Sfax', 'Boulevard du Port, Sfax', 12, 0, 1, 34.7322, 10.7689, 72, 74),
  (4, 'Route El Ain km 3', 'Route El Ain km 3, Cité El Habib', 18, 0, 1, 34.7510, 10.7350, 26, 44),
  (5, 'Technopôle de Sfax', 'Route de Tunis km 10, Sakiet Ezzit', 24, 0, 1, 34.8120, 10.7540, 44, 18),
  (6, 'Sakiet Ezzit', 'Avenue de la République, Sakiet Ezzit', 14, 0, 1, 34.7980, 10.7690, 66, 28)
ON CONFLICT (id_station) DO NOTHING;

SELECT setval('stations_id_station_seq', (SELECT COALESCE(MAX(id_station), 1) FROM stations));

INSERT INTO types_velo (id_type, libelle) VALUES
  (1, 'Ville'),
  (2, 'VTC'),
  (3, 'Électrique')
ON CONFLICT (id_type) DO NOTHING;

SELECT setval('types_velo_id_type_seq', (SELECT COALESCE(MAX(id_type), 1) FROM types_velo));

INSERT INTO fournisseurs (id_fournisseur, nom, adresse, tel) VALUES
  (1, 'Cyclo Maghreb SARL', 'Zone Industrielle Chotrana, Ariana', '+216 71 452 100'),
  (2, 'Sfax Mobilité', 'Route de Gabès km 2, Sfax', '+216 74 221 890'),
  (3, 'Bikes & Co Tunis', 'Avenue Jean Jaurès, Tunis', '+216 71 334 510')
ON CONFLICT (id_fournisseur) DO NOTHING;

SELECT setval('fournisseurs_id_fournisseur_seq', (SELECT COALESCE(MAX(id_fournisseur), 1) FROM fournisseurs));

INSERT INTO camions (immatriculation, modele, capacite, kilometrage, disponible, id_entrepot) VALUES
  ('123 TUN 4567', 'Renault Master L2H2', 14, 42500, TRUE, 1),
  ('208 TUN 9921', 'Iveco Daily 35S', 16, 28900, TRUE, 1)
ON CONFLICT (immatriculation) DO NOTHING;

INSERT INTO personnel (matricule, nom, prenom, tel, role, specialite, password_hash) VALUES
  (1001, 'Ben Salah', 'Ahmed', '+216 98 412 300', 'RESPONSABLE', NULL, crypt('Sfax2026!', gen_salt('bf'))),
  (2014, 'Trabelsi', 'Yasmine', '+216 55 210 884', 'TECHNICIEN', 'Freins & transmission', crypt('Sfax2026!', gen_salt('bf'))),
  (2019, 'Jlassi', 'Karim', '+216 22 778 901', 'TECHNICIEN', 'Électrique', crypt('Sfax2026!', gen_salt('bf')))
ON CONFLICT (matricule) DO NOTHING;

INSERT INTO utilisateurs (id_utilisateur, nom, prenom, cin, tel, type_utilisateur, date_adhesion) VALUES
  (1, 'Gharbi', 'Mohamed', '08123456', '+216 50 112 233', 'ABONNE', '2025-09-15'),
  (2, 'Bouaziz', 'Amira', '07654321', '+216 29 445 566', 'ABONNE', '2026-01-10'),
  (3, 'Kammoun', 'Salma', '09876543', '+216 54 889 900', 'OCCASIONNEL', NULL)
ON CONFLICT (id_utilisateur) DO NOTHING;

SELECT setval('utilisateurs_id_utilisateur_seq', (SELECT COALESCE(MAX(id_utilisateur), 1) FROM utilisateurs));

INSERT INTO cartes_adhesion (num_carte, id_utilisateur, date_emission, date_expiration, code_secret_hash, active, bloquee) VALUES
  (10001, 1, '2025-09-15', '2027-09-15', crypt('1234', gen_salt('bf')), TRUE, FALSE),
  (10002, 2, '2026-01-10', '2027-01-10', crypt('4321', gen_salt('bf')), TRUE, FALSE)
ON CONFLICT (num_carte) DO NOTHING;

SELECT setval('cartes_adhesion_num_carte_seq', (SELECT COALESCE(MAX(num_carte), 10002) FROM cartes_adhesion));

-- Vélos à Route El Ain km 3 (station 4) : 11 vélos disponibles sur 18 places
INSERT INTO velos (num_serie, couleur, couleur_hex, date_acquisition, etat, id_type, id_fournisseur, id_station, emplacement_dock) VALUES
  ('VSF-000401', 'Bleu Mer', '#0E5A6B', '2025-03-10', 'DISPONIBLE', 1, 1, 4, 1),
  ('VSF-000402', 'Safran', '#F0A42B', '2025-03-10', 'DISPONIBLE', 2, 1, 4, 2),
  ('VSF-000403', 'Olive', '#5E7B3A', '2025-04-02', 'DISPONIBLE', 1, 2, 4, 3),
  ('VSF-000404', 'Encre', '#14232B', '2025-04-02', 'DISPONIBLE', 3, 3, 4, 4),
  ('VSF-000405', 'Terracotta', '#C8553D', '2025-05-14', 'DISPONIBLE', 1, 1, 4, 5),
  ('VSF-000406', 'Bleu Mer', '#0E5A6B', '2025-05-14', 'DISPONIBLE', 2, 2, 4, 6),
  ('VSF-000407', 'Safran', '#F0A42B', '2025-06-01', 'DISPONIBLE', 3, 3, 4, 7),
  ('VSF-000408', 'Brume', '#9DB8BF', '2025-06-01', 'DISPONIBLE', 1, 1, 4, 8),
  ('VSF-000409', 'Olive', '#5E7B3A', '2025-07-19', 'DISPONIBLE', 2, 2, 4, 9),
  ('VSF-000410', 'Bleu Mer', '#0E5A6B', '2025-08-22', 'DISPONIBLE', 1, 1, 4, 10),
  ('VSF-000411', 'Encre', '#14232B', '2025-09-05', 'DISPONIBLE', 3, 3, 4, 11),

  -- Bab Diwan – Médina (station 1) : 12 vélos sur 20
  ('VSF-000412', 'Bleu Mer', '#0E5A6B', '2025-03-10', 'LOUE', 1, 1, NULL, NULL),
  ('VSF-000413', 'Safran', '#F0A42B', '2025-03-12', 'DISPONIBLE', 2, 1, 1, 1),
  ('VSF-000414', 'Olive', '#5E7B3A', '2025-03-12', 'DISPONIBLE', 1, 2, 1, 2),
  ('VSF-000415', 'Terracotta', '#C8553D', '2025-04-15', 'DISPONIBLE', 3, 3, 1, 3),
  ('VSF-000416', 'Bleu Mer', '#0E5A6B', '2025-04-15', 'DISPONIBLE', 1, 1, 1, 4),
  ('VSF-000417', 'Encre', '#14232B', '2025-05-20', 'DISPONIBLE', 2, 2, 1, 5),
  ('VSF-000418', 'Safran', '#F0A42B', '2025-05-20', 'DISPONIBLE', 1, 1, 1, 6),
  ('VSF-000419', 'Brume', '#9DB8BF', '2025-06-11', 'EN_PANNE', 2, 2, 1, 7),
  ('VSF-000420', 'Olive', '#5E7B3A', '2025-06-11', 'DISPONIBLE', 3, 3, 1, 8),
  ('VSF-000421', 'Bleu Mer', '#0E5A6B', '2025-07-01', 'DISPONIBLE', 1, 1, 1, 9),
  ('VSF-000422', 'Terracotta', '#C8553D', '2025-07-01', 'DISPONIBLE', 1, 2, 1, 10),
  ('VSF-000423', 'Encre', '#14232B', '2025-08-03', 'DISPONIBLE', 2, 1, 1, 11),
  ('VSF-000424', 'Safran', '#F0A42B', '2025-08-03', 'DISPONIBLE', 3, 3, 1, 12),

  -- Gare SNCFT (station 2) : 4 vélos (déficit)
  ('VSF-000425', 'Bleu Mer', '#0E5A6B', '2025-04-01', 'DISPONIBLE', 1, 1, 2, 1),
  ('VSF-000426', 'Olive', '#5E7B3A', '2025-04-01', 'DISPONIBLE', 2, 2, 2, 2),
  ('VSF-000427', 'Safran', '#F0A42B', '2025-05-10', 'DISPONIBLE', 3, 3, 2, 3),
  ('VSF-000428', 'Encre', '#14232B', '2025-05-10', 'DISPONIBLE', 1, 1, 2, 4),

  -- Port de Sfax (station 3) : 6 vélos sur 12
  ('VSF-000429', 'Bleu Mer', '#0E5A6B', '2025-06-15', 'DISPONIBLE', 1, 2, 3, 1),
  ('VSF-000430', 'Terracotta', '#C8553D', '2025-06-15', 'DISPONIBLE', 2, 1, 3, 2),
  ('VSF-000431', 'Safran', '#F0A42B', '2025-07-22', 'DISPONIBLE', 1, 1, 3, 3),
  ('VSF-000432', 'Olive', '#5E7B3A', '2025-07-22', 'DISPONIBLE', 3, 3, 3, 4),
  ('VSF-000433', 'Brume', '#9DB8BF', '2025-08-18', 'DISPONIBLE', 2, 2, 3, 5),
  ('VSF-000434', 'Encre', '#14232B', '2025-08-18', 'DISPONIBLE', 1, 1, 3, 6),

  -- Technopôle de Sfax (station 5) : 18 vélos sur 24 (surplus)
  ('VSF-000435', 'Bleu Mer', '#0E5A6B', '2025-09-01', 'DISPONIBLE', 3, 3, 5, 1),
  ('VSF-000436', 'Safran', '#F0A42B', '2025-09-01', 'DISPONIBLE', 1, 1, 5, 2),
  ('VSF-000437', 'Olive', '#5E7B3A', '2025-09-01', 'DISPONIBLE', 2, 2, 5, 3),
  ('VSF-000438', 'Terracotta', '#C8553D', '2025-09-01', 'DISPONIBLE', 1, 1, 5, 4),
  ('VSF-000439', 'Encre', '#14232B', '2025-09-01', 'DISPONIBLE', 3, 3, 5, 5),
  ('VSF-000440', 'Bleu Mer', '#0E5A6B', '2025-09-01', 'DISPONIBLE', 2, 2, 5, 6),

  -- Sakiet Ezzit (station 6) : 5 vélos sur 14
  ('VSF-000441', 'Safran', '#F0A42B', '2025-10-05', 'DISPONIBLE', 1, 1, 6, 1),
  ('VSF-000442', 'Olive', '#5E7B3A', '2025-10-05', 'DISPONIBLE', 2, 2, 6, 2),
  ('VSF-000443', 'Bleu Mer', '#0E5A6B', '2025-10-05', 'DISPONIBLE', 3, 3, 6, 3),
  ('VSF-000444', 'Encre', '#14232B', '2025-10-05', 'EN_REPARATION', 3, 3, 6, 4),
  ('VSF-000445', 'Terracotta', '#C8553D', '2025-10-05', 'DISPONIBLE', 1, 1, 6, 5)
ON CONFLICT (num_serie) DO NOTHING;

-- Vélo réformé exemple
INSERT INTO velos (num_serie, couleur, couleur_hex, date_acquisition, etat, motif_reforme, motif_reforme_detail, date_reforme, id_type, id_fournisseur, id_station) VALUES
  ('VSF-000399', 'Cendre', '#7A7A72', '2024-02-10', 'REFORME', 'ACCIDENT', 'Cadre fissuré suite à un choc frontal à Bab Diwan.', '2026-08-12', 1, 1, NULL)
ON CONFLICT (num_serie) DO NOTHING;

-- Location en cours pour Amira Bouaziz (VSF-000412 partie de Gare SNCFT)
INSERT INTO locations (id_utilisateur, num_serie, num_carte_adhesion, id_station_depart, date_heure_debut) VALUES
  (2, 'VSF-000412', 10002, 2, NOW() - INTERVAL '45 minutes')
ON CONFLICT DO NOTHING;

-- Réclamations & Réparations démo
INSERT INTO reclamations (id_reclamation, num_serie, matricule_technicien, date_reclamation, diagnostic, traitee) VALUES
  (1, 'VSF-000419', 2014, NOW() - INTERVAL '4 days', 'Frein arrière détendu et câble effiloché, bruit au pédalier.', FALSE),
  (2, 'VSF-000444', 2019, NOW() - INTERVAL '2 days', 'Batterie ne charge plus au-delà de 15%, connecteur oxydé.', TRUE)
ON CONFLICT (id_reclamation) DO NOTHING;

SELECT setval('reclamations_id_reclamation_seq', (SELECT COALESCE(MAX(id_reclamation), 1) FROM reclamations));

INSERT INTO reparations (id_reparation, id_reclamation, matricule_technicien, date_planifiee, statut) VALUES
  (1, 2, 2019, CURRENT_DATE, 'PLANIFIEE')
ON CONFLICT (id_reparation) DO NOTHING;

SELECT setval('reparations_id_reparation_seq', (SELECT COALESCE(MAX(id_reparation), 1) FROM reparations));

-- Itinéraire et Ordre de mission du jour
INSERT INTO itineraires (id_itineraire, date_itineraire, matricule_responsable, brouillon) VALUES
  (1, CURRENT_DATE, 1001, FALSE)
ON CONFLICT (id_itineraire) DO NOTHING;

SELECT setval('itineraires_id_itineraire_seq', (SELECT COALESCE(MAX(id_itineraire), 1) FROM itineraires));

INSERT INTO etapes_itineraire (id_itineraire, ordre, action, id_station, nb_velos) VALUES
  (1, 1, 'PRENDRE', 5, 3),
  (1, 2, 'DEPOSER', 2, 3)
ON CONFLICT (id_itineraire, ordre) DO NOTHING;

INSERT INTO ordres_mission (id_ordre, id_itineraire, matricule_technicien, immatriculation_camion, matricule_responsable, date_mission, statut) VALUES
  (1, 1, 2014, '123 TUN 4567', 1001, CURRENT_DATE, 'NON_DEMARRE')
ON CONFLICT (id_ordre) DO NOTHING;

SELECT setval('ordres_mission_id_ordre_seq', (SELECT COALESCE(MAX(id_ordre), 1) FROM ordres_mission));
