import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? undefined;

  const deals = await db.deal.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(search
        ? {
            OR: [
              { company: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              { lead: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      lead: { select: { id: true, name: true, instagram: true } },
      _count: { select: { tasks: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(deals);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { leadId, company, description, budget, deadline, status } = body;

  if (!leadId) return NextResponse.json({ error: "leadId is required" }, { status: 400 });

  const deal = await db.deal.create({
    data: { leadId, company, description, budget, deadline, status },
    include: { lead: { select: { id: true, name: true } } },
  });

  await db.activity.create({
    data: {
      leadId,
      dealId: deal.id,
      type: "DEAL_CREATED",
      content: `Клієнт створений${company ? `: ${company}` : ""}`,
    },
  });

  return NextResponse.json(deal, { status: 201 });
}
