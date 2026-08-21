-- CreateEnum
CREATE TYPE "SubPropertyStatus" AS ENUM ('OCCUPIED', 'VACANT', 'MAINTENANCE');

-- CreateTable
CREATE TABLE "SubProperty" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unitNumber" TEXT NOT NULL,
    "floor" TEXT,
    "areaSqft" DOUBLE PRECISION,
    "rentAmount" DOUBLE PRECISION NOT NULL,
    "status" "SubPropertyStatus" NOT NULL DEFAULT 'VACANT',
    "propertyId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubProperty_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SubProperty" ADD CONSTRAINT "SubProperty_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubProperty" ADD CONSTRAINT "SubProperty_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
