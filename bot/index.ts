import "dotenv/config";
import { Bot } from "grammy";
import { createServer, IncomingMessage, ServerResponse } from "http";
import { InstagramBot } from "./instagram.js";
import { CrmApi } from "./api.js";

const BOT_TOKEN   = process.env.BOT_TOKEN!;
const BOT_SECRET  = process.env.BOT_SECRET!;
const CRM_URL     = process.env.CRM_URL || "http://localhost:3000";
const MIN_DELAY   = parseInt(process.env.MIN_DELAY   || "55000");
const MAX_DELAY   = parseInt(process.env.MAX_DELAY   || "75000");
const HTTP_PORT   = parseInt(process.env.BOT_HTTP_PORT || "3001");
const POLL_MS     = parseInt(process.env.POLL_INTERVAL  || "20000");

if (!BOT_TOKEN)  throw new Error("BOT_TOKEN не налаштований у bot/.env");
if (!BOT_SECRET) throw new Error("BOT_SECRET не налаштований у bot/.env");

const bot = new Bot(BOT_TOKEN);
const api = new CrmApi(CRM_URL, BOT_SECRET);
const ig  = new InstagramBot();

// ── State ────────────────────────────────────────────────────────────
let activeCampaignId: string | null = null;
let isWorkerRunning  = false;
let shouldStop       = false;
let adminChatId: number | null = process.env.TELEGRAM_CHAT_ID
  ? parseInt(process.env.TELEGRAM_CHAT_ID)
  : null;

// ── Helpers ──────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function notify(text: string, opts?: Record<string, unknown>) {
  if (!adminChatId) { console.log("[notify no chatId]", text); return; }
  try { await bot.api.sendMessage(adminChatId, text, opts as any); }
  catch (e) { console.error("notify:", (e as Error).message); }
}

