-- Rendre start_date et end_date obligatoires dans competitions
-- Étape 1 : remplir les lignes NULL avec des valeurs par défaut avant d'ajouter la contrainte NOT NULL
UPDATE "competitions"
SET "start_date" = NOW()
WHERE "start_date" IS NULL;

UPDATE "competitions"
SET "end_date" = NOW() + INTERVAL '30 days'
WHERE "end_date" IS NULL;

-- Étape 2 : passer les colonnes en NOT NULL
ALTER TABLE "competitions" ALTER COLUMN "start_date" SET NOT NULL;
ALTER TABLE "competitions" ALTER COLUMN "end_date" SET NOT NULL;
