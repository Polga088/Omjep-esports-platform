-- Abonnements Player / President (idempotent)
DO $$ BEGIN
  CREATE TYPE "SubscriptionPlanCode" AS ENUM ('PLAYER', 'PRESIDENT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "UserSubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_premium" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "president_premium" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "subscription_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" "SubscriptionPlanCode" NOT NULL,
    "name" TEXT NOT NULL,
    "price_jepy" INTEGER NOT NULL,
    "duration_days" INTEGER NOT NULL DEFAULT 30,
    "features" JSONB NOT NULL,
    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "subscription_plans_code_key" ON "subscription_plans"("code");

CREATE TABLE IF NOT EXISTS "user_subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" "UserSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "user_subscriptions_user_id_status_idx" ON "user_subscriptions"("user_id", "status");
CREATE INDEX IF NOT EXISTS "user_subscriptions_end_date_status_idx" ON "user_subscriptions"("end_date", "status");

DO $$ BEGIN
  ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Plans par défaut (prix à ajuster côté produit)
INSERT INTO "subscription_plans" ("id", "code", "name", "price_jepy", "duration_days", "features")
SELECT gen_random_uuid(), 'PLAYER'::"SubscriptionPlanCode", 'Player', 0, 30, '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "subscription_plans" WHERE "code" = 'PLAYER');

INSERT INTO "subscription_plans" ("id", "code", "name", "price_jepy", "duration_days", "features")
SELECT gen_random_uuid(), 'PRESIDENT'::"SubscriptionPlanCode", 'President', 0, 30, '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "subscription_plans" WHERE "code" = 'PRESIDENT');
