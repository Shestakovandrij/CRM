import { db } from "./db";
import { normalizeInstagram } from "./broadcast-base";

/** Максимум лідів в одній кампанії — жорстка вимога до розміру партії. */
export const CAMPAIGN_BATCH_SIZE = 25;

/** Домени-агрегатори: посилання є, але сайту немає — такі беремо в роботу. */
const LINK_AGGREGATORS = [
  "linktr.ee", "taplink", "linktree", "beacons.ai", "lnk.bio",
  "msha.ke", "linkin.bio", "allmylinks", "bio.link", "carrd.co",
];

/** Соцмережі та месенджери в полі посилання сайтом не рахуються. */
const NOT_A_SITE = [
  "instagram.com", "facebook.com", "fb.me", "t.me", "telegram",
  "wa.me", "whatsapp", "tiktok.com", "youtube.com", "youtu.be",
  "m.me", "viber", "join.skype",
];

export interface SiteVerdict {
  hasWebsite: boolean;
  evidence: string | null;
}

/**
 * Вирішує, чи є у профілю справжній сайт.
 * Агрегатори (linktr.ee, taplink) та соцмережі сайтом НЕ вважаються —
 * такі акаунти лишаються цілями, а власник перевіряє їх вручну.
 */
export function detectWebsite(externalUrl?: string | null, bio?: string | null): SiteVerdict {
  const url = externalUrl?.trim().toLowerCase() ?? "";

  if (url) {
    const aggregator = LINK_AGGREGATORS.find((d) => url.includes(d));
    if (aggregator) return { hasWebsite: false, evidence: `агрегатор: ${aggregator}` };

    const social = NOT_A_SITE.find((d) => url.includes(d));
    if (social) return { hasWebsite: false, evidence: `соцмережа: ${social}` };

    return { hasWebsite: true, evidence: `посилання: ${externalUrl!.trim()}` };
  }

  // Посилання немає — шукаємо домен у тексті біо.
  const text = bio ?? "";
  // Довші зони йдуть першими, інакше "com.ua" збігнеться лише як "com"
  // і в доказі власник побачить обрізаний домен.
  const domain = text.match(
    /\b([a-z0-9][a-z0-9-]{1,61}\.(com\.ua|co\.uk|com|ua|pl|net|org|eu|shop|store|site|online|cz|de|es))\b/i,
  );
  if (domain) {
    const found = domain[0].toLowerCase();
    if (LINK_AGGREGATORS.some((d) => found.includes(d))) {
      return { hasWebsite: false, evidence: `агрегатор у біо: ${found}` };
    }
    if (NOT_A_SITE.some((d) => found.includes(d))) {
      return { hasWebsite: false, evidence: `соцмережа у біо: ${found}` };
    }
    return { hasWebsite: true, evidence: `домен у біо: ${found}` };
  }

  return { hasWebsite: false, evidence: null };
}

/**
 * Нікнейми, яких не можна пропонувати: вже в базі розсилок, уже в будь-якій
 * кампанії, або вже є серед кандидатів (зокрема відхилених).
 */
export async function loadExcludedUsernames(): Promise<Set<string>> {
  const [sent, recipients, prospects] = await Promise.all([
    db.broadcastLead.findMany({ select: { instagram: true } }),
    db.campaignRecipient.findMany({ select: { instagramUsername: true } }),
    db.prospect.findMany({ select: { instagram: true } }),
  ]);

  const set = new Set<string>();
  for (const r of sent) set.add(normalizeInstagram(r.instagram));
  for (const r of recipients) set.add(normalizeInstagram(r.instagramUsername));
  for (const r of prospects) set.add(normalizeInstagram(r.instagram));
  return set;
}

/**
 * Оцінка 0–100. Відсутність сайту — основа, решта лише впорядковує список,
 * щоб очевидні бізнеси були зверху.
 */
export function scoreProspect(p: {
  hasWebsite: boolean;
  isPrivate: boolean;
  category?: string | null;
  bio?: string | null;
  followers?: number | null;
  postsCount?: number | null;
}): number {
  if (p.hasWebsite || p.isPrivate) return 0;

  let score = 50; // база: сайту немає
  if (p.category) score += 20; // професійний акаунт із категорією
  if (p.followers && p.followers >= 300) score += 10;
  if (p.postsCount && p.postsCount >= 15) score += 10;

  const bio = (p.bio ?? "").toLowerCase();
  const commerce = ["замовлен", "доставк", "ціна", "прайс", "опт", "магазин",
                    "студія", "майстер", "послуг", "запис", "+38", "☎", "viber"];
  if (commerce.some((w) => bio.includes(w))) score += 10;

  return Math.min(score, 100);
}
