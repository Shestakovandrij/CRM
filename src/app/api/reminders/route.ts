import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendTelegram(text: string) {
  if (!BOT_TOKEN || !CHAT_ID) return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text,
      parse_mode: "HTML",
    }),
  });
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.BOT_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const [tasks, leads] = await Promise.all([
    db.task.findMany({
      where: { remindAt: { lte: now }, remindSent: false },
      include: { lead: { select: { name: true } } },
    }),
    db.lead.findMany({
      where: { remindAt: { lte: now }, remindSent: false },
    }),
  ]);

  let sent = 0;

  for (const task of tasks) {
    const who = task.lead ? ` (${task.lead.name})` : "";
    await sendTelegram(
      `🔔 <b>Нагадування про задачу</b>\n\n` +
      `📋 ${task.title}${who}\n` +
      `⚡ Пріоритет: ${task.priority}\n` +
      (task.deadline ? `📅 Дедлайн: ${task.deadline.toLocaleDateString("uk-UA")}\n` : "") +
      `\n👉 Відкрий CRM для деталей`
    );
    await db.task.update({ where: { id: task.id }, data: { remindSent: true } });
    sent++;
  }

  for (const lead of leads) {
    await sendTelegram(
      `🔔 <b>Нагадування про ліда</b>\n\n` +
      `👤 ${lead.name}\n` +
      (lead.status ? `📊 Статус: ${lead.status}\n` : "") +
      (lead.instagram ? `📸 @${lead.instagram}\n` : "") +
      (lead.telegram ? `✈️ @${lead.telegram}\n` : "") +
      `\n👉 Відкрий CRM для деталей`
    );
    await db.lead.update({ where: { id: lead.id }, data: { remindSent: true } });
    sent++;
  }

  return NextResponse.json({ ok: true, sent });
}
