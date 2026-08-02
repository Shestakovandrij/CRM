/**
 * Розвідник — шукає в Instagram бізнес-акаунти без сайту.
 *
 * Свідомо відокремлений від InstagramBot: працює під ІНШИМ акаунтом,
 * зі своїм файлом сесії та своїм вікном браузера. Якщо розвідника
 * заблокують, основний акаунт для розсилки не постраждає.
 *
 * Джерело кандидатів — поле edge_related_profiles з відповіді, яку
 * Instagram сам віддає при відкритті профілю. Це ті самі «Схожі акаунти»,
 * але без зайвих кліків: одне завантаження сторінки дає і дані профілю,
 * і список схожих.
 */
import { chromium, Browser, BrowserContext, Page } from "playwright";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
export const SCOUT_SESSION_FILE = join(__dir, "instagram-scout-session.json");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rnd = (min: number, max: number) => min + Math.random() * (max - min);

/** Пауза між профілями. Широкий діапазон — рівний ритм видає автоматизацію. */
async function humanPause(minMs: number, maxMs: number) {
  await sleep(rnd(minMs, maxMs));
  // Зрідка — довга пауза, як у людини, що відволіклась.
  if (Math.random() < 0.12) await sleep(rnd(20_000, 60_000));
}

export interface ProfileData {
  instagram: string;
  fullName: string | null;
  bio: string | null;
  category: string | null;
  followers: number | null;
  postsCount: number | null;
  isPrivate: boolean;
  externalUrl: string | null;
  related: string[];
}

export class Prospector {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  async launch(headless = true) {
    this.browser = await chromium.launch({
      headless,
      args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
    });

    const storageState = existsSync(SCOUT_SESSION_FILE)
      ? JSON.parse(readFileSync(SCOUT_SESSION_FILE, "utf-8"))
      : undefined;

    this.context = await this.browser.newContext({
      storageState,
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      viewport: { width: 1440, height: 900 },
      locale: "uk-UA",
    });

    await this.context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    });

    this.page = await this.context.newPage();
  }

  async isLoggedIn(): Promise<boolean> {
    if (!this.context || !this.page) return false;
    const cookies = await this.context.cookies("https://www.instagram.com");
    if (!cookies.find((c) => c.name === "sessionid")?.value) return false;
    try {
      await this.page.goto("https://www.instagram.com/", {
        waitUntil: "domcontentloaded",
        timeout: 20000,
      });
      return !this.page.url().includes("/accounts/login");
    } catch {
      return false;
    }
  }

  async saveSession() {
    if (!this.context) return;
    writeFileSync(SCOUT_SESSION_FILE, JSON.stringify(await this.context.storageState()));
  }

  /**
   * Відкриває профіль і читає дані з відповідей, які сторінка запитує сама.
   *
   * Instagram віддає профіль через /api/graphql (шлях data.user), а схожі
   * акаунти — окремим запитом, який виникає лише після кліку по кнопці
   * «Схожі облікові записи». Прямий виклик API повертає useragent mismatch,
   * тому натискаємо кнопку так само, як це зробила б людина.
   *
   * @param withRelated false — лише прочитати профіль, без кліку (дешевше).
   */
  async readProfile(username: string, withRelated = true): Promise<ProfileData | null> {
    if (!this.page) throw new Error("Розвідник не запущений");
    const page = this.page;
    const user = username.replace(/^@/, "").trim();

    let profile: Record<string, any> | null = null;
    let related: string[] = [];

    const onResponse = async (res: import("playwright").Response) => {
      if (!res.url().includes("/api/graphql")) return;
      try {
        const json = JSON.parse(await res.text());
        if (!profile && json?.data?.user?.username) profile = json.data.user;
        const chain = json?.data?.xdt_api__v1__discover__chaining?.users;
        if (Array.isArray(chain)) {
          related = chain
            .map((u: any) => u?.username)
            .filter((x: unknown): x is string => typeof x === "string" && x.length > 0);
        }
      } catch {
        /* не JSON або порожня відповідь */
      }
    };

    page.on("response", onResponse);
    try {
      await page.goto(`https://www.instagram.com/${user}/`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      for (let i = 0; i < 25 && !profile; i++) await sleep(400);

      if (withRelated && profile) {
        // Дані профілю приходять раніше, ніж домальовується шапка з кнопкою.
        await sleep(2500);
        const btn = page
          .locator("svg[aria-label*='хож' i], svg[aria-label*='одібн' i], svg[aria-label*='imilar' i]")
          .first();
        if (await btn.isVisible({ timeout: 6000 }).catch(() => false)) {
          await btn.click({ force: true }).catch(() => null);
          for (let i = 0; i < 15 && !related.length; i++) await sleep(400);
        }
      }
    } catch {
      return null;
    } finally {
      page.off("response", onResponse);
    }

    if (!profile) return null;
    const u = profile as Record<string, any>;

    // Посилання може лежати або в external_url, або в bio_links.
    const link: string | null =
      (typeof u.external_url === "string" && u.external_url) ||
      (Array.isArray(u.bio_links) && u.bio_links[0]?.url) ||
      null;

    return {
      instagram: u.username ?? user,
      fullName: u.full_name || null,
      bio: u.biography || null,
      category: u.category || null,
      followers: typeof u.follower_count === "number" ? u.follower_count : null,
      postsCount: typeof u.media_count === "number" ? u.media_count : null,
      isPrivate: Boolean(u.is_private),
      externalUrl: link,
      related,
    };
  }

  async close() {
    await this.browser?.close().catch(() => null);
    this.browser = null;
    this.context = null;
    this.page = null;
  }
}