// ── Instagram ─────────────────────────────────────────────────────────
async function ensureInstagramReady(): Promise<boolean> {
  if (!(ig as any).browser) {
    await notify("🚀 Запускаю браузер Instagram...");
    await ig.launch(true);
  }
  const loggedIn = await ig.isLoggedIn();
  if (!loggedIn) {
    const user = process.env.INSTAGRAM_USERNAME;
    const pass = process.env.INSTAGRAM_PASSWORD;
    if (!user || !pass) {
      await notify("❌ Instagram не авторизований. Додай INSTAGRAM_USERNAME і INSTAGRAM_PASSWORD у bot/.env");
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

// ── Worker ────────────────────────────────────────────────────────────
async function runWorker(campaignId: string) {
  isWorkerRunning  = true;
  shouldStop       = false;
  activeCampaignId = campaignId;
  let sent = 0, errors = 0;

  await notify(
    `▶️ Розсилку запущено!\nКампанія: \`${campaignId}\`\nЗатримка: ${Math.round(MIN_DELAY/1000)}–${Math.round(MAX_DELAY/1000)}с`,
    { parse_mode: "Markdown" }
  );

  while (!shouldStop) {
    try {
      const { recipient, campaignStatus } = await api.getNextInQueue(campaignId);

      if (campaignStatus === "PAUSED") {
        await notify(`⏸ Пауза.\nНадіслано: ${sent}, помилок: ${errors}`);
        break;
      }
      if (campaignStatus === "COMPLETED" || !recipient) {
        await notify(`✅ Готово!\n📤 Надіслано: ${sent}\n❌ Помилок: ${errors}`);
        break;
      }

      try {
        await ig.sendDM(recipient.instagramUsername, recipient.messageText);
        await api.updateRecipient(campaignId, recipient.id, { status: "SENT", sentAt: new Date().toISOString() });
        sent++;
        await notify(`✅ @${recipient.instagramUsername} — надіслано (${sent})`);
      } catch (e) {
        const msg = (e as Error).message;
        const status = msg === "NOT_FOUND" ? "NOT_FOUND" : "ERROR";
        await api.updateRecipient(campaignId, recipient.id, { status, errorMessage: msg });
        errors++;
        await notify(`❌ @${recipient.instagramUsername} — ${status === "NOT_FOUND" ? "не знайдено" : msg}`);
      }

      if (!shouldStop) {
        const delay = MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY);
        await notify(`⏳ Чекаю ${Math.round(delay/1000)}с...`);
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

// ── HTTP API Server ───────────────────────────────────────────────────
// CRM викликає POST /run щоб миттєво запустити кампанію.
// Не потрібен Telegram — CRM → бот напряму.
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end",  () => resolve(body));
    req.on("error", reject);
  });
}

function send(res: ServerResponse, status: number, data: object) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

const httpServer = createServer(async (req, res) => {
  // Auth
  if (req.headers["x-bot-secret"] !== BOT_SECRET) {
    return send(res, 401, { error: "Unauthorized" });
  }

  const url = req.url?.split("?")[0];

  // POST /run — запустити кампанію
  if (req.method === "POST" && url === "/run") {
    try {
      const body = JSON.parse(await readBody(req));
      const { campaignId } = body;
      if (!campaignId) return send(res, 400, { error: "campaignId required" });

      if (isWorkerRunning) {
        return send(res, 409, { error: "Already running", activeCampaignId });
      }

      const ready = await ensureInstagramReady();
      if (!ready) return send(res, 500, { error: "Instagram not ready" });

      runWorker(campaignId); // fire & forget
      return send(res, 200, { ok: true, campaignId });
    } catch (e) {
      return send(res, 500, { error: (e as Error).message });
    }
  }

  // POST /pause — зупинити
  if (req.method === "POST" && url === "/pause") {
    if (!isWorkerRunning || !activeCampaignId) {
      return send(res, 200, { ok: true, message: "Nothing running" });
    }
    shouldStop = true;
    await api.setCampaignStatus(activeCampaignId, "PAUSED");
    return send(res, 200, { ok: true });
  }

  // GET /status — поточний стан
  if (req.method === "GET" && url === "/status") {
    return send(res, 200, { isWorkerRunning, activeCampaignId });
  }

  // POST /register-chat — CRM реєструє chatId
  if (req.method === "POST" && url === "/register-chat") {
    try {
      const body = JSON.parse(await readBody(req));
      if (body.chatId) {
        adminChatId = parseInt(body.chatId);
        console.log(`💬 Chat ID зареєстровано: ${adminChatId}`);
        return send(res, 200, { ok: true, chatId: adminChatId });
      }
      return send(res, 400, { error: "chatId required" });
    } catch (e) {
      return send(res, 400, { error: "Invalid JSON" });
    }
  }

  send(res, 404, { error: "Not found" });
});

httpServer.listen(HTTP_PORT, () => {
  console.log(`🌐 Bot HTTP API: http://0.0.0.0:${HTTP_PORT}`);
  console.log(`   POST /run          — запустити кампанію`);
  console.log(`   POST /pause        — поставити на паузу`);
  console.log(`   GET  /status       — статус воркера`);
  console.log(`   POST /register-chat — зареєструвати Telegram chatId`);
});

// ── Auto-poll fallback ────────────────────────────────────────────────
// Якщо CRM не може достукатись до боту напряму — бот сам перевіряє кожні POLL_MS.
async function startAutoPoll() {
  console.log(`🔄 Auto-poll: кожні ${POLL_MS/1000}с перевіряю RUNNING кампанії`);
  while (true) {
    await sleep(POLL_MS);
    if (isWorkerRunning) continue;
    try {
      const campaigns = await api.getCampaigns();
      const running = campaigns.find((c) => c.status === "RUNNING");
      if (running) {
        console.log(`📡 Auto-poll знайшов RUNNING: ${running.id}`);
        const ready = await ensureInstagramReady();
        if (ready) runWorker(running.id);
      }
    } catch (e) {
      console.error("Auto-poll error:", (e as Error).message);
    }
  }
}

// ── Telegram команди ──────────────────────────────────────────────────
bot.command("start", async (ctx) => {
  adminChatId = ctx.chat.id;
  await ctx.reply(
    `✅ *Бот підключено!*\n\nТепер запускай кампанії прямо з CRM — натисни кнопку *Запустити* і бот автоматично почне розсилку.\n\nРучні команди:\n/campaigns — список\n/pause — зупинити\n/status — стан`,
    { parse_mode: "Markdown" }
  );
});

bot.command("campaigns", async (ctx) => {
  if (!adminChatId) adminChatId = ctx.chat.id;
  try {
    const list = await api.getCampaigns();
    if (!list.length) return ctx.reply("Кампаній немає. Створи в CRM.");
    const emoji: Record<string, string> = { DRAFT:"📝", RUNNING:"▶️", PAUSED:"⏸", COMPLETED:"✅" };
    const lines = list.map((c) => {
      const sent = c.recipients?.filter((r) => r.status === "SENT").length || 0;
      return `${emoji[c.status]||"•"} *${c.name}* (${sent}/${c.recipients?.length||0})\n  \`${c.id}\``;
    });
    await ctx.reply("📋 *Кампанії:*\n\n" + lines.join("\n\n"), { parse_mode: "Markdown" });
  } catch { await ctx.reply("❌ Помилка отримання кампаній."); }
});

// Ручний запуск — на випадок якщо HTTP не доступний
bot.command("run", async (ctx) => {
  if (!adminChatId) adminChatId = ctx.chat.id;
  if (isWorkerRunning) return ctx.reply(`⚠️ Вже запущена: \`${activeCampaignId}\`\n/pause — зупинити`, { parse_mode:"Markdown" });
  const id = ctx.match?.trim();
  if (!id) return ctx.reply("Вкажи ID: /run <id>");
  const ready = await ensureInstagramReady();
  if (!ready) return;
  await api.setCampaignStatus(id, "RUNNING");
  runWorker(id);
});

bot.command("pause", async (ctx) => {
  if (!adminChatId) adminChatId = ctx.chat.id;
  if (!isWorkerRunning || !activeCampaignId) return ctx.reply("Нічого не запущено.");
  shouldStop = true;
  await api.setCampaignStatus(activeCampaignId, "PAUSED");
  await ctx.reply("⏸ Сигнал паузи надіслано.");
});

bot.command("status", async (ctx) => {
  if (!adminChatId) adminChatId = ctx.chat.id;
  if (!isWorkerRunning || !activeCampaignId) return ctx.reply("🔴 Нічого не запущено.");
  try {
    const c = await api.getCampaign(activeCampaignId);
    const sent    = c.recipients?.filter((r) => r.status === "SENT").length || 0;
    const errors  = c.recipients?.filter((r) => r.status === "ERROR" || r.status === "NOT_FOUND").length || 0;
    const pending = c.recipients?.filter((r) => r.status === "PENDING" || r.status === "SENDING").length || 0;
    await ctx.reply(`▶️ *${c.name}*\n✅ ${sent}  ❌ ${errors}  ⏳ ${pending}`, { parse_mode:"Markdown" });
  } catch { await ctx.reply("Не вдалося отримати статус."); }
});

bot.command("login", async (ctx) => {
  if (!adminChatId) adminChatId = ctx.chat.id;
  if (!(ig as any).browser) await ig.launch(false);
  await ctx.reply("🔐 Браузер запущено. Після логіну напиши /logindone");
});
bot.command("logindone", async (ctx) => {
  try { await ig.saveSession(); await ctx.reply("✅ Сесію збережено!"); }
  catch (e) { await ctx.reply("❌ " + (e as Error).message); }
});

bot.catch((err) => console.error("Bot error:", err));

process.on("SIGINT", async () => {
  shouldStop = true;
  await ig.close();
  httpServer.close();
  process.exit(0);
});

// ── Start ─────────────────────────────────────────────────────────────
console.log("🤖 Telegram бот запущено");
if (adminChatId) console.log(`💬 Admin chat ID: ${adminChatId}`);

bot.start();
startAutoPoll();
