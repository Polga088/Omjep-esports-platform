-- CreateEnum
CREATE TYPE "StoreItemCategory" AS ENUM ('BANNER', 'AVATAR_FRAME', 'BADGE');

-- CreateTable
CREATE TABLE "store_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price_jepy" INTEGER NOT NULL,
    "category" "StoreItemCategory" NOT NULL,
    "image_url" TEXT NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "store_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_inventory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "purchased_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_inventory_user_id_item_id_key" ON "user_inventory"("user_id", "item_id");

-- AddForeignKey
ALTER TABLE "user_inventory" ADD CONSTRAINT "user_inventory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_inventory" ADD CONSTRAINT "user_inventory_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "store_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed (cosmétiques de démo)
INSERT INTO "store_items" ("name", "description", "price_jepy", "category", "image_url", "is_available")
VALUES
  ('Bannière OMJEP Or', 'Bannière de profil aux couleurs Eagles.', 3, 'BANNER', 'https://images.unsplash.com/photo-1614850523459-c2f4c69952d6?w=400&q=80', true),
  ('Cadre Légende', 'Cadre avatar style compétition.', 7, 'AVATAR_FRAME', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80', true),
  ('Badge Champion', 'Badge exclusif pour votre fiche.', 5, 'BADGE', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&q=80', true),
  ('Bannière Nuit', 'Fond sombre avec accents ambre.', 2, 'BANNER', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80', true);
