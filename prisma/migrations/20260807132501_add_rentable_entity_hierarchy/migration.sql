-- CreateEnum
CREATE TYPE "RentableEntityType" AS ENUM ('PROPERTY', 'FLOOR', 'ROOM', 'BED');

-- DropForeignKey
ALTER TABLE "Tenancy" DROP CONSTRAINT "Tenancy_subPropertyId_fkey";

-- AlterTable
ALTER TABLE "Tenancy" ADD COLUMN     "rentableEntityId" TEXT,
ALTER COLUMN "subPropertyId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "RentableEntity" (
    "id" TEXT NOT NULL,
    "displayId" TEXT,
    "type" "RentableEntityType" NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "areaSqft" DOUBLE PRECISION,
    "rentAmount" DOUBLE PRECISION NOT NULL,
    "status" "SubPropertyStatus" NOT NULL DEFAULT 'VACANT',
    "notes" TEXT,
    "sortOrder" INTEGER,
    "parentId" TEXT,
    "propertyId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentableEntity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RentableEntity_propertyId_idx" ON "RentableEntity"("propertyId");

-- CreateIndex
CREATE INDEX "RentableEntity_parentId_idx" ON "RentableEntity"("parentId");

-- CreateIndex
CREATE INDEX "RentableEntity_ownerId_idx" ON "RentableEntity"("ownerId");

-- AddForeignKey
ALTER TABLE "RentableEntity" ADD CONSTRAINT "RentableEntity_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "RentableEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentableEntity" ADD CONSTRAINT "RentableEntity_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentableEntity" ADD CONSTRAINT "RentableEntity_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenancy" ADD CONSTRAINT "Tenancy_subPropertyId_fkey" FOREIGN KEY ("subPropertyId") REFERENCES "SubProperty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenancy" ADD CONSTRAINT "Tenancy_rentableEntityId_fkey" FOREIGN KEY ("rentableEntityId") REFERENCES "RentableEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
