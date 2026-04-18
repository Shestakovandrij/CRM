import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? undefined;
  const source = searchParams.get("source") ?? undefined;

  const leads = await db.lead.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(source ? { source } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { instagram: { contains: search, mode: "insensitive" } },
              { telegram: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { niche: { contains: search, mode: "insensitive" } },
              { geo: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { _count: { select: { tasks: true, deals: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(leads);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, instagram, telegram, phone, email, comment, source, geo, niche, amount, tags, status } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const cleanInstagram = instagram ? instagram.replace(/^@/, "").trim() : undefined;
  const cleanTelegram = telegram ? telegram.replace(/^@/, "").trim() : undefined;

  const lead = await db.lead.create({
    data: {
      name,
      instagram: cleanInstagram || null,
      telegram: cleanTelegram || null,
      phone: phone || null,
      email: email || null,
      comment: comment || null,
      source: source || null,
      geo: geo || null,
      niche: niche || null,
      amount: amount ? parseFloat(amount) : null,
      tags: tags ?? [],
      status: status ?? "NEW",
    },
  });

  await db.activity.create({
    data: { leadId: lead.id, type: "STATUS_CHANGE", content: `Лід створено зі статусом NEW` },
  });

  return NextResponse.json(lead, { status: 201 });
}
