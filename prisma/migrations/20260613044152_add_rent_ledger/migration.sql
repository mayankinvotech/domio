-- CreateEnum
CREATE TYPE "RentStatus" AS ENUM ('DUE', 'PAID', 'PARTIAL', 'OVERDUE');

-- CreateTable
CREATE TABLE "RentLedger" (
    "id" TEXT NOT NULL,
    "tenancyId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amountDue" DOUBLE PRECISION NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidDate" TIMESTAMP(3),
    "reference" TEXT,
    "status" "RentStatus" NOT NULL DEFAULT 'DUE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentLedger_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RentLedger" ADD CONSTRAINT "RentLedger_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentLedger" ADD CONSTRAINT "RentLedger_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
