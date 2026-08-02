import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function isBotRequest(req: Request) {
  return req.headers.get("x-bot-secret") === process.env.BOT_SECRET;
}

/** Бот бере наступні насінини для обходу: спершу ті, що ще не запускались. */
export async function GET(req: Request) {
  const session = await auth();
  if (!session && !isBotRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const take = Math.min(Number(url.searchParams.get("take") ?? 10), 50);

  const seeds = await db.prospectSeed.findMany({
    where: { exhausted: false },
    orderBy: [{ lastRunAt: { sort: "asc", nulls: "first" } }, { priority: "desc" }],
    take,
  });

  return NextResponse.json(seeds);
}

/** Позначити насінину обробленою. */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session && !isBotRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, foundCount, exhausted } = await req.json();

  const seed = await db.prospectSeed.update({
    where: { id },
    data: {
      lastRunAt: new Date(),
      runCount: { increment: 1 },
      ...(foundCount != null && { foundCount: { increment: Number(foundCount) } }),
      ...(exhausted != null && { exhausted: Boolean(exhausted) }),
    },
  });

  return NextResponse.json(seed);
}
