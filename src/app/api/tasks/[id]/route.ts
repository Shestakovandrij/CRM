import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const existing = await db.task.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData = { ...body };
  if (updateData.deadline !== undefined) {
    updateData.deadline = updateData.deadline ? new Date(updateData.deadline) : null;
  }
  if (updateData.remindAt !== undefined) {
    updateData.remindAt = updateData.remindAt ? new Date(updateData.remindAt) : null;
  }
  const task = await db.task.update({ where: { id }, data: updateData });

  if (body.status === "DONE" && existing.status !== "DONE") {
    const ref = existing.leadId ?? existing.dealId;
    if (existing.leadId) {
      await db.activity.create({
        data: { leadId: existing.leadId, type: "TASK_DONE", content: `Задача виконана: ${existing.title}` },
      });
    }
    if (existing.dealId) {
      const deal = await db.deal.findUnique({ where: { id: existing.dealId } });
      await db.activity.create({
        data: {
          dealId: existing.dealId,
          leadId: deal?.leadId ?? undefined,
          type: "TASK_DONE",
          content: `Задача виконана: ${existing.title}`,
        },
      });
    }
    void ref;
  }

  return NextResponse.json(task);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
