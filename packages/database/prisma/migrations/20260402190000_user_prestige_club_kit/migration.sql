-- CreateEnum
CREATE TYPE "AvatarRarity" AS ENUM ('COMMON', 'PREMIUM', 'LEGENDARY');

-- AlterTable users (prestige / skins)
ALTER TABLE "users" ADD COLUMN     "avatar_url" TEXT,
ADD COLUMN "avatar_rarity" "AvatarRarity" NOT NULL DEFAULT 'COMMON',
ADD COLUMN "active_frame_url" TEXT,
ADD COLUMN "active_jersey_id" UUID;

-- AlterTable teams (couleurs maillot club)
ALTER TABLE "teams" ADD COLUMN "primary_color" TEXT,
ADD COLUMN "secondary_color" TEXT;

-- AlterTable store_items (maillot lié à un club)
ALTER TABLE "store_items" ADD COLUMN "club_id" UUID;

-- AddForeignKey
ALTER TABLE "store_items" ADD CONSTRAINT "store_items_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "users" ADD CONSTRAINT "users_active_jersey_id_fkey" FOREIGN KEY ("active_jersey_id") REFERENCES "store_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
