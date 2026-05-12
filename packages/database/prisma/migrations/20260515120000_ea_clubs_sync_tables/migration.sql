-- EA Clubs sync: external links + match sync state + imported player stats (non-destructive)

CREATE TABLE IF NOT EXISTS "team_external_links" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'EA_CLUBS',
    "platform" TEXT NOT NULL,
    "ea_club_id" TEXT NOT NULL,
    "club_name" TEXT,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_external_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "team_external_links_team_id_provider_key" ON "team_external_links"("team_id", "provider");
CREATE INDEX IF NOT EXISTS "team_external_links_ea_club_id_platform_idx" ON "team_external_links"("ea_club_id", "platform");

DO $$ BEGIN
 ALTER TABLE "team_external_links" ADD CONSTRAINT "team_external_links_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "player_external_links" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'EA_CLUBS',
    "platform" TEXT,
    "persona_name" TEXT NOT NULL,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_external_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "player_external_links_user_id_provider_key" ON "player_external_links"("user_id", "provider");
CREATE INDEX IF NOT EXISTS "player_external_links_persona_name_idx" ON "player_external_links"("persona_name");

DO $$ BEGIN
 ALTER TABLE "player_external_links" ADD CONSTRAINT "player_external_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "match_syncs" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'EA_CLUBS',
    "provider_match_id" TEXT,
    "home_ea_club_id" TEXT,
    "away_ea_club_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "raw_payload" JSONB,
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "match_syncs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "match_syncs_match_id_provider_key" ON "match_syncs"("match_id", "provider");
CREATE INDEX IF NOT EXISTS "match_syncs_status_idx" ON "match_syncs"("status");

DO $$ BEGIN
 ALTER TABLE "match_syncs" ADD CONSTRAINT "match_syncs_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "player_match_external_stats" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "user_id" UUID,
    "provider" TEXT NOT NULL DEFAULT 'EA_CLUBS',
    "persona_name" TEXT NOT NULL,
    "rating" DOUBLE PRECISION,
    "goals" INTEGER,
    "assists" INTEGER,
    "saves" INTEGER,
    "clean_sheet" BOOLEAN,
    "position" TEXT,
    "raw_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_match_external_stats_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "player_match_external_stats_match_id_idx" ON "player_match_external_stats"("match_id");
CREATE INDEX IF NOT EXISTS "player_match_external_stats_user_id_idx" ON "player_match_external_stats"("user_id");
CREATE INDEX IF NOT EXISTS "player_match_external_stats_persona_name_idx" ON "player_match_external_stats"("persona_name");

DO $$ BEGIN
 ALTER TABLE "player_match_external_stats" ADD CONSTRAINT "player_match_external_stats_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "player_match_external_stats" ADD CONSTRAINT "player_match_external_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
