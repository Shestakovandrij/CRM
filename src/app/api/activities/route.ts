import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { leadId, dealId, content } = await req.json();

  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });
  if (!leadId && !dealId) return NextResponse.json({ error: "leadId or dealId required" }, { status: 400 });

  const activity = await db.activity.create({
    data: { leadId, dealId, type: "NOTE", content },
  });

  return NextResponse.json(activity, { status: 201 });
}
