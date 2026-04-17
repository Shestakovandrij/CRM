import "dotenv/config";
import { Bot, Context } from "grammy";
import { InstagramBot } from "./instagram.js";
import { CrmApi } from "./api.js";

const BOT_TOKEN = process.env.BOT_TOKEN!;
const BOT_SECRET = process.env.BOT_SECRET!;
const CRM_URL = process.env.CRM_URL || "http://localhost:3000";
const MIN_DELAY = parseInt(process.env.MIN_DELAY || "55000");
const MAX_DELAY = parseInt(process.env.MAX_DELAY || "75000");

if (!BOT_TOKEN) throw new Error("BOT_TOKEN не налаштований у .env");
if (!BOT_SECRET) throw new Error("BOT_SECRET не налаштований у .env");

const bot = new Bot(BOT_TOKEN);
const api = new CrmApi(CRM_URL, BOT_SECRET);
const ig = new InstagramBot();

// Worker state
let activeCampaignId: string | null = null;
let isWorkerRunning = false;
let shouldStop = false;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function randomDelay() {
  return sleep(MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY));
}

async function ensureInstagramReady(ctx: Context): Promise<boolean> {
  if (!(ig as any).browser) {
    await ctx.reply("🚀 Запускаю браузер...");
    await ig.launch(false);
  }

  const loggedIn = await ig.isLoggedIn();
  if (!loggedIn) {
    const user = process.env.INSTAGRAM_USERNAME;
    const pass = process.env.INSTAGRAM_PASSWORD;

    if (!user || !pass) {
      await ctx.reply(
        "❌ Instagram не авторизований.\n\n" +
        "Додай в bot/.env:\n" +
        "INSTAGRAM_USERNAME=твій_нікнейм\n" +
        "INSTAGRAM_PASSWORD=твій_пароль\n\n" +
        "Або запусти `npm run login` для ручного логіну."
      );
      return false;
    }

    await ctx.reply("🔐 Логінюся в Instagram...");
    try {
      await ig.login(user, pass);
      await ctx.reply("✅ Instagram: успішно авторизовано!");
    } catch (e) {
      await ctx.reply(`❌ Помилка логіну в Instagram: ${(e as Error).message}`);
      return false;
    }
  }

  return true;
}

async function runWorker(campaignId: string, ctx: Context) {
  isWorkerRunning = true;
  shouldStop = false;
  activeCampaignId = campaignId;
  let sentCount = 0;
  let errorCount = 0;

  await ctx.reply(`▶️ Починаю розсилку кампанії \`${campaignId}\`\nЗатримка між повідомленнями: ${Math.round(MIN_DELAY / 1000)}–${Math.round(MAX_DELAY / 1000)} сек`, { parse_mode: "Markdown" });

  while (!shouldStop) {
    try {
      const { recipient, campaignStatus } = await api.getNextInQueue(campaignId);

      if (campaignStatus === "PAUSED") {
        await ctx.reply("⏸ Кампанія призупинена. Надіслано: " + sentCount + ", помилок: " + errorCount);
        break;
      }

      if (campaignStatus === "COMPLETED" || !recipient) {
        await ctx.reply(
          `✅ Розсилку завершено!\n\n` +
          `📤 Надіслано: ${sentCount}\n` +
          `❌ Помилок: ${errorCount}`
        );
        break;
      }

      // Send DM
      try {
        await ig.sendDM(recipient.instagramUsername, recipient.messageText);
        await api.updateRecipient(campaignId, recipient.id, {
          status: "SENT",
          sentAt: new Date().toISOString(),
        });
        sentCount++;
        await ctx.reply(`✅ @${recipient.instagramUsername} — надіслано (${sentCount} всього)`);
      } catch (e) {
        const errMsg = (e as Error).message;
        const status = errMsg === "NOT_FOUND" ? "NOT_FOUND" : "ERROR";

        await api.updateRecipient(campaignId, recipient.id, {
          status,
          errorMessage: errMsg,
        });
        errorCount++;
        await ctx.reply(`❌ @${recipient.instagramUsername} — ${status === "NOT_FOUND" ? "акаунт не знайдено" : "помилка: " + errMsg}`);
      }

      // Wait before next send (unless it was the last one)
      if (!shouldStop) {
        const delay = MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY);
        const delaySeconds = Math.round(delay / 1000);
        await ctx.reply(`⏳ Чекаю ${delaySeconds} сек до наступного...`);
        await sleep(delay);
      }
    } catch (e) {
      await ctx.reply(`⚠️ Помилка воркера: ${(e as Error).message}`);
      await sleep(5000);
    }
  }

  isWorkerRunning = false;
  activeCampaignId = null;
}

// ── Commands ────────────────────────────────────────────────────────

