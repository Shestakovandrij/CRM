// Opens a browser window, waits until Instagram login is complete, then saves session.
import "dotenv/config";
import { chromium } from "playwright";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const SESSION_FILE = join(__dir, "instagram-session.json");

console.log("🚀 Відкриваю браузер Instagram...");
console.log("   Залогінься — сесія збережеться автоматично.\n");

const browser = await chromium.launch({
  headless: false,
  args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
});

const context = await browser.newContext({
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  viewport: { width: 1280, height: 800 },
});

await context.addInitScript(() => {
  Object.defineProperty(navigator, "webdriver", { get: () => undefined });
});

const page = await context.newPage();
await page.goto("https://www.instagram.com/accounts/login/");

// Wait until redirected away from login page (= successfully logged in)
console.log("⏳ Чекаю на логін...");
await page.waitForURL((url) => !url.pathname.includes("/login") && !url.pathname.includes("/accounts"), {
  timeout: 120000,
});

await page.waitForTimeout(2000);

const state = await context.storageState();
writeFileSync(SESSION_FILE, JSON.stringify(state));

console.log("✅ Сесію збережено! Закриваю браузер...");
await browser.close();
console.log("🤖 Тепер запускай бота: npm start");
