-- Mercato V2 Phase D (schema only) : TransferMode, SIGNING_BONUS, TransferSellerSettlement, transfer_offers.transfer_mode
-- Idempotent : safe to re-run if a step partially applied.

-- 1) Enum TransferMode
DO $$
BEGIN
  CREATE TYPE "TransferMode" AS ENUM ('NEGOTIATED_FEE', 'RELEASE_CLAUSE_BUYOUT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2) Enum TransferSettlementStatus
DO $$
BEGIN
  CREATE TYPE "TransferSettlementStatus" AS ENUM ('PENDING_SEASON_END', 'SETTLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3) TransactionType : SIGNING_BONUS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'TransactionType'
      AND e.enumlabel = 'SIGNING_BONUS'
  ) THEN
    ALTER TYPE "TransactionType" ADD VALUE 'SIGNING_BONUS';
  END IF;
END $$;

-- 4) transfer_offers.transfer_mode
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'transfer_offers'
      AND column_name = 'transfer_mode'
  ) THEN
    ALTER TABLE "transfer_offers"
      ADD COLUMN "transfer_mode" "TransferMode" NOT NULL DEFAULT 'NEGOTIATED_FEE';
  END IF;
END $$;

-- 5) Table transfer_seller_settlements
CREATE TABLE IF NOT EXISTS "transfer_seller_settlements" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "transfer_offer_id" UUID NOT NULL,
  "seller_team_id" UUID NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "status" "TransferSettlementStatus" NOT NULL DEFAULT 'PENDING_SEASON_END',
  "season_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "settled_at" TIMESTAMP(3),

  CONSTRAINT "transfer_seller_settlements_pkey" PRIMARY KEY ("id")
);

-- FKs & unique (idempotent via NOT VALID / separate DO blocks)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transfer_seller_settlements_transfer_offer_id_key'
  ) THEN
    ALTER TABLE "transfer_seller_settlements"
      ADD CONSTRAINT "transfer_seller_settlements_transfer_offer_id_key" UNIQUE ("transfer_offer_id");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transfer_seller_settlements_transfer_offer_id_fkey'
  ) THEN
    ALTER TABLE "transfer_seller_settlements"
      ADD CONSTRAINT "transfer_seller_settlements_transfer_offer_id_fkey"
      FOREIGN KEY ("transfer_offer_id") REFERENCES "transfer_offers" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transfer_seller_settlements_seller_team_id_fkey'
  ) THEN
    ALTER TABLE "transfer_seller_settlements"
      ADD CONSTRAINT "transfer_seller_settlements_seller_team_id_fkey"
      FOREIGN KEY ("seller_team_id") REFERENCES "teams" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transfer_seller_settlements_season_id_fkey'
  ) THEN
    ALTER TABLE "transfer_seller_settlements"
      ADD CONSTRAINT "transfer_seller_settlements_season_id_fkey"
      FOREIGN KEY ("season_id") REFERENCES "seasons" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "transfer_seller_settlements_seller_team_id_idx"
  ON "transfer_seller_settlements" ("seller_team_id");

CREATE INDEX IF NOT EXISTS "transfer_seller_settlements_status_idx"
  ON "transfer_seller_settlements" ("status");
