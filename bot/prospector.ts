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
   * Відкриває профіль і перехоплює відповідь web_profile_info — той самий
   * запит, який робить сама сторінка. Повертає дані профілю і схожі акаунти.
   */
  async readProfile(username: string): Promise<ProfileData | null> {
    if (!this.page) throw new Error("Розвідник не запущений");
    const user = username.replace(/^@/, "").trim();

    let payload: Record<string, unknown> | null = null;

    const onResponse = async (res: import("playwright").Response) => {
      if (!res.url().includes("/api/v1/users/web_profile_info/")) return;
      try {
        const json = await res.json();
        if (json?.data?.user) payload = json.data.user;
      } catch {
        /* не JSON — ігноруємо */
      }
    };

    this.page.on("response", onResponse);
    try {
      await this.page.goto(`https://www.instagram.com/${user}/`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      // Даємо сторінці дотягнути свій же запит профілю.
      for (let i = 0; i < 20 && !payload; i++) await sleep(400);
    } catch {
      return null;
    } finally {
      this.page.off("response", onResponse);
    }

    if (!payload) return null;
    const u = payload as Record<string, any>;

    const related: string[] = (u.edge_related_profiles?.edges ?? [])
      .map((e: any) => e?.node?.username)
      .filter((x: unknown): x is string => typeof x === "string" && x.length > 0);

    return {
      instagram: u.username ?? user,
      fullName: u.full_name || null,
      bio: u.biography || null,
      category: u.category_name || u.business_category_name || null,
      followers: u.edge_followed_by?.count ?? null,
      postsCount: u.edge_owner_to_timeline_media?.count ?? null,
      isPrivate: Boolean(u.is_private),
      externalUrl: u.external_url || null,
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
