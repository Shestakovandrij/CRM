import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CAMPAIGN_BATCH_SIZE } from "@/lib/prospects";

/** Масова зміна статусу: схвалити або відхилити відразу пачку. */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ids, status } = await req.json();
  if (!Array.isArray(ids) || !ids.length) {
    return NextResponse.json({ error: "ids required" }, { status: 400 });
  }

  const res = await db.prospect.updateMany({ where: { id: { in: ids } }, data: { status } });
  return NextResponse.json({ updated: res.count });
}

/**
 * Створює ЧЕРНЕТКИ кампаній із обраних кандидатів, по 25 у кожній.
 * Нічого не запускає — статус завжди DRAFT, запуск лишається за людиною.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ids, messageText, niche, namePrefix } = await req.json();

  if (!Array.isArray(ids) || !ids.length) {
    return NextResponse.json({ error: "Оберіть хоча б одного кандидата" }, { status: 400 });
  }
  if (!messageText?.trim()) {
    return NextResponse.json({ error: "Потрібен текст повідомлення" }, { status: 400 });
  }

  // Беремо лише тих, хто ще не потрапив у кампанію.
  const prospects = await db.prospect.findMany({
    where: { id: { in: ids }, status: { in: ["NEW", "APPROVED"] } },
    orderBy: { score: "desc" },
  });

  if (!prospects.length) {
    return NextResponse.json({ error: "Немає доступних кандидатів" }, { status: 400 });
  }

  // Ріжемо на партії по 25.
  const batches: (typeof prospects)[] = [];
  for (let i = 0; i < prospects.length; i += CAMPAIGN_BATCH_SIZE) {
    batches.push(prospects.slice(i, i + CAMPAIGN_BATCH_SIZE));
  }

  const prefix = namePrefix?.trim() || "Розвідка";
  const stamp = new Date().toISOString().slice(0, 10).split("-").reverse().join(".");
  const created = [];

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const name = batches.length > 1 ? `${prefix} ${stamp} — ч.${i + 1}` : `${prefix} ${stamp}`;

    const campaign = await db.campaign.create({
      data: {
        name,
        status: "DRAFT",
        niche: niche?.trim() || null,
        recipients: {
          create: batch.map((p) => ({
            instagramUsername: p.instagram,
            messageText: messageText.trim(),
            niche: niche?.trim() || null,
          })),
        },
      },
    });

    await db.prospect.updateMany({
      where: { id: { in: batch.map((p) => p.id) } },
      data: { status: "QUEUED", campaignId: campaign.id },
    });

    created.push({ id: campaign.id, name, size: batch.length });
  }

  return NextResponse.json({ campaigns: created }, { status: 201 });
}
