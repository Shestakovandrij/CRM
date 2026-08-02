-- CreateEnum
CREATE TYPE "ScoutRunStatus" AS ENUM ('REQUESTED', 'RUNNING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "ScoutRun" (
    "id" TEXT NOT NULL,
    "status" "ScoutRunStatus" NOT NULL DEFAULT 'REQUESTED',
    "limit" INTEGER,
    "visited" INTEGER NOT NULL DEFAULT 0,
    "added" INTEGER NOT NULL DEFAULT 0,
    "duplicates" INTEGER NOT NULL DEFAULT 0,
    "withSite" INTEGER NOT NULL DEFAULT 0,
    "lastSeed" TEXT,
    "error" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "ScoutRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScoutRun_status_requestedAt_idx" ON "ScoutRun"("status", "requestedAt");

