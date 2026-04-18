import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const lead = await db.lead.findUnique({
    where: { id },
    include: {
      tasks: { orderBy: { createdAt: "desc" } },
      activities: { orderBy: { createdAt: "desc" } },
      deals: true,
    },
  });

  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(lead);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const existing = await db.lead.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData = { ...body };
  if (updateData.instagram) updateData.instagram = updateData.instagram.replace(/^@/, "").trim();
  if (updateData.telegram) updateData.telegram = updateData.telegram.replace(/^@/, "").trim();
  if (updateData.amount !== undefined) updateData.amount = updateData.amount ? parseFloat(updateData.amount) : null;

  const lead = await db.lead.update({ where: { id }, data: updateData });

  if (body.status && body.status !== existing.status) {
    await db.activity.create({
      data: {
        leadId: id,
        type: "STATUS_CHANGE",
        content: `Статус змінено: ${existing.status} → ${body.status}`,
      },
    });
  }

  return NextResponse.json(lead);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.lead.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
