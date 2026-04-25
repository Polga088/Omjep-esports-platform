-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'MODERATOR';

-- CreateTable
CREATE TABLE "match_score_reports" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "reporting_team_id" UUID NOT NULL,
    "submitted_by_id" UUID NOT NULL,
    "home_score" INTEGER NOT NULL,
    "away_score" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "match_score_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "match_score_reports_match_id_reporting_team_id_key" ON "match_score_reports"("match_id", "reporting_team_id");

-- AddForeignKey
ALTER TABLE "match_score_reports" ADD CONSTRAINT "match_score_reports_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "match_score_reports" ADD CONSTRAINT "match_score_reports_reporting_team_id_fkey" FOREIGN KEY ("reporting_team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "match_score_reports" ADD CONSTRAINT "match_score_reports_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
