-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "niche" TEXT;

-- AlterTable
ALTER TABLE "CampaignRecipient" ADD COLUMN     "niche" TEXT;

-- CreateTable
CREATE TABLE "BroadcastLead" (
    "id" TEXT NOT NULL,
    "instagram" TEXT NOT NULL,
    "niche" TEXT,
    "sendCount" INTEGER NOT NULL DEFAULT 0,
    "firstSentAt" TIMESTAMP(3),
    "lastSentAt" TIMESTAMP(3),
    "lastStatus" "RecipientStatus" NOT NULL DEFAULT 'SENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BroadcastLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BroadcastSend" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "campaignId" TEXT,
    "campaignName" TEXT NOT NULL,
    "messageText" TEXT NOT NULL,
    "niche" TEXT,
    "status" "RecipientStatus" NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BroadcastSend_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BroadcastLead_instagram_key" ON "BroadcastLead"("instagram");

-- CreateIndex
CREATE INDEX "BroadcastLead_niche_idx" ON "BroadcastLead"("niche");

-- CreateIndex
CREATE INDEX "BroadcastLead_lastSentAt_idx" ON "BroadcastLead"("lastSentAt");

-- CreateIndex
CREATE INDEX "BroadcastSend_leadId_idx" ON "BroadcastSend"("leadId");

-- CreateIndex
CREATE INDEX "BroadcastSend_sentAt_idx" ON "BroadcastSend"("sentAt");

-- AddForeignKey
ALTER TABLE "BroadcastSend" ADD CONSTRAINT "BroadcastSend_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "BroadcastLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

