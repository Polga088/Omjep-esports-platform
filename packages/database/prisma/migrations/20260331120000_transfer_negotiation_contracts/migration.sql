-- Contract: expires_at -> start_date, end_date, status
DO $$ BEGIN
  CREATE TYPE "ContractStatus" AS ENUM ('ACTIVE', 'TERMINATED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "start_date" TIMESTAMP(3);
    ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "end_date" TIMESTAMP(3);
    ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "status" "ContractStatus";

    UPDATE "contracts" SET "end_date" = "expires_at" WHERE "end_date" IS NULL;
    UPDATE "contracts" SET "start_date" = "expires_at" - INTERVAL '365 days' WHERE "start_date" IS NULL;
    UPDATE "contracts" SET "status" = 'ACTIVE'::"ContractStatus" WHERE "status" IS NULL;

    ALTER TABLE "contracts" ALTER COLUMN "end_date" SET NOT NULL;
    ALTER TABLE "contracts" ALTER COLUMN "start_date" SET NOT NULL;
    ALTER TABLE "contracts" ALTER COLUMN "status" SET NOT NULL;
    ALTER TABLE "contracts" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"ContractStatus";
    ALTER TABLE "contracts" ALTER COLUMN "start_date" SET DEFAULT CURRENT_TIMESTAMP;

    ALTER TABLE "contracts" DROP COLUMN "expires_at";
  END IF;
END $$;

-- Transfer offers
DO $$ BEGIN
  CREATE TYPE "TransferOfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'COUNTER_OFFER', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "NegotiationTurn" AS ENUM ('PLAYER', 'BUYING_CLUB');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'transfer_offers' AND column_name = 'amount'
  ) THEN
    ALTER TABLE "transfer_offers" ADD COLUMN IF NOT EXISTS "offered_salary" DOUBLE PRECISION;
    ALTER TABLE "transfer_offers" ADD COLUMN IF NOT EXISTS "offered_clause" DOUBLE PRECISION;
    ALTER TABLE "transfer_offers" ADD COLUMN IF NOT EXISTS "transfer_fee" DOUBLE PRECISION;
    ALTER TABLE "transfer_offers" ADD COLUMN IF NOT EXISTS "duration_months" INTEGER DEFAULT 12;
    ALTER TABLE "transfer_offers" ADD COLUMN IF NOT EXISTS "negotiation_turn" "NegotiationTurn" DEFAULT 'PLAYER'::"NegotiationTurn";
    ALTER TABLE "transfer_offers" ADD COLUMN IF NOT EXISTS "status_offer" "TransferOfferStatus";

    UPDATE "transfer_offers" SET
      "transfer_fee" = COALESCE("transfer_fee", "amount"),
      "offered_salary" = COALESCE("offered_salary", GREATEST(COALESCE("amount", 0) * 0.05, 1)),
      "offered_clause" = COALESCE("offered_clause", GREATEST(COALESCE("amount", 0) * 1.5, 1)),
      "duration_months" = COALESCE("duration_months", 12),
      "negotiation_turn" = COALESCE("negotiation_turn", 'PLAYER'::"NegotiationTurn");

    UPDATE "transfer_offers" SET
      "status_offer" = CASE "status"::text
        WHEN 'PENDING' THEN 'PENDING'::"TransferOfferStatus"
        WHEN 'ACCEPTED' THEN 'ACCEPTED'::"TransferOfferStatus"
        WHEN 'REJECTED' THEN 'REJECTED'::"TransferOfferStatus"
        WHEN 'CANCELLED' THEN 'CANCELLED'::"TransferOfferStatus"
        ELSE 'PENDING'::"TransferOfferStatus"
      END
    WHERE "status_offer" IS NULL;

    ALTER TABLE "transfer_offers" DROP COLUMN "amount";
    ALTER TABLE "transfer_offers" DROP COLUMN "status";

    ALTER TABLE "transfer_offers" RENAME COLUMN "status_offer" TO "status";

    ALTER TABLE "transfer_offers" ALTER COLUMN "offered_salary" SET NOT NULL;
    ALTER TABLE "transfer_offers" ALTER COLUMN "offered_clause" SET NOT NULL;
    ALTER TABLE "transfer_offers" ALTER COLUMN "transfer_fee" SET NOT NULL;
    ALTER TABLE "transfer_offers" ALTER COLUMN "duration_months" SET NOT NULL;
    ALTER TABLE "transfer_offers" ALTER COLUMN "negotiation_turn" SET NOT NULL;
    ALTER TABLE "transfer_offers" ALTER COLUMN "status" SET NOT NULL;
    ALTER TABLE "transfer_offers" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"TransferOfferStatus";
  END IF;
END $$;
