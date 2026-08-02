import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function isBotRequest(req: Request) {
  return req.headers.get("x-bot-secret") === process.env.BOT_SECRET;
}

/** Замовлення вважається протухлим, якщо бот не забрав його за 10 хвилин. */
const STALE_MINUTES = 10;
/** Розвідка без жодного руху 15 хвилин — бот найпевніше впав посеред роботи. */
const STUCK_MINUTES = 15;

/** Кнопка «Розвідка» — лишає замовлення, яке бот забере при наступному опитуванні. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  // Замовлення, що зависло після падіння бота, не має блокувати кнопку назавжди.
  await db.scoutRun.updateMany({
    where: {
      status: "RUNNING",
      updatedAt: { lt: new Date(Date.now() - STUCK_MINUTES * 60_000) },
    },
    data: { status: "FAILED", error: "Бот перестав відповідати", finishedAt: new Date() },
  });

  const active = await db.scoutRun.findFirst({
    where: { status: { in: ["REQUESTED", "RUNNING"] } },
    orderBy: { requestedAt: "desc" },
  });
  if (active) {
    return NextResponse.json(
      { error: active.status === "RUNNING" ? "Розвідка вже виконується" : "Замовлення вже в черзі", run: active },
      { status: 409 },
    );
  }

  const run = await db.scoutRun.create({
    data: { limit: body.limit ? Number(body.limit) : null },
  });

  return NextResponse.json({ started: true, run }, { status: 202 });
}

/** Стан для індикатора в CRM. */
export async function GET(req: Request) {
  const session = await auth();
  if (!session && !isBotRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const run = await db.scoutRun.findFirst({ orderBy: { requestedAt: "desc" } });
  if (!run) return NextResponse.json({ running: false, queued: false });

  // Бот не забрав замовлення вчасно або замовк посеред роботи — він вимкнений.
  const notClaimed =
    run.status === "REQUESTED" && Date.now() - run.requestedAt.getTime() > STALE_MINUTES * 60_000;
  const wentSilent =
    run.status === "RUNNING" && Date.now() - run.updatedAt.getTime() > STUCK_MINUTES * 60_000;
  const stale = notClaimed || wentSilent;

  return NextResponse.json({
    running: run.status === "RUNNING" && !wentSilent,
    queued: run.status === "REQUESTED" && !notClaimed,
    stale,
    status: run.status,
    limit: run.limit,
    visited: run.visited,
    added: run.added,
    duplicates: run.duplicates,
    withSite: run.withSite,
    lastSeed: run.lastSeed,
    error: run.error,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
  });
}

/** Бот забирає замовлення і звітує про прогрес. */
export async function PATCH(req: Request) {
  if (!isBotRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // claim — бот питає, чи є для нього робота.
  if (body.claim) {
    const pending = await db.scoutRun.findFirst({
      where: { status: "REQUESTED" },
      orderBy: { requestedAt: "asc" },
    });
    if (!pending) return NextResponse.json({ run: null });

    const claimed = await db.scoutRun.update({
      where: { id: pending.id },
      data: { status: "RUNNING", startedAt: new Date() },
    });
    return NextResponse.json({ run: claimed });
  }

  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const run = await db.scoutRun.update({
    where: { id: body.id },
    data: {
      ...(body.visited != null && { visited: Number(body.visited) }),
      // Кнопка ліміт не задає — бот повідомляє той, що взяв із .env.
      ...(body.limit != null && { limit: Number(body.limit) }),
      ...(body.added != null && { added: Number(body.added) }),
      ...(body.duplicates != null && { duplicates: Number(body.duplicates) }),
      ...(body.withSite != null && { withSite: Number(body.withSite) }),
      ...(body.lastSeed !== undefined && { lastSeed: body.lastSeed }),
      ...(body.status && { status: body.status }),
      ...(body.error !== undefined && { error: body.error }),
      ...(["DONE", "FAILED"].includes(body.status) && { finishedAt: new Date() }),
    },
  });

  return NextResponse.json(run);
}
