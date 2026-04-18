import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function isBotRequest(req: Request) {
  return req.headers.get("x-bot-secret") === process.env.BOT_SECRET;
}

// Викликає бот HTTP API щоб миттєво запустити/зупинити воркер.
// Якщо BOT_HTTP_URL не налаштований або бот недоступний — просто ігноруємо.
async function triggerBot(action: "run" | "pause", campaignId?: string) {
  const botUrl = process.env.BOT_HTTP_URL;
  if (!botUrl) return;

  try {
    const res = await fetch(`${botUrl}/${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bot-secret": process.env.BOT_SECRET!,
      },
      body: action === "run" ? JSON.stringify({ campaignId }) : "{}",
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(`[triggerBot/${action}] HTTP ${res.status}:`, text.slice(0, 200));
    } else {
      console.log(`[triggerBot/${action}] OK — campaignId: ${campaignId}`);
    }
  } catch (e) {
    // Не ламаємо CRM якщо бот недоступний
    console.warn(`[triggerBot/${action}] Failed:`, (e as Error).message);
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session && !isBotRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const campaign = await db.campaign.findUnique({
    where: { id },
    include: { recipients: { orderBy: { createdAt: "asc" } } },
  });

  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(campaign);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session && !isBotRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  if (body.resetQueue) {
    await db.campaignRecipient.updateMany({
      where: { campaignId: id, status: { in: ["ERROR", "NOT_FOUND", "SENDING"] } },
      data: { status: "PENDING", errorMessage: null },
    });
  }

  const campaign = await db.campaign.update({
    where: { id },
    data: {
      ...(body.name   !== undefined && { name: body.name }),
      ...(body.status !== undefined && { status: body.status }),
    },
  });

  // Миттєвий тригер боту при зміні статусу
  if (body.status === "RUNNING") {
    await triggerBot("run", id);
  } else if (body.status === "PAUSED") {
    await triggerBot("pause");
  }

  return NextResponse.json(campaign);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.campaign.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
