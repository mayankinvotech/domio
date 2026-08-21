-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "unitsExpanded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "unitsGroupBy" TEXT NOT NULL DEFAULT 'custom';

-- AlterTable
ALTER TABLE "SubProperty" ADD COLUMN     "sortOrder" INTEGER;
