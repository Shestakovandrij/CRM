-- AlterEnum
ALTER TYPE "Priority" ADD VALUE 'URGENT';

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "remindAt" TIMESTAMP(3),
ADD COLUMN     "remindSent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "remindAt" TIMESTAMP(3),
ADD COLUMN     "remindSent" BOOLEAN NOT NULL DEFAULT false;
