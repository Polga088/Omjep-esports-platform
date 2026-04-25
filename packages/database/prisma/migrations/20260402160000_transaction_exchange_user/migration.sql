-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'EXCHANGE';

-- AlterTable
ALTER TABLE "transactions" ALTER COLUMN "team_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN "user_id" UUID;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "transactions_user_id_idx" ON "transactions"("user_id");
