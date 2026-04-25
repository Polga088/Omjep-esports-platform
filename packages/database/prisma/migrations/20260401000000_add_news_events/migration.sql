-- NewsEvent table for Mercato feed and important events
DO $$ BEGIN
  CREATE TYPE "NewsEventType" AS ENUM ('TRANSFER', 'CONTRACT_RENEWAL', 'TOURNAMENT_WIN', 'SEASON_START', 'RECORD_BROKEN', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "news_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "type" "NewsEventType" NOT NULL DEFAULT 'TRANSFER',
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "news_events_pkey" PRIMARY KEY ("id")
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS "news_events_type_created_at_idx" ON "news_events"("type", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "news_events_created_at_idx" ON "news_events"("created_at" DESC);
