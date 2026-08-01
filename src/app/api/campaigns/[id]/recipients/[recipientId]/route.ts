import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isRecordable, recordBroadcastSend } from "@/lib/broadcast-base";

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
      ...(body.niche !== undefined && { niche: body.niche }),
    },
    include: { campaign: { select: { name: true, niche: true } } },
  });

  // Відправку фіксуємо в базі розсилок ПІСЛЯ оновлення отримувача і не в спільній
  // транзакції: якщо тут щось впаде, статус SENT має вціліти, інакше бот вважатиме
  // повідомлення ненадісланим і відправить його вдруге.
  if (isRecordable(recipient.status)) {
    try {
      await recordBroadcastSend({
        instagram: recipient.instagramUsername,
        messageText: recipient.messageText,
        niche: recipient.niche ?? recipient.campaign.niche,
        status: recipient.status,
        sentAt: recipient.sentAt,
        campaignId: recipient.campaignId,
        campaignName: recipient.campaign.name,
      });
    } catch (e) {
      console.error("[broadcast-base] не вдалося записати відправку:", e);
    }
  }

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
