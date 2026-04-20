import { chromium, Browser, BrowserContext, Page } from "playwright";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const SESSION_FILE = join(__dir, "instagram-session.json");

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function randomDelay(min = 500, max = 1500) {
  return sleep(min + Math.random() * (max - min));
}

export class InstagramBot {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  async launch(headless = false) {
    this.browser = await chromium.launch({
      headless,
      args: [
        "--no-sandbox",
        "--disable-blink-features=AutomationControlled",
      ],
    });

    const storageState = existsSync(SESSION_FILE)
      ? JSON.parse(readFileSync(SESSION_FILE, "utf-8"))
      : undefined;

    this.context = await this.browser.newContext({
      storageState,
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 },
      locale: "uk-UA",
    });

    // Hide playwright fingerprints
    await this.context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    });

    this.page = await this.context.newPage();
  }

  async login(username: string, password: string): Promise<void> {
    if (!this.page) throw new Error("Browser not launched");

    await this.page.goto("https://www.instagram.com/accounts/login/", { waitUntil: "networkidle" });
    await randomDelay(1000, 2000);

    // Handle cookie popup if it appears (all languages)
    const cookieBtn = this.page.locator("button:has-text('Allow'), button:has-text('Accept'), button:has-text('Дозволити всі'), button:has-text('Прийняти'), button:has-text('Принять')").first();
    if (await cookieBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cookieBtn.click();
      await randomDelay();
    }

    await this.page.fill('input[name="username"]', username);
    await randomDelay(300, 700);
    await this.page.fill('input[name="password"]', password);
    await randomDelay(500, 1000);
    await this.page.click('button[type="submit"]');

    // Wait for redirect after login
    await this.page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 30000 });
    await randomDelay(2000, 3000);

    await this.saveSession();
    console.log("✅ Instagram: успішно залогінився");
  }

  async isLoggedIn(): Promise<boolean> {
    if (!this.page) return false;
    try {
      await this.page.goto("https://www.instagram.com/", { waitUntil: "domcontentloaded", timeout: 15000 });
      await randomDelay(1000, 2000);
      // If redirected to login page, we're not logged in
      return !this.page.url().includes("/login");
    } catch {
      return false;
    }
  }

  async saveSession() {
    if (!this.context) return;
    const state = await this.context.storageState();
    writeFileSync(SESSION_FILE, JSON.stringify(state));
  }

  async sendDM(username: string, message: string): Promise<void> {
    if (!this.page) throw new Error("Browser not launched");

    const cleanUsername = username.replace(/^@/, "");

    // Navigate to user profile
    await this.page.goto(`https://www.instagram.com/${cleanUsername}/`, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    await randomDelay(1500, 2500);

    // Check if account exists (all languages)
    const pageText = await this.page.textContent("body");
    if (
      pageText?.includes("Sorry, this page isn't available") ||
      pageText?.includes("Page not found") ||
      pageText?.includes("Вибачте, ця сторінка недоступна") ||
      pageText?.includes("Страница не найдена") ||
      this.page.url().includes("/explore/")
    ) {
      throw new Error("NOT_FOUND");
    }

    // Find and click Message button — all UI languages + selector variants
    const messageBtnSelectors = [
      // Ukrainian
      'div[role="button"]:has-text("Повідомлення")',
      // English
      'div[role="button"]:has-text("Message")',
      // Russian
      'div[role="button"]:has-text("Написать")',
      // Generic role buttons with text
      'a[role="button"]:has-text("Message")',
      'a[role="button"]:has-text("Повідомлення")',
      'button:has-text("Message")',
      'button:has-text("Повідомлення")',
      // Aria labels
      '[aria-label="Message"]',
      '[aria-label="Повідомлення"]',
      '[aria-label="Написать"]',
    ];

    let clicked = false;
    for (const sel of messageBtnSelectors) {
      const btn = this.page.locator(sel).first();
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.click();
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      throw new Error("CANT_MESSAGE: кнопка Message не знайдена (приватний або заблокований акаунт)");
    }

    // Wait for navigation to /direct/ page
    await this.page.waitForURL((url) => url.pathname.includes("/direct/"), { timeout: 15000 }).catch(() => null);
    await randomDelay(1500, 2500);

    // Dismiss "Turn on notifications" popup if it appears
    const notifDismiss = this.page.locator(
      'button:has-text("Not Now"), button:has-text("Не зараз"), button:has-text("Не сейчас"), button:has-text("Cancel"), [aria-label="Close"]'
    ).first();
    if (await notifDismiss.isVisible({ timeout: 2000 }).catch(() => false)) {
      await notifDismiss.click();
      await randomDelay(500, 1000);
    }

    // Wait for DM input — Instagram uses contenteditable div on /direct/ page
    const inputSelectors = [
      'div[aria-label="Message"]',
      'div[aria-label="Повідомлення"]',
      'div[aria-label="Написать сообщение"]',
      'div[contenteditable="true"][aria-label]',
      'div[role="textbox"]',
      'div[contenteditable="true"]',
    ];

    let input = null;
    for (const sel of inputSelectors) {
      const el = this.page.locator(sel).last();
      if (await el.isVisible({ timeout: 8000 }).catch(() => false)) {
        input = el;
        break;
      }
    }

    if (!input) {
      throw new Error("CANT_TYPE: поле вводу повідомлення не знайдено");
    }

    await input.click();
    await randomDelay(500, 1000);

    // Type with human-like delays, preserving line breaks via Shift+Enter
    const lines = message.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].length > 0) {
        await this.page.keyboard.type(lines[i], { delay: 40 + Math.random() * 60 });
      }
      if (i < lines.length - 1) {
        await this.page.keyboard.press("Shift+Enter");
        await sleep(80 + Math.random() * 120);
      }
    }
    await randomDelay(800, 1500);

    // Send via Enter key (most reliable across Instagram UI versions)
    await this.page.keyboard.press("Enter");
    await randomDelay(2000, 3000);

    // Save session after successful send to keep cookies fresh
    await this.saveSession();
  }

  async close() {
    await this.browser?.close();
    this.browser = null;
    this.context = null;
    this.page = null;
  }
}
