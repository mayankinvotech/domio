-- Add account/display IDs
ALTER TABLE "User" ADD COLUMN "accountId" TEXT;
ALTER TABLE "Portfolio" ADD COLUMN "displayId" TEXT;
ALTER TABLE "Property" ADD COLUMN "displayId" TEXT;
ALTER TABLE "SubProperty" ADD COLUMN "displayId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "displayId" TEXT;
ALTER TABLE "Tenancy" ADD COLUMN "displayId" TEXT;

-- Unique account ID per user (nullable; only owners get one)
CREATE UNIQUE INDEX "User_accountId_key" ON "User"("accountId");
