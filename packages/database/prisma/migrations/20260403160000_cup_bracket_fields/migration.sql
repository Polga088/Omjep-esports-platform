-- Enums
CREATE TYPE "CupScenario" AS ENUM ('SINGLE_ELIMINATION', 'TWO_LEGGED_TIE', 'GROUPS_AND_KNOCKOUT');
CREATE TYPE "BracketAdvanceSlot" AS ENUM ('HOME', 'AWAY');

-- Competition
ALTER TABLE "competitions" ADD COLUMN "cup_scenario" "CupScenario";

-- Match bracket columns
ALTER TABLE "matches" ADD COLUMN "bracket_round" INTEGER;
ALTER TABLE "matches" ADD COLUMN "bracket_index" INTEGER;
ALTER TABLE "matches" ADD COLUMN "winner_advances_to_match_id" UUID;
ALTER TABLE "matches" ADD COLUMN "winner_slot_in_next" "BracketAdvanceSlot";

ALTER TABLE "matches" ADD CONSTRAINT "matches_winner_advances_to_match_id_fkey"
  FOREIGN KEY ("winner_advances_to_match_id") REFERENCES "matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "matches_competition_id_bracket_round_bracket_index_idx"
  ON "matches"("competition_id", "bracket_round", "bracket_index");
