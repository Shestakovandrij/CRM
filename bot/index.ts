import "dotenv/config";
import { Bot } from "grammy";
import { InstagramBot } from "./instagram.js";
import { CrmApi } from "./api.js";

const BOT_TOKEN  = process.env.BOT_TOKEN!;
const BOT_SECRET = process.env.BOT_SECRET!;
const CRM_URL    = process.env.CRM_URL || "http://localhost:3000";
const MIN_DELAY  = parseInt(process.env.MIN_DELAY  || "55000");
const MAX_DELAY  = parseInt(process.env.MAX_DELAY  || "75000");
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || "15000");

if (!BOT_TOKEN)  throw new Error("BOT_TOKEN не налаштований у .env");
if (!BOT_SECRET) throw new Error("BOT_SECRET не налаштований у .env");

const bot = new Bot(BOT_TOKEN);
const api = new CrmApi(CRM_URL, BOT_SECRET);
const ig  = new InstagramBot();

// ── State ───────────────────────────────────────────────────────────
let activeCampaignId: string | null = null;
let isWorkerRunning  = false;
let shouldStop       = false;

// Admin chatId — зберігається при першому /start, або з env
let adminChatId: number | null = process.env.TELEGRAM_CHAT_ID
  ? parseInt(process.env.TELEGRAM_CHAT_ID)
  : null;

// ── Helpers ─────────────────────────────────────────────────────────
function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function notify(text: string, opts?: Record<string, unknown>) {
  if (!adminChatId) return;
  try {
    await bot.api.sendMessage(adminChatId, text, opts as any);
  } catch (e) {
    console.error("notify error:", (e as Error).message);
  }
}

// ── Instagram init ───────────────────────────────────────────────────
async function ensureInstagramReady(): Promise<boolean> {
  if (!(ig as any).browser) {
    await notify("🚀 Запускаю браузер Instagram...");
    await ig.launch(true); // headless on server
  }

  const loggedIn = await ig.isLoggedIn();
  if (!loggedIn) {
    const user = process.env.INSTAGRAM_USERNAME;
    const pass = process.env.INSTAGRAM_PASSWORD;

    if (!user || !pass) {
      await notify(
        "❌ Instagram не авторизований.\n\n" +
        "Додай в bot/.env:\n" +
        "INSTAGRAM_USERNAME=твій_нікнейм\n" +
        "INSTAGRAM_PASSWORD=твій_пароль"
      );
      return false;
    }

    await notify("🔐 Логінюся в Instagram...");
    try {
      await ig.login(user, pass);
      await notify("✅ Instagram авторизовано!");
    } catch (e) {
      await notify(`❌ Помилка логіну: ${(e as Error).message}`);
      return false;
    }
  }

  return true;
}

// ── Worker ───────────────────────────────────────────────────────────
// Приймає chatId напряму — не залежить від Telegram ctx
async function runWorker(campaignId: string) {
  isWorkerRunning  = true;
  shouldStop       = false;
  activeCampaignId = campaignId;
  let sentCount  = 0;
  let errorCount = 0;

  await notify(
    `▶️ Кампанія запущена автоматично з CRM\n` +
    `ID: \`${campaignId}\`\n` +
    `Затримка: ${Math.round(MIN_DELAY / 1000)}–${Math.round(MAX_DELAY / 1000)} сек між повідомленнями`,
    { parse_mode: "Markdown" }
  );

  while (!shouldStop) {
    try {
      const { recipient, campaignStatus } = await api.getNextInQueue(campaignId);

      if (campaignStatus === "PAUSED") {
        await notify(`⏸ Кампанію призупинено з CRM.\nНадіслано: ${sentCount}, помилок: ${errorCount}`);
        break;
      }

      if (campaignStatus === "COMPLETED" || !recipient) {
        await notify(
          `✅ Розсилку завершено!\n\n` +
          `📤 Надіслано: ${sentCount}\n` +
          `❌ Помилок: ${errorCount}`
        );
        break;
      }

      try {
        await ig.sendDM(recipient.instagramUsername, recipient.messageText);
        await api.updateRecipient(campaignId, recipient.id, {
          status: "SENT",
          sentAt: new Date().toISOString(),
        });
        sentCount++;
        await notify(`✅ @${recipient.instagramUsername} — надіслано (${sentCount} всього)`);
      } catch (e) {
        const errMsg = (e as Error).message;
        const status = errMsg === "NOT_FOUND" ? "NOT_FOUND" : "ERROR";
        await api.updateRecipient(campaignId, recipient.id, {
          status,
          errorMessage: errMsg,
        });
        errorCount++;
        await notify(`❌ @${recipient.instagramUsername} — ${status === "NOT_FOUND" ? "акаунт не знайдено" : errMsg}`);
      }

      if (!shouldStop) {
        const delay = MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY);
        await notify(`⏳ Чекаю ${Math.round(delay / 1000)} сек...`);
        await sleep(delay);
      }
    } catch (e) {
      await notify(`⚠️ Помилка: ${(e as Error).message}`);
      await sleep(5000);
    }
  }

  isWorkerRunning  = false;
  activeCampaignId = null;
}

