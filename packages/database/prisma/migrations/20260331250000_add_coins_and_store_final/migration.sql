-- Monnaie utilisateur (idempotent si déjà appliqué via db push)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "omjep_coins" INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "jepy_coins" INTEGER NOT NULL DEFAULT 0;

-- Enums boutique / pronostics
DO $$ BEGIN
  CREATE TYPE "StoreItemCategory" AS ENUM ('BANNER', 'AVATAR_FRAME', 'BADGE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PredictionStatus" AS ENUM ('PENDING', 'WON', 'LOST');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Boutique
CREATE TABLE IF NOT EXISTS "store_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price_jepy" INTEGER NOT NULL,
    "category" "StoreItemCategory" NOT NULL,
    "image_url" TEXT NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "store_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "user_inventory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "purchased_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_inventory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_inventory_user_id_item_id_key" ON "user_inventory"("user_id", "item_id");

DO $$ BEGIN
  ALTER TABLE "user_inventory" ADD CONSTRAINT "user_inventory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "user_inventory" ADD CONSTRAINT "user_inventory_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "store_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Pronostics
CREATE TABLE IF NOT EXISTS "predictions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "home_score" INTEGER NOT NULL,
    "away_score" INTEGER NOT NULL,
    "bet_amount" INTEGER NOT NULL,
    "status" "PredictionStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "predictions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "predictions_user_id_match_id_key" ON "predictions"("user_id", "match_id");

DO $$ BEGIN
  ALTER TABLE "predictions" ADD CONSTRAINT "predictions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "predictions" ADD CONSTRAINT "predictions_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
