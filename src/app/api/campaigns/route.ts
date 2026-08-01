import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function isBotRequest(req: Request) {
  return req.headers.get("x-bot-secret") === process.env.BOT_SECRET;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session && !isBotRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Рахуємо статуси в базі, а не вивантажуємо всі рядки отримувачів у браузер.
  const [campaigns, counts] = await Promise.all([
    db.campaign.findMany({ orderBy: { createdAt: "desc" } }),
    db.campaignRecipient.groupBy({
      by: ["campaignId", "status"],
      _count: { _all: true },
    }),
  ]);

  const byCampaign = new Map<string, Record<string, number>>();
  for (const c of counts) {
    const stats = byCampaign.get(c.campaignId) ?? {};
    stats[c.status] = c._count._all;
    byCampaign.set(c.campaignId, stats);
  }

  return NextResponse.json(
    campaigns.map((c) => {
      const stats = byCampaign.get(c.id) ?? {};
      const total = Object.values(stats).reduce((a, n) => a + n, 0);
      return { ...c, stats, _count: { recipients: total } };
    }),
  );
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session && !isBotRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const campaign = await db.campaign.create({ data: { name: name.trim() } });
  return NextResponse.json(campaign, { status: 201 });
}