// ── AUTO-POLL — серце нової логіки ───────────────────────────────────
// Кожні POLL_INTERVAL мс перевіряє чи є RUNNING кампанія в CRM.
// Якщо є — автоматично запускає воркер БЕЗ будь-яких команд в Telegram.
async function startAutoPoll() {
  console.log(`🔄 Auto-poll запущено (інтервал: ${POLL_INTERVAL / 1000}с)`);

  while (true) {
    await sleep(POLL_INTERVAL);

    if (isWorkerRunning) continue; // вже працює

    try {
      const campaigns = await api.getCampaigns();
      const running = campaigns.find((c) => c.status === "RUNNING");

      if (running) {
        console.log(`📡 Знайдено RUNNING кампанію: ${running.id} — запускаю авто-воркер`);
        const ready = await ensureInstagramReady();
        if (ready) {
          runWorker(running.id); // не await — запускаємо у фоні
        }
      }
    } catch (e) {
      console.error("Auto-poll error:", (e as Error).message);
    }
  }
}

// ── Telegram команди ─────────────────────────────────────────────────

bot.command("start", async (ctx) => {
  adminChatId = ctx.chat.id;
  await ctx.reply(
    `👋 *CRM Instagram Bot підключено!*\n\n` +
    `Тепер розсилки запускаються АВТОМАТИЧНО з CRM — просто натисни кнопку *Запустити* на сторінці кампанії.\n\n` +
    `Ручні команди:\n` +
    `/campaigns — список кампаній\n` +
    `/run <id> — запустити вручну\n` +
    `/pause — призупинити\n` +
    `/status — поточний стан`,
    { parse_mode: "Markdown" }
  );
});

bot.command("campaigns", async (ctx) => {
  if (!adminChatId) adminChatId = ctx.chat.id;
  try {
    const campaigns = await api.getCampaigns();
    if (!campaigns.length) {
      return ctx.reply("Кампаній немає. Створи в CRM на вкладці Campaigns.");
    }
    const emoji: Record<string, string> = {
      DRAFT: "📝", RUNNING: "▶️", PAUSED: "⏸", COMPLETED: "✅",
    };
    const lines = campaigns.map((c) => {
      const total = c.recipients?.length || 0;
      const sent  = c.recipients?.filter((r) => r.status === "SENT").length || 0;
      return `${emoji[c.status] || "•"} *${c.name}* (${sent}/${total})\n  \`${c.id}\``;
    });
    await ctx.reply("📋 *Кампанії:*\n\n" + lines.join("\n\n"), { parse_mode: "Markdown" });
  } catch (e) {
    await ctx.reply("❌ Не вдалося отримати кампанії.");
  }
});

bot.command("run", async (ctx) => {
  if (!adminChatId) adminChatId = ctx.chat.id;
  if (isWorkerRunning) {
    return ctx.reply(`⚠️ Вже запущена: \`${activeCampaignId}\`\nЗупини: /pause`, { parse_mode: "Markdown" });
  }
  const campaignId = ctx.match?.trim();
  if (!campaignId) {
    return ctx.reply("Вкажи ID: /run <id>");
  }
  const ready = await ensureInstagramReady();
  if (!ready) return;
  try {
    await api.setCampaignStatus(campaignId, "RUNNING");
    runWorker(campaignId);
  } catch (e) {
    await ctx.reply(`❌ ${(e as Error).message}`);
  }
});

bot.command("pause", async (ctx) => {
  if (!adminChatId) adminChatId = ctx.chat.id;
  if (!isWorkerRunning || !activeCampaignId) {
    return ctx.reply("Зараз нічого не запущено.");
  }
  shouldStop = true;
  await api.setCampaignStatus(activeCampaignId, "PAUSED");
  await ctx.reply("⏸ Сигнал паузи надіслано. Зупиниться після поточного повідомлення.");
});

bot.command("status", async (ctx) => {
  if (!adminChatId) adminChatId = ctx.chat.id;
  if (!isWorkerRunning || !activeCampaignId) {
    return ctx.reply("🔴 Нічого не запущено.");
  }
  try {
    const c     = await api.getCampaign(activeCampaignId);
    const total   = c.recipients?.length || 0;
    const sent    = c.recipients?.filter((r) => r.status === "SENT").length || 0;
    const errors  = c.recipients?.filter((r) => r.status === "ERROR" || r.status === "NOT_FOUND").length || 0;
    const pending = c.recipients?.filter((r) => r.status === "PENDING" || r.status === "SENDING").length || 0;
    await ctx.reply(
      `▶️ *${c.name}*\n\n✅ ${sent}  ❌ ${errors}  ⏳ ${pending}  📊 ${total}`,
      { parse_mode: "Markdown" }
    );
  } catch {
    await ctx.reply("Не вдалося отримати статус.");
  }
});

bot.command("login", async (ctx) => {
  if (!adminChatId) adminChatId = ctx.chat.id;
  await ctx.reply("🔐 Запускаю браузер для ручного логіну...");
  if (!(ig as any).browser) await ig.launch(false);
});

bot.command("logindone", async (ctx) => {
  try {
    await ig.saveSession();
    await ctx.reply("✅ Сесію збережено!");
  } catch (e) {
    await ctx.reply("❌ " + (e as Error).message);
  }
});

// ── Error handler & shutdown ─────────────────────────────────────────
bot.catch((err) => console.error("Bot error:", err));

process.on("SIGINT", async () => {
  shouldStop = true;
  await ig.close();
  process.exit(0);
});

// ── Start ─────────────────────────────────────────────────────────────
console.log("🤖 Bot started. Listening for Telegram commands...");
console.log(`📡 Auto-poll: кожні ${POLL_INTERVAL / 1000}с перевіряю RUNNING кампанії в CRM`);
if (adminChatId) console.log(`💬 Admin chat ID: ${adminChatId}`);

bot.start();
startAutoPoll(); // запускаємо паралельно
