/**
 * Ручний запуск розвідки з термінала.
 * Те саме робить кнопка «Розвідка» в CRM.
 *
 * Запуск:  npx tsx scout.ts
 */
import "dotenv/config";
import { runScout } from "./scout-run.js";

if (!process.env.BOT_SECRET) throw new Error("BOT_SECRET не налаштований у bot/.env");

const s = await runScout();

console.log("\n━━━ Підсумок ━━━");
console.log(`Переглянуто профілів: ${s.visited}`);
console.log(`Нових кандидатів:     ${s.added}`);
console.log(`Відсіяно дублів:      ${s.duplicates}`);
console.log(`Відсіяно із сайтом:   ${s.withSite}`);
if (s.error) console.log(`Помилка:              ${s.error}`);

process.exit(s.error ? 1 : 0);
