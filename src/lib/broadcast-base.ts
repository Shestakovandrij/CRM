import type { RecipientStatus } from "@prisma/client";
import { db } from "./db";

/** Статуси, які взагалі потрапляють у базу розсилок. Черга та пропуски — ні. */
const RECORDABLE: RecipientStatus[] = ["SENT", "ERROR", "NOT_FOUND"];

export function isRecordable(status: RecipientStatus) {
  return RECORDABLE.includes(status);
}

/** Нікнейм — унікальний ключ ліда, тому нормалізуємо його однаково всюди. */
export function normalizeInstagram(username: string) {
  return username.replace(/^@/, "").trim().toLowerCase();
}

interface RecordArgs {
  instagram: string;
  messageText: string;
  niche?: string | null;
  status: RecipientStatus;
  sentAt?: Date | null;
  campaignId?: string | null;
  campaignName: string;
}

/**
 * Додає відправку в базу розсилок: одна картка на Instagram-акаунт,
 * усередині — історія всіх відправок.
 */
export async function recordBroadcastSend(args: RecordArgs) {
  const instagram = normalizeInstagram(args.instagram);
  if (!instagram || !isRecordable(args.status)) return null;

  const sentAt = args.sentAt ?? new Date();
  const succeeded = args.status === "SENT";
  const niche = args.niche?.trim() || null;

  return db.$transaction(async (tx) => {
    // Гарантуємо наявність картки, не перезаписуючи існуючу (безпечно до гонок).
    await tx.broadcastLead.upsert({
      where: { instagram },
      create: { instagram, niche, lastStatus: args.status },
      update: {},
    });

    const before = await tx.broadcastLead.findUniqueOrThrow({ where: { instagram } });

    const lead = await tx.broadcastLead.update({
      where: { instagram },
      data: {
        lastStatus: args.status,
        // Нішу, виправлену вручну, новою розсилкою не перетираємо.
        ...(niche && !before.niche ? { niche } : {}),
        ...(succeeded && {
          sendCount: { increment: 1 },
          lastSentAt: sentAt,
          ...(before.firstSentAt ? {} : { firstSentAt: sentAt }),
        }),
      },
    });

    await tx.broadcastSend.create({
      data: {
        leadId: lead.id,
        campaignId: args.campaignId ?? null,
        campaignName: args.campaignName,
        messageText: args.messageText,
        niche,
        status: args.status,
        sentAt,
      },
    });

    return lead;
  });
}
