-- ============================================================================
-- VéloSf — Script de mise à jour (si schema.sql v1 déjà exécuté)
-- ============================================================================
ALTER TABLE camions
  ADD COLUMN IF NOT EXISTS modele VARCHAR(80) NOT NULL DEFAULT 'Renault Master',
  ADD COLUMN IF NOT EXISTS capacite INT NOT NULL DEFAULT 12 CHECK (capacite > 0),
  ADD COLUMN IF NOT EXISTS kilometrage INT NOT NULL DEFAULT 0 CHECK (kilometrage >= 0);

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'stations','entrepots','types_velo','fournisseurs','camions','velos',
    'personnel','utilisateurs','cartes_adhesion','cartes_courte_duree',
    'locations','reclamations','reparations','controles_journaliers',
    'itineraires','etapes_itineraire','ordres_mission'
  ]
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;
