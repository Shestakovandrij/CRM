/**
 * Цикл розвідки: бере насіння з CRM, обходить схожі акаунти,
 * читає профілі й віддає кандидатів у CRM.
 *
 * Фільтрація «є сайт / немає сайту» та відсів дублів робиться на боці CRM —
 * правило живе в одному місці, тут ми лише збираємо факти.
 *
 * Запуск:  npx tsx scout.ts
 */
import "dotenv/config";
import { Prospector, type ProfileData } from "./prospector.js";

const CRM_URL = process.env.CRM_URL || "http://localhost:3000";
const BOT_SECRET = process.env.BOT_SECRET!;
/** Скільки профілів відкривати за добу. Головний запобіжник від блокування. */
const DAILY_LIMIT = parseInt(process.env.SCOUT_DAILY_LIMIT || "100");
const MIN_DELAY = parseInt(process.env.SCOUT_MIN_DELAY || "20000");
const MAX_DELAY = parseInt(process.env.SCOUT_MAX_DELAY || "45000");

if (!BOT_SECRET) throw new Error("BOT_SECRET не налаштований у bot/.env");

const H = { "Content-Type": "application/json", "x-bot-secret": BOT_SECRET };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

interface Seed {
  id: string;
  type: "SIMILAR" | "HASHTAG" | "GEO";
  value: string;
}

async function nextSeeds(take: number): Promise<Seed[]> {
  const r = await fetch(`${CRM_URL}/api/prospects/seeds?take=${take}`, { headers: H });
  if (!r.ok) throw new Error(`seeds HTTP ${r.status}`);
  return r.json();
}

async function markSeed(id: string, foundCount: number) {
  await fetch(`${CRM_URL}/api/prospects/seeds`, {
    method: "PATCH",
    headers: H,
    body: JSON.stringify({ id, foundCount }),
  }).catch(() => null);
}

async function pushProspects(rows: Partial<ProfileData & { source: string }>[]) {
  if (!rows.length) return { added: 0, skippedDuplicate: 0, skippedHasSite: 0 };
  const r = await fetch(`${CRM_URL}/api/prospects`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ prospects: rows }),
  });
  if (!r.ok) throw new Error(`prospects HTTP ${r.status}`);
  return r.json();
}

async function main() {
  const scout = new Prospector();
  await scout.launch(true);

  if (!(await scout.isLoggedIn())) {
    console.error("❌ Розвідник не залогінений. Виконайте: npx tsx scout-login.ts");
    await scout.close();
    process.exit(1);
  }
  console.log(`✅ Розвідник у мережі. Ліміт на сьогодні: ${DAILY_LIMIT} профілів.\n`);

  let visited = 0;
  let added = 0;
  let dupes = 0;
  let withSite = 0;

  while (visited < DAILY_LIMIT) {
    const seeds = await nextSeeds(5);
    if (!seeds.length) {
      console.log("Насіння закінчилось.");
      break;
    }

    for (const seed of seeds) {
      if (visited >= DAILY_LIMIT) break;

      if (seed.type !== "SIMILAR") {
        // Хештеги й гео поки не обходяться: сторінка тегу не віддає авторів
        // публікацій одним запитом, довелось би відкривати кожен пост окремо.
        // 803 насінини типу SIMILAR дають достатньо обсягу, тож це на потім.
        await markSeed(seed.id, 0);
        continue;
      }

      console.log(`\n🌱 Насіння: @${seed.value}`);
      const root = await scout.readProfile(seed.value);
      visited++;
      await sleep(rnd(MIN_DELAY, MAX_DELAY));

      if (!root) {
        console.log("   профіль недоступний");
        await markSeed(seed.id, 0);
        continue;
      }
      if (!root.related.length) {
        console.log("   схожих акаунтів немає");
        await markSeed(seed.id, 0);
        continue;
      }

      console.log(`   схожих: ${root.related.length}`);
      const batch: Partial<ProfileData & { source: string }>[] = [];

      for (const username of root.related) {
        if (visited >= DAILY_LIMIT) break;

        const p = await scout.readProfile(username);
        visited++;
        if (p) {
          batch.push({ ...p, source: `similar:${seed.value}` });
          const mark = p.externalUrl ? "🔗" : "✅";
          console.log(`   ${mark} @${p.instagram} — ${p.category ?? "без категорії"}, ${p.followers ?? "?"} підписників`);
        }
        await sleep(rnd(MIN_DELAY, MAX_DELAY));
      }

      const res = await pushProspects(batch);
      added += res.added;
      dupes += res.skippedDuplicate;
      withSite += res.skippedHasSite;
      await markSeed(seed.id, res.added);

      console.log(`   → додано ${res.added}, дублів ${res.skippedDuplicate}, із сайтом ${res.skippedHasSite}`);
      console.log(`   [переглянуто ${visited}/${DAILY_LIMIT}]`);
    }
  }

  console.log(`\n━━━ Підсумок ━━━`);
  console.log(`Переглянуто профілів: ${visited}`);
  console.log(`Нових кандидатів:     ${added}`);
  console.log(`Відсіяно дублів:      ${dupes}`);
  console.log(`Відсіяно із сайтом:   ${withSite}`);

  await scout.close();
  process.exit(0);
}

main().catch(async (e) => {
  console.error("Розвідка впала:", e);
  process.exit(1);
});
