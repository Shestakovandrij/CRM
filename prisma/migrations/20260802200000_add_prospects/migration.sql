-- CreateEnum
CREATE TYPE "ProspectStatus" AS ENUM ('NEW', 'APPROVED', 'REJECTED', 'QUEUED');

-- CreateEnum
CREATE TYPE "SeedType" AS ENUM ('SIMILAR', 'HASHTAG', 'GEO');

-- CreateTable
CREATE TABLE "Prospect" (
    "id" TEXT NOT NULL,
    "instagram" TEXT NOT NULL,
    "status" "ProspectStatus" NOT NULL DEFAULT 'NEW',
    "fullName" TEXT,
    "bio" TEXT,
    "category" TEXT,
    "followers" INTEGER,
    "postsCount" INTEGER,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "externalUrl" TEXT,
    "hasWebsite" BOOLEAN NOT NULL DEFAULT false,
    "siteEvidence" TEXT,
    "source" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "campaignId" TEXT,
    "notes" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prospect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectSeed" (
    "id" TEXT NOT NULL,
    "type" "SeedType" NOT NULL,
    "value" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "lastRunAt" TIMESTAMP(3),
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "foundCount" INTEGER NOT NULL DEFAULT 0,
    "exhausted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProspectSeed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Prospect_instagram_key" ON "Prospect"("instagram");

-- CreateIndex
CREATE INDEX "Prospect_status_idx" ON "Prospect"("status");

-- CreateIndex
CREATE INDEX "Prospect_status_score_idx" ON "Prospect"("status", "score");

-- CreateIndex
CREATE INDEX "ProspectSeed_exhausted_priority_idx" ON "ProspectSeed"("exhausted", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "ProspectSeed_type_value_key" ON "ProspectSeed"("type", "value");

