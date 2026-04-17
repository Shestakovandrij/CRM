import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function isBotRequest(req: Request) {
  return req.headers.get("x-bot-secret") === process.env.BOT_SECRET;
}

// Bot calls this to get the next recipient to send to.
// Returns { recipient, campaignStatus }
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isBotRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const campaign = await db.campaign.findUnique({ where: { id } });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (campaign.status !== "RUNNING") {
    return NextResponse.json({ recipient: null, campaignStatus: campaign.status });
  }

  // Reset any stuck SENDING recipients (e.g. from bot crash)
  await db.campaignRecipient.updateMany({
    where: { campaignId: id, status: "SENDING" },
    data: { status: "PENDING" },
  });

  // Get next PENDING recipient and mark as SENDING atomically
  const recipient = await db.campaignRecipient.findFirst({
    where: { campaignId: id, status: "PENDING" },
    orderBy: { createdAt: "asc" },
  });

  if (!recipient) {
    // All done — mark campaign completed
    await db.campaign.update({ where: { id }, data: { status: "COMPLETED" } });
    return NextResponse.json({ recipient: null, campaignStatus: "COMPLETED" });
  }

  await db.campaignRecipient.update({
    where: { id: recipient.id },
    data: { status: "SENDING" },
  });

  return NextResponse.json({ recipient, campaignStatus: "RUNNING" });
}
