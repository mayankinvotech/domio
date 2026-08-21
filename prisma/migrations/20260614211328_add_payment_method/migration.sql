-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CHEQUE', 'DIRECT_DEPOSIT', 'BANK_TRANSFER', 'OTHER');

-- AlterTable
ALTER TABLE "RentLedger" ADD COLUMN     "paymentMethod" "PaymentMethod";

-- AlterTable
ALTER TABLE "UtilityBill" ADD COLUMN     "paymentMethod" "PaymentMethod";
