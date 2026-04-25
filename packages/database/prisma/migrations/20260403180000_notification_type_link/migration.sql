-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('MATCH', 'TRANSFER', 'SUPPORT', 'SYSTEM');

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE "notifications" ADD COLUMN "link" TEXT;

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");
