import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get("leadId") ?? undefined;
  const dealId = searchParams.get("dealId") ?? undefined;
  const status = searchParams.get("status") ?? undefined;

  const tasks = await db.task.findMany({
    where: {
      ...(leadId ? { leadId } : {}),
      ...(dealId ? { dealId } : {}),
      ...(status ? { status: status as never } : {}),
    },
    include: {
      lead: { select: { id: true, name: true } },
      deal: { select: { id: true, company: true } },
    },
    orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, description, deadline, remindAt, status, priority, leadId, dealId, assignee } = body;

  if (!title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const task = await db.task.create({
    data: {
      title,
      description: description || null,
      deadline: deadline ? new Date(deadline) : null,
      remindAt: remindAt ? new Date(remindAt) : null,
      status: status ?? "TODO",
      priority: priority ?? "MEDIUM",
      leadId: leadId || null,
      dealId: dealId || null,
      assignee: assignee || null,
    },
  });

  if (leadId) {
    await db.activity.create({
      data: { leadId, type: "TASK_CREATED", content: `Задача створена: ${title}` },
    });
  }
  if (dealId) {
    const deal = await db.deal.findUnique({ where: { id: dealId } });
    await db.activity.create({
      data: {
        dealId,
        leadId: deal?.leadId ?? undefined,
        type: "TASK_CREATED",
        content: `Задача створена: ${title}`,
      },
    });
  }

  return NextResponse.json(task, { status: 201 });
}
