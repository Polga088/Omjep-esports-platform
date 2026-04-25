-- Fix: suppression d'une compétition → suppression en cascade des matchs liés
-- (remplace ON DELETE SET NULL par ON DELETE CASCADE sur matches.competition_id)

ALTER TABLE "matches" DROP CONSTRAINT IF EXISTS "matches_competition_id_fkey";

ALTER TABLE "matches" ADD CONSTRAINT "matches_competition_id_fkey"
  FOREIGN KEY ("competition_id") REFERENCES "competitions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
