-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('LEASE_AGREEMENT', 'PROPERTY_DEED', 'INSURANCE', 'INSPECTION_REPORT', 'UTILITY_AGREEMENT', 'TENANT_ID', 'BANK_STATEMENT', 'LEGAL', 'OTHER');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('PORTFOLIO', 'PROPERTY', 'SUB_PROPERTY', 'TENANT');

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "displayId" TEXT,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "documentType" "DocumentType" NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "entityType" "EntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Document_displayId_key" ON "Document"("displayId");

-- CreateIndex
CREATE INDEX "Document_ownerId_entityType_entityId_idx" ON "Document"("ownerId", "entityType", "entityId");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
