import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function isBotRequest(req: Request) {
  return req.headers.get("x-bot-secret") === process.env.BOT_SECRET;
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; recipientId: string }> }
) {
  const session = await auth();
  if (!session && !isBotRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { recipientId } = await params;
  const body = await req.json();

  const recipient = await db.campaignRecipient.update({
    where: { id: recipientId },
    data: {
      ...(body.status !== undefined && { status: body.status }),
      ...(body.sentAt !== undefined && { sentAt: body.sentAt }),
      ...(body.errorMessage !== undefined && { errorMessage: body.errorMessage }),
      ...(body.messageText !== undefined && { messageText: body.messageText }),
    },
  });

  return NextResponse.json(recipient);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; recipientId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { recipientId } = await params;
  await db.campaignRecipient.delete({ where: { id: recipientId } });
  return NextResponse.json({ ok: true });
}
