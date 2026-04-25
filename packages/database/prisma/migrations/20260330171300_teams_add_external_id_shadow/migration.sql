-- Prépare le rename suivant : la migration initiale omjep ne crée pas external_id sur teams.
-- Shadow DB : ajoute external_id uniquement si ni external_id ni proclubs_url n’existent encore.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'teams' AND column_name = 'external_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'teams' AND column_name = 'proclubs_url'
  ) THEN
    ALTER TABLE "teams" ADD COLUMN "external_id" TEXT;
  END IF;
END $$;
