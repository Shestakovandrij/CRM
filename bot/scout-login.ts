/**
 * Одноразовий вхід розвідувального акаунта.
 *
 * Відкриває справжнє вікно браузера і чекає, поки ви увійдете руками —
 * разом із кодом з authenticator. Пароль і код нікуди не передаються,
 * ви вводите їх безпосередньо в Instagram. Після входу сесія зберігається
 * у instagram-scout-session.json і далі використовується автоматично.
 *
 * Запуск:  npx tsx scout-login.ts
 */
import { Prospector, SCOUT_SESSION_FILE } from "./prospector.js";

const scout = new Prospector();
await scout.launch(false); // headless=false — вікно має бути видимим

console.log("🔐 Відкрито вікно Instagram.");
console.log("   Увійдіть під РОЗВІДУВАЛЬНИМ акаунтом (не основним!).");
console.log("   Введіть код з authenticator у вікні браузера.");
console.log("   Скрипт сам помітить успішний вхід.\n");

const page = (scout as unknown as { page: import("playwright").Page }).page;
await page.goto("https://www.instagram.com/accounts/login/");

// Чекаємо, поки Instagram перекине нас із логіну — це і є ознака входу.
await page.waitForURL(
  (url) => !url.pathname.includes("/login") && !url.pathname.includes("/accounts"),
  { timeout: 5 * 60_000 },
);

await new Promise((r) => setTimeout(r, 3000));
await scout.saveSession();

console.log(`\n✅ Сесію збережено: ${SCOUT_SESSION_FILE}`);
console.log("   Тепер розвідник заходитиме сам, повторний вхід не потрібен.");

await scout.close();
process.exit(0);
