-- CreateEnum
CREATE TYPE "EmailTemplate" AS ENUM ('PAYMENT_RECEIVED', 'RENT_OVERDUE_REMINDER', 'LEASE_EXPIRY_WARNING', 'WELCOME_OWNER', 'UTILITY_BILL_OVERDUE');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('SENT', 'FAILED');

-- CreateTable
CREATE TABLE "NotificationConfig" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "rentReminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "rentReminderIntervalDays" INTEGER NOT NULL DEFAULT 10,
    "leaseExpiryEnabled" BOOLEAN NOT NULL DEFAULT true,
    "leaseExpiryDays" INTEGER[] DEFAULT ARRAY[60, 30, 14]::INTEGER[],
    "paymentConfirmEnabled" BOOLEAN NOT NULL DEFAULT true,
    "utilityReminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "welcomeEmailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "templateType" "EmailTemplate" NOT NULL,
    "entityId" TEXT,
    "entityType" TEXT,
    "resendId" TEXT,
    "status" "EmailStatus" NOT NULL DEFAULT 'SENT',
    "error" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationConfig_ownerId_key" ON "NotificationConfig"("ownerId");

-- CreateIndex
CREATE INDEX "EmailLog_entityId_templateType_idx" ON "EmailLog"("entityId", "templateType");

-- CreateIndex
CREATE INDEX "EmailLog_ownerId_sentAt_idx" ON "EmailLog"("ownerId", "sentAt");

-- AddForeignKey
ALTER TABLE "NotificationConfig" ADD CONSTRAINT "NotificationConfig_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
