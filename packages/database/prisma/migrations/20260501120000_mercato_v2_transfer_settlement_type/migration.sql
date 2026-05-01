-- Mercato V2 Phase B: ledger type for club wallet settlement (consume reserved + balance).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'TransactionType'
      AND e.enumlabel = 'TRANSFER_SETTLEMENT'
  ) THEN
    ALTER TYPE "TransactionType" ADD VALUE 'TRANSFER_SETTLEMENT';
  END IF;
END $$;
