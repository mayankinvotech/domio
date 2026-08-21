-- AlterTable
ALTER TABLE "LedgerEntry" ADD COLUMN     "rentFor" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "RentLedger" ADD COLUMN     "rentFor" TIMESTAMP(3);
