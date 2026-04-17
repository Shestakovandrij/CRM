import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function isBotRequest(req: Request) {
  return req.headers.get("x-bot-secret") === process.env.BOT_SECRET;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session && !isBotRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const recipients = await db.campaignRecipient.findMany({
    where: { campaignId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(recipients);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session && !isBotRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // bulk import: body.recipients = [{ instagramUsername, messageText }]
  if (Array.isArray(body.recipients)) {
    const created = await db.campaignRecipient.createMany({
      data: body.recipients.map((r: { instagramUsername: string; messageText: string }) => ({
        campaignId: id,
        instagramUsername: r.instagramUsername.replace(/^@/, "").trim(),
        messageText: r.messageText,
      })),
      skipDuplicates: false,
    });
    return NextResponse.json({ created: created.count }, { status: 201 });
  }

  // single add
  const recipient = await db.campaignRecipient.create({
    data: {
      campaignId: id,
      instagramUsername: body.instagramUsername.replace(/^@/, "").trim(),
      messageText: body.messageText,
    },
  });
  return NextResponse.json(recipient, { status: 201 });
}
