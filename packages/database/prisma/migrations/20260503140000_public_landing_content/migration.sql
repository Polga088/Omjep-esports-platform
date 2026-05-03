-- Public landing / Palmarès media (singleton row id = default)
CREATE TABLE "public_landing_content" (
    "id" TEXT NOT NULL,
    "palmares_hero_visual_url" TEXT,
    "palmares_competitions_media" JSONB,
    "palmares_champions_media" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "public_landing_content_pkey" PRIMARY KEY ("id")
);

INSERT INTO "public_landing_content" ("id", "palmares_hero_visual_url", "palmares_competitions_media", "palmares_champions_media", "updated_at")
VALUES ('default', NULL, NULL, NULL, CURRENT_TIMESTAMP);
