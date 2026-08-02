/**
 * Цикл розвідки, придатний і для запуску командою, і для виклику з CRM.
 *
 * Фільтрація «є сайт / немає сайту» та відсів дублів робляться на боці CRM —
 * правило живе в одному місці, тут ми лише збираємо факти.
 */
import { Prospector, type ProfileData } from "./prospector.js";

const CRM_URL = process.env.CRM_URL || "http://localhost:3000";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export interface ScoutState {
  running: boolean;
  visited: number;
  limit: number;
  added: number;
  duplicates: number;
  withSite: number;
  startedAt: string | null;
  finishedAt: string | null;
  lastSeed: string | null;
  error: string | null;
}

/** Стан живе в памʼяті процесу — CRM опитує його для індикатора. */
export const scoutState: ScoutState = {
  running: false, visited: 0, limit: 0, added: 0, duplicates: 0,
  withSite: 0, startedAt: null, finishedAt: null, lastSeed: null, error: null,
};

interface Seed { id: string; type: "SIMILAR" | "HASHTAG" | "GEO"; value: string }

function headers() {
  return { "Content-Type": "application/json", "x-bot-secret": process.env.BOT_SECRET! };
}

async function nextSeeds(take: number): Promise<Seed[]> {
  const r = await fetch(`${CRM_URL}/api/prospects/seeds?take=${take}`, { headers: headers() });
  if (!r.ok) throw new Error(`seeds HTTP ${r.status}`);
  return r.json();
}

async function markSeed(id: string, foundCount: number) {
  await fetch(`${CRM_URL}/api/prospects/seeds`, {
    method: "PATCH", headers: headers(), body: JSON.stringify({ id, foundCount }),
  }).catch(() => null);
}

async function pushProspects(rows: Partial<ProfileData & { source: string }>[]) {
  if (!rows.length) return { added: 0, skippedDuplicate: 0, skippedHasSite: 0 };
  const r = await fetch(`${CRM_URL}/api/prospects`, {
    method: "POST", headers: headers(), body: JSON.stringify({ prospects: rows }),
  });
  if (!r.ok) throw new Error(`prospects HTTP ${r.status}`);
  return r.json();
}

export interface ScoutOptions {
  limit?: number;
  minDelay?: number;
  maxDelay?: number;
  onLog?: (line: string) => void;
  /** Замовлення з CRM — у нього шлемо прогрес, щоб він був видимий у вкладці. */
  runId?: string;
}

/** Забирає замовлення на розвідку, якщо воно є. Викликається з циклу опитування. */
export async function claimScoutRun(): Promise<{ id: string; limit: number | null } | null> {
  try {
    const r = await fetch(`${CRM_URL}/api/prospects/scout`, {
      method: "PATCH", headers: headers(), body: JSON.stringify({ claim: true }),
    });
    if (!r.ok) return null;
    const { run } = await r.json();
    return run ? { id: run.id, limit: run.limit } : null;
  } catch {
    return null;
  }
}

async function report(runId: string | undefined, data: Record<string, unknown>) {
  if (!runId) return;
  await fetch(`${CRM_URL}/api/prospects/scout`, {
    method: "PATCH", headers: headers(), body: JSON.stringify({ id: runId, ...data }),
  }).catch(() => null);
}

export async function runScout(opts: ScoutOptions = {}): Promise<ScoutState> {
  if (scoutState.running) throw new Error("Розвідка вже виконується");

  const limit = opts.limit ?? parseInt(process.env.SCOUT_DAILY_LIMIT || "30");
  const minDelay = opts.minDelay ?? parseInt(process.env.SCOUT_MIN_DELAY || "20000");
  const maxDelay = opts.maxDelay ?? parseInt(process.env.SCOUT_MAX_DELAY || "45000");
  const log = opts.onLog ?? ((l: string) => console.log(l));

  Object.assign(scoutState, {
    running: true, visited: 0, limit, added: 0, duplicates: 0, withSite: 0,
    startedAt: new Date().toISOString(), finishedAt: null, lastSeed: null, error: null,
  });

  const scout = new Prospector();
  try {
    await scout.launch(true);

    if (!(await scout.isLoggedIn())) {
      throw new Error("Розвідник не залогінений — виконайте npx tsx scout-login.ts");
    }
    log(`✅ Розвідник у мережі. Ліміт: ${limit} профілів.`);

    while (scoutState.visited < limit) {
      const seeds = await nextSeeds(5);
      if (!seeds.length) { log("Насіння закінчилось."); break; }

      for (const seed of seeds) {
        if (scoutState.visited >= limit) break;

        if (seed.type !== "SIMILAR") {
          // Хештеги й гео поки не обходяться: сторінка тегу не віддає авторів
          // одним запитом, довелось би відкривати кожен пост окремо.
          await markSeed(seed.id, 0);
          continue;
        }

        scoutState.lastSeed = seed.value;
        log(`🌱 Насіння: @${seed.value}`);
        await report(opts.runId, { lastSeed: seed.value, visited: scoutState.visited });

        const root = await scout.readProfile(seed.value);
        scoutState.visited++;
        await sleep(rnd(minDelay, maxDelay));

        if (!root?.related.length) {
          log("   схожих акаунтів немає");
          await markSeed(seed.id, 0);
          continue;
        }

        const batch: Partial<ProfileData & { source: string }>[] = [];
        for (const username of root.related) {
          if (scoutState.visited >= limit) break;
          const p = await scout.readProfile(username, false);
          scoutState.visited++;
          if (p) {
            batch.push({ ...p, source: `similar:${seed.value}` });
            log(`   ${p.externalUrl ? "🔗" : "✅"} @${p.instagram} — ${p.category ?? "без категорії"}, ${p.followers ?? "?"} підписників`);
          }
          await sleep(rnd(minDelay, maxDelay));
        }

        const res = await pushProspects(batch);
        scoutState.added += res.added;
        scoutState.duplicates += res.skippedDuplicate;
        scoutState.withSite += res.skippedHasSite;
        await markSeed(seed.id, res.added);

        log(`   → додано ${res.added}, дублів ${res.skippedDuplicate}, із сайтом ${res.skippedHasSite} [${scoutState.visited}/${limit}]`);
        await report(opts.runId, {
          visited: scoutState.visited, added: scoutState.added,
          duplicates: scoutState.duplicates, withSite: scoutState.withSite,
        });
      }
    }
  } catch (e) {
    scoutState.error = (e as Error).message;
    log(`❌ Розвідка впала: ${scoutState.error}`);
  } finally {
    await scout.close();
    scoutState.running = false;
    scoutState.finishedAt = new Date().toISOString();
    await report(opts.runId, {
      status: scoutState.error ? "FAILED" : "DONE",
      visited: scoutState.visited, added: scoutState.added,
      duplicates: scoutState.duplicates, withSite: scoutState.withSite,
      error: scoutState.error,
    });
  }

  return { ...scoutState };
}