bot.command("start", async (ctx) => {
  await ctx.reply(
    `👋 CRM Instagram Bot\n\n` +
    `Команди:\n` +
    `/campaigns — список кампаній\n` +
    `/run <id> — запустити розсилку\n` +
    `/pause — призупинити\n` +
    `/resume — продовжити\n` +
    `/status — поточний стан\n` +
    `/login — авторизуватись в Instagram\n\n` +
    `ID кампаній знаходяться в CRM на вкладці Campaigns.`
  );
});

bot.command("campaigns", async (ctx) => {
  try {
    const campaigns = await api.getCampaigns();
    if (!campaigns.length) {
      return ctx.reply("Кампаній немає. Створи в CRM на вкладці Campaigns.");
    }

    const statusEmoji: Record<string, string> = {
      DRAFT: "📝", RUNNING: "▶️", PAUSED: "⏸", COMPLETED: "✅",
    };

    const lines = campaigns.map((c) => {
      const total = c.recipients?.length || 0;
      const sent = c.recipients?.filter((r) => r.status === "SENT").length || 0;
      return `${statusEmoji[c.status] || "•"} *${c.name}* (${sent}/${total})\n  \`${c.id}\``;
    });

    await ctx.reply("📋 *Кампанії:*\n\n" + lines.join("\n\n"), { parse_mode: "Markdown" });
  } catch (e) {
    await ctx.reply("❌ Не вдалося отримати кампанії. Перевір CRM_URL і BOT_SECRET.");
  }
});

bot.command("run", async (ctx) => {
  if (isWorkerRunning) {
    return ctx.reply(`⚠️ Вже запущена кампанія \`${activeCampaignId}\`. Спочатку зупини: /pause`);
  }

  const campaignId = ctx.match?.trim();
  if (!campaignId) {
    return ctx.reply("Вкажи ID кампанії: /run <id>\nID знайдеш у CRM на сторінці кампанії.");
  }

  const ready = await ensureInstagramReady(ctx);
  if (!ready) return;

  try {
    await api.setCampaignStatus(campaignId, "RUNNING");
    runWorker(campaignId, ctx);
  } catch (e) {
    await ctx.reply(`❌ Не вдалося запустити: ${(e as Error).message}`);
  }
});

bot.command("pause", async (ctx) => {
  if (!isWorkerRunning || !activeCampaignId) {
    return ctx.reply("Зараз нічого не запущено.");
  }

  shouldStop = true;
  await api.setCampaignStatus(activeCampaignId, "PAUSED");
  await ctx.reply("⏸ Надіслано сигнал паузи. Зупиниться після поточного повідомлення...");
});

bot.command("resume", async (ctx) => {
  if (isWorkerRunning) {
    return ctx.reply(`⚠️ Вже запущено: \`${activeCampaignId}\``, { parse_mode: "Markdown" });
  }

  const campaignId = ctx.match?.trim() || activeCampaignId;
  if (!campaignId) {
    return ctx.reply("Вкажи ID: /resume <id>");
  }

  const ready = await ensureInstagramReady(ctx);
  if (!ready) return;

  await api.setCampaignStatus(campaignId, "RUNNING");
  runWorker(campaignId, ctx);
});

bot.command("status", async (ctx) => {
  if (!isWorkerRunning || !activeCampaignId) {
    return ctx.reply("🔴 Нічого не запущено.");
  }

  try {
    const campaign = await api.getCampaign(activeCampaignId);
    const total = campaign.recipients?.length || 0;
    const sent = campaign.recipients?.filter((r) => r.status === "SENT").length || 0;
    const errors = campaign.recipients?.filter((r) => r.status === "ERROR" || r.status === "NOT_FOUND").length || 0;
    const pending = campaign.recipients?.filter((r) => r.status === "PENDING" || r.status === "SENDING").length || 0;

    await ctx.reply(
      `▶️ *${campaign.name}*\n\n` +
      `✅ Надіслано: ${sent}\n` +
      `❌ Помилок: ${errors}\n` +
      `⏳ В черзі: ${pending}\n` +
      `📊 Всього: ${total}`,
      { parse_mode: "Markdown" }
    );
  } catch (e) {
    await ctx.reply("Не вдалося отримати статус.");
  }
});

bot.command("login", async (ctx) => {
  await ctx.reply("🔐 Запускаю браузер для авторизації в Instagram...\nЗайдіть у вікно браузера і залогіньтесь вручну.\nПісля успішного логіну напишіть /logindone");
  if (!(ig as any).browser) {
    await ig.launch(false);
  }
});

bot.command("logindone", async (ctx) => {
  try {
    await ig.saveSession();
    await ctx.reply("✅ Сесію збережено! Тепер бот буде використовувати збережену сесію.");
  } catch (e) {
    await ctx.reply("❌ Не вдалося зберегти сесію: " + (e as Error).message);
  }
});

// Error handler
bot.catch((err) => {
  console.error("Bot error:", err);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  shouldStop = true;
  await ig.close();
  process.exit(0);
});

console.log("🤖 Bot started. Listening...");
bot.start();
