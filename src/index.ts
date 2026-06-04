import { Bot, Context } from "grammy";
import * as dotenv from "dotenv";
import { I18n } from "@grammyjs/i18n";
// Імпортуємо тип флейвора через 'import type', щоб Node.js v24 не сварився під час запуску
import type { I18nFlavor } from "@grammyjs/i18n"; 
import { prisma } from "./config/database.js";
import { handleStartCommand } from "./bot/commands/start.js";
import { handleMenuClicks } from "./bot/handlers/menuHandler.js";

// Поєднуємо базовий контекст grammY та тип локалізації
export type MyContext = Context & I18nFlavor;

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error("TELEGRAM_BOT_TOKEN не задано в .env!");

const bot = new Bot<MyContext>(token);

// Ініціалізуємо інстанс i18n тільки з базовими налаштуваннями
const i18n = new I18n<MyContext>({
  defaultLocale: "uk",
  directory: "locales",
});

// 1. Спочатку підключаємо плагін інтернаціоналізації
bot.use(i18n);

// 2. Наша кастомна мідлваря для надійного витягування мови з БД Prisma
bot.use(async (ctx, next) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return await next();

  try {
    // Шукаємо користувача в базі даних
    const worker = await prisma.worker.findUnique({
      where: { telegramId: BigInt(telegramId) },
      select: { language: true }
    });

    const userLang = worker?.language || "uk";

    // Примусово застосовуємо мову для поточного повідомлення/кліку через метод useLocale
    if (ctx.i18n && typeof ctx.i18n.useLocale === "function") {
      ctx.i18n.useLocale(userLang);
    }

  } catch (err) {
    console.error("Помилка власної мідлварі визначення мови:", err);
  }

  await next(); // Передаємо керування командам та хандлерам меню
});

// 3. Реєстрація команд та глобального обробника текстових повідомлень
bot.command("start", handleStartCommand);
bot.on("message:text", handleMenuClicks);

// Запуск бота
bot.start();
console.log("🚀 Бот залізобетонно запущений з підтримкою i18n (UA/EN)!");