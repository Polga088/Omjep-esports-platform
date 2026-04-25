-- Renomme external_id → proclubs_url (no-op si external_id absent, ex. déjà migré via db push).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'teams' AND column_name = 'external_id'
  ) THEN
    ALTER TABLE "teams" RENAME COLUMN "external_id" TO "proclubs_url";
  END IF;
END $$;
