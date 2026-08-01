-- Колонку Task.assignee було додано в базу через `prisma db push` без міграції.
-- Фіксуємо її в історії, щоб чиста база розгорталась ідентично до продової.
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "assignee" TEXT;

-- Prisma не створює індекси під зовнішні ключі в PostgreSQL.
-- CampaignRecipient — єдина таблиця, що росте з кожною розсилкою, і саме по ній
-- бʼють запити списку отримувачів та черги бота.
CREATE INDEX IF NOT EXISTS "CampaignRecipient_campaignId_idx" ON "CampaignRecipient"("campaignId");
CREATE INDEX IF NOT EXISTS "CampaignRecipient_campaignId_status_idx" ON "CampaignRecipient"("campaignId", "status");
