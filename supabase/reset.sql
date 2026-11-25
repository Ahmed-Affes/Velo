-- ============================================================================
-- VéloSf — Réinitialisation complète à zéro (supprime toutes les données)
-- À exécuter dans Supabase SQL Editor pour repartir d'une base vide.
-- ============================================================================

TRUNCATE TABLE
  ordres_mission,
  etapes_itineraire,
  itineraires,
  controles_journaliers,
  reparations,
  reclamations,
  locations,
  cartes_courte_duree,
  cartes_adhesion,
  utilisateurs,
  velos,
  camions,
  fournisseurs,
  types_velo,
  stations,
  entrepots,
  personnel
RESTART IDENTITY CASCADE;
