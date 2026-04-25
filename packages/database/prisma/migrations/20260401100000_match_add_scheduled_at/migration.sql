-- Ajouter le champ scheduled_at (nullable) à la table matches
-- Utilisé pour mémoriser la date/heure de reprogrammation après un litige
ALTER TABLE "matches" ADD COLUMN "scheduled_at" TIMESTAMP(3);
