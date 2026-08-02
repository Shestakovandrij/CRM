-- AlterTable
-- Канонічний шаблон для NOT NULL без дефолту в схемі: спершу додаємо колонку
-- зі значенням для наявних рядків, потім прибираємо DEFAULT, бо Prisma
-- проставляє updatedAt сама через @updatedAt.
ALTER TABLE "ScoutRun" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ScoutRun" ALTER COLUMN "updatedAt" DROP DEFAULT;
