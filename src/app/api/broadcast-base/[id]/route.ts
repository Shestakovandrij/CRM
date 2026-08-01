import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const lead = await db.broadcastLead.update({
    where: { id },
    data: {
      ...(body.niche !== undefined && { niche: body.niche?.trim() || null }),
    },
  });

  return NextResponse.json(lead);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  // Історія відправок піде разом із карткою (onDelete: Cascade).
  await db.broadcastLead.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
