-- AlterTable: agent libre — pas de club vendeur
ALTER TABLE "transfer_offers" ALTER COLUMN "to_team_id" DROP NOT NULL;
