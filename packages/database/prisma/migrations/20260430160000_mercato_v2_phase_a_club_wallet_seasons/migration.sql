-- Mercato V2 Phase A
-- Foundation only: schema + backfill
-- No API/service behavior changes in this migration.

-- 1) Enums -------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE "SeasonStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'TransferOfferStatus'
      AND e.enumlabel = 'EXPIRED'
  ) THEN
    ALTER TYPE "TransferOfferStatus" ADD VALUE 'EXPIRED';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'TransactionType'
      AND e.enumlabel = 'TRANSFER_RESERVE'
  ) THEN
    ALTER TYPE "TransactionType" ADD VALUE 'TRANSFER_RESERVE';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'TransactionType'
      AND e.enumlabel = 'TRANSFER_RELEASE'
  ) THEN
    ALTER TYPE "TransactionType" ADD VALUE 'TRANSFER_RELEASE';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'TransactionType'
      AND e.enumlabel = 'SEASON_BUDGET_CREDIT'
  ) THEN
    ALTER TYPE "TransactionType" ADD VALUE 'SEASON_BUDGET_CREDIT';
  END IF;
END $$;

-- 2) New tables ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "seasons" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "start_date" TIMESTAMP(3) NOT NULL,
  "end_date" TIMESTAMP(3) NOT NULL,
  "status" "SeasonStatus" NOT NULL DEFAULT 'DRAFT',
  "is_current" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "seasons_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "seasons_name_key" UNIQUE ("name")
);

CREATE INDEX IF NOT EXISTS "seasons_is_current_idx" ON "seasons"("is_current");

-- Optional guardrail: keep at most one current season.
CREATE UNIQUE INDEX IF NOT EXISTS "seasons_single_current_idx"
  ON "seasons" ("is_current")
  WHERE "is_current" = true;

CREATE TABLE IF NOT EXISTS "club_wallets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "team_id" UUID NOT NULL,
  "omjep_coins_balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "season_transfer_budget" DOUBLE PRECISION NOT NULL DEFAULT 10000000,
  "reserved_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "club_wallets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "club_wallets_team_id_key" UNIQUE ("team_id"),
  CONSTRAINT "club_wallets_team_id_fkey"
    FOREIGN KEY ("team_id") REFERENCES "teams"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- 3) Existing tables evolution ------------------------------------------------

ALTER TABLE "transfer_offers"
  ADD COLUMN IF NOT EXISTS "seasons_count" INTEGER,
  ADD COLUMN IF NOT EXISTS "reserved_amount" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "contract_start_season_id" UUID;

ALTER TABLE "contracts"
  ADD COLUMN IF NOT EXISTS "seasons_count" INTEGER,
  ADD COLUMN IF NOT EXISTS "start_season_id" UUID,
  ADD COLUMN IF NOT EXISTS "end_season_id" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'transfer_offers_contract_start_season_id_fkey'
      AND table_name = 'transfer_offers'
  ) THEN
    ALTER TABLE "transfer_offers"
      ADD CONSTRAINT "transfer_offers_contract_start_season_id_fkey"
      FOREIGN KEY ("contract_start_season_id") REFERENCES "seasons"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'contracts_start_season_id_fkey'
      AND table_name = 'contracts'
  ) THEN
    ALTER TABLE "contracts"
      ADD CONSTRAINT "contracts_start_season_id_fkey"
      FOREIGN KEY ("start_season_id") REFERENCES "seasons"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'contracts_end_season_id_fkey'
      AND table_name = 'contracts'
  ) THEN
    ALTER TABLE "contracts"
      ADD CONSTRAINT "contracts_end_season_id_fkey"
      FOREIGN KEY ("end_season_id") REFERENCES "seasons"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "transfer_offers_contract_start_season_id_idx"
  ON "transfer_offers" ("contract_start_season_id");
CREATE INDEX IF NOT EXISTS "transfer_offers_expires_at_idx"
  ON "transfer_offers" ("expires_at");
CREATE INDEX IF NOT EXISTS "contracts_start_season_id_idx"
  ON "contracts" ("start_season_id");
CREATE INDEX IF NOT EXISTS "contracts_end_season_id_idx"
  ON "contracts" ("end_season_id");

-- Rule guardrail: one active offer per player.
CREATE UNIQUE INDEX IF NOT EXISTS "transfer_offers_one_active_offer_per_player_idx"
  ON "transfer_offers" ("player_id")
  WHERE "status" IN ('PENDING', 'COUNTER_OFFER');

-- 4) Backfill ----------------------------------------------------------------

-- Club.budget -> ClubWallet.omjep_coins_balance
-- Fixed season budget = 10,000,000 OC
-- Reserved amount = 0
INSERT INTO "club_wallets" (
  "team_id",
  "omjep_coins_balance",
  "season_transfer_budget",
  "reserved_amount"
)
SELECT
  t."id",
  COALESCE(t."budget", 0),
  10000000,
  0
FROM "teams" t
ON CONFLICT ("team_id") DO UPDATE SET
  "omjep_coins_balance" = EXCLUDED."omjep_coins_balance",
  "season_transfer_budget" = EXCLUDED."season_transfer_budget",
  "reserved_amount" = COALESCE("club_wallets"."reserved_amount", 0),
  "updated_at" = CURRENT_TIMESTAMP;

-- TransferOffer backfill:
-- - seasons_count from duration_months (legacy)
-- - reserved_amount defaults to 0
-- - expires_at defaults to created_at + 48h for active offers
UPDATE "transfer_offers"
SET
  "seasons_count" = CASE
    WHEN "seasons_count" IS NOT NULL THEN "seasons_count"
    WHEN COALESCE("duration_months", 0) <= 0 THEN 1
    ELSE GREATEST(1, CEIL("duration_months"::numeric / 12))::int
  END,
  "reserved_amount" = COALESCE("reserved_amount", 0),
  "expires_at" = CASE
    WHEN "expires_at" IS NOT NULL THEN "expires_at"
    WHEN "status" IN ('PENDING', 'COUNTER_OFFER') THEN ("created_at" + INTERVAL '48 hours')
    ELSE NULL
  END;

-- Contract backfill:
-- - derive seasons_count from start/end date (legacy compat)
UPDATE "contracts"
SET
  "seasons_count" = CASE
    WHEN "seasons_count" IS NOT NULL THEN "seasons_count"
    WHEN "start_date" IS NULL OR "end_date" IS NULL THEN 1
    WHEN "end_date" <= "start_date" THEN 1
    ELSE GREATEST(
      1,
      CEIL((EXTRACT(EPOCH FROM ("end_date" - "start_date")) / 86400 / 365.0))
    )::int
  END;

