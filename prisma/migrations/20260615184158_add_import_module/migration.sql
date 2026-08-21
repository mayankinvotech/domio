-- CreateEnum
CREATE TYPE "ImportType" AS ENUM ('FIRST_TIME_PROPERTY_LOAD', 'BANK_STATEMENT', 'EXPENSE_IMPORT', 'TENANT_IMPORT');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('UPLOADING', 'ANALYSING', 'AWAITING_INPUT', 'READY_TO_IMPORT', 'IMPORTING', 'COMPLETED', 'ROLLED_BACK', 'FAILED');

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "displayId" TEXT,
    "ownerId" TEXT NOT NULL,
    "importType" "ImportType" NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'UPLOADING',
    "originalFileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "s3Key" TEXT,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "validRows" INTEGER NOT NULL DEFAULT 0,
    "warningRows" INTEGER NOT NULL DEFAULT 0,
    "errorRows" INTEGER NOT NULL DEFAULT 0,
    "aiAnalysis" JSONB,
    "mappedData" JSONB,
    "userInputs" JSONB,
    "confirmedAt" TIMESTAMP(3),
    "rolledBackAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportedRecord" (
    "id" TEXT NOT NULL,
    "importJobId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "sourceData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportedRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ImportJob_displayId_key" ON "ImportJob"("displayId");

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedRecord" ADD CONSTRAINT "ImportedRecord_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "ImportJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
