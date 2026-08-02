import { NextResponse } from "next/server";
import type { Prisma, ProspectStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeInstagram } from "@/lib/broadcast-base";
import { detectWebsite, loadExcludedUsernames, scoreProspect } from "@/lib/prospects";

function isBotRequest(req: Request) {
  return req.headers.get("x-bot-secret") === process.env.BOT_SECRET;
}

const STATUSES: ProspectStatus[] = ["NEW", "APPROVED", "REJECTED", "QUEUED"];

export async function GET(req: Request) {
  const session = await auth();
  if (!session && !isBotRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status") ?? "NEW";
  const search = url.searchParams.get("search")?.trim();

  const where: Prisma.ProspectWhereInput = {
    ...(statusParam !== "all" && STATUSES.includes(statusParam as ProspectStatus)
      ? { status: statusParam as ProspectStatus }
      : {}),
    ...(search && { instagram: { contains: search, mode: "insensitive" } }),
  };

  const [prospects, counts] = await Promise.all([
    db.prospect.findMany({
      where,
      orderBy: [{ score: "desc" }, { checkedAt: "desc" }],
      take: 500,
    }),
    db.prospect.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const byStatus: Record<string, number> = {};
  for (const c of counts) byStatus[c.status] = c._count._all;

  return NextResponse.json({ prospects, counts: byStatus });
}

/**
 * Бот шле сюди знайдені профілі. Дублі та акаунти з сайтом відсіюються тут,
 * а не в боті — щоб правило жило в одному місці.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session && !isBotRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const incoming: unknown[] = Array.isArray(body.prospects) ? body.prospects : [body];

  const excluded = await loadExcludedUsernames();
  const seenInBatch = new Set<string>();
  const rows = [];
  let skippedDuplicate = 0;
  let skippedHasSite = 0;

  for (const raw of incoming) {
    const p = raw as Record<string, unknown>;
    const instagram = normalizeInstagram(String(p.instagram ?? ""));
    if (!instagram) continue;

    if (excluded.has(instagram) || seenInBatch.has(instagram)) {
      skippedDuplicate++;
      continue;
    }
    seenInBatch.add(instagram);

    const bio = p.bio ? String(p.bio) : null;
    const externalUrl = p.externalUrl ? String(p.externalUrl) : null;
    const { hasWebsite, evidence } = detectWebsite(externalUrl, bio);

    if (hasWebsite) {
      skippedHasSite++;
      continue;
    }

    const isPrivate = Boolean(p.isPrivate);
    const followers = p.followers != null ? Number(p.followers) : null;
    const postsCount = p.postsCount != null ? Number(p.postsCount) : null;
    const category = p.category ? String(p.category) : null;

    rows.push({
      instagram,
      fullName: p.fullName ? String(p.fullName) : null,
      bio,
      category,
      followers,
      postsCount,
      isPrivate,
      externalUrl,
      hasWebsite,
      siteEvidence: evidence,
      source: p.source ? String(p.source) : null,
      score: scoreProspect({ hasWebsite, isPrivate, category, bio, followers, postsCount }),
    });
  }

  const created = rows.length
    ? await db.prospect.createMany({ data: rows, skipDuplicates: true })
    : { count: 0 };

  return NextResponse.json(
    { added: created.count, skippedDuplicate, skippedHasSite, received: incoming.length },
    { status: 201 },
  );
}
