import { Bot, Context } from "grammy";
import * as dotenv from "dotenv";
import { I18n } from "@grammyjs/i18n";
// Імпортуємо тип флейвора через 'import type', щоб Node.js v24 не сварився під час запуска
import type { I18nFlavor } from "@grammyjs/i18n"; 
import { prisma } from "./config/database.js";
import { handleStartCommand } from "./bot/commands/start.js";
import { handleMenuClicks } from "./bot/handlers/menuHandler.js";
import { initNotificationCron } from "./bot/services/notificationService.js"; // ДОДАНО ІМПОРТ КРОНУ

// Поєднуємо базовий контекст grammY та тип локалізації
export type MyContext = Context & I18nFlavor;

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error("TELEGRAM_BOT_TOKEN не задано в .env!");

export const ADMIN_TG_ID = Number(process.env.ADMIN_TG_ID) || 0;
if (!ADMIN_TG_ID) throw new Error("Admin ID не задано в .env!");

const bot = new Bot<MyContext>(token);

// Ініціалізуємо інстанс i18n тільки з базовими налаштуваннями
const i18n = new I18n<MyContext>({
  defaultLocale: "uk",
  directory: "locales",
});

// 1. Спочатку підключаємо плагін інтернаціоналізації
bot.use(i18n);

// 2. Кастомна мідлваря для надійного витягування мови з БД Prisma
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

    // Примусово застосовуємо мову для поточного повідомлення/кліку
    if (ctx.i18n && typeof ctx.i18n.useLocale === "function") {
      ctx.i18n.useLocale(userLang);
    }

  } catch (err) {
    console.error("Помилка власної мідлварі визначення мови:", err);
  }

  await next(); // Передаємо керування командам та хандлерам меню
});

// 3. Ініціалізація планувальника фонових задач (Крону)
initNotificationCron(bot); // ДОДАНО ВИКЛИК СЕРВІСУ

// 4. Реєстрація команд
bot.command("start", handleStartCommand);

// ==========================================
// ОБРОБКА ЗАПИТІВ НА КОРЕКТИРОВКУ (ДЛЯ АДМІНА)
// ==========================================

// Обробник натискання кнопки "✅ Підтвердити"
bot.callbackQuery(/^approve_req:(\d+)/, async (ctx) => {
  const requestId = parseInt(ctx.match[1], 10);
  try {
    const request = await prisma.correctionRequest.findUnique({
      where: { id: requestId },
      include: { worker: true }
    });

    if (!request || request.status !== "PENDING") {
      return await ctx.answerCallbackQuery({ text: "Запит уже оброблено або не знайдено." });
    }

    await prisma.correctionRequest.update({
      where: { id: requestId },
      data: { status: "APPROVED" }
    });

    const existingLog = await prisma.timeLog.findFirst({
      where: { workerId: request.workerId, date: request.date }
    });

    if (existingLog) {
      await prisma.timeLog.update({ where: { id: existingLog.id }, data: { hours: request.hours } });
    } else {
      await prisma.timeLog.create({ data: { workerId: request.workerId, date: request.date, hours: request.hours } });
    }

    // ВИПРАВЛЕНО: Змінили Markdown на HTML, щоб уникнути конфліктів парсингу нікнеймів
    await ctx.editMessageText(`${ctx.callbackQuery.message?.text}\n\n<b>✅ СТАТУС: ПІДТВЕРДЖЕНО</b>`, { parse_mode: "HTML" });
    await ctx.answerCallbackQuery({ text: "Години успішно змінено у базі даних!" });

    // ВИПРАВЛЕНО: Надсилаємо сповіщення користувачу також у стабільному HTML форматі
    const dateStr = `${request.date.getUTCDate()}-го числа`;
    await ctx.api.sendMessage(
      Number(request.worker.telegramId), 
      `✅ Ваш запит на коригування за <b>${dateStr}</b> (${request.hours} год.) було підтверджено адміном!`,
      { parse_mode: "HTML" }
    );
  } catch (err) {
    console.error("Помилка під час підтвердження запиту:", err);
    await ctx.answerCallbackQuery({ text: "❌ Сталася внутрішня помилка." });
  }
});

// Обробник натискання кнопки "❌ Відхилити"
bot.callbackQuery(/^reject_req:(\d+)/, async (ctx) => {
  const requestId = parseInt(ctx.match[1], 10);
  try {
    const request = await prisma.correctionRequest.findUnique({
      where: { id: requestId },
      include: { worker: true }
    });

    if (!request || request.status !== "PENDING") {
      return await ctx.answerCallbackQuery({ text: "Запит уже оброблено або не знайдено." });
    }

    await prisma.correctionRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED" }
    });

    // ВИПРАВЛЕНО: Змінили Markdown на HTML
    await ctx.editMessageText(`${ctx.callbackQuery.message?.text}\n\n<b>❌ СТАТУС: ВІДХИЛЕНО</b>`, { parse_mode: "HTML" });
    await ctx.answerCallbackQuery({ text: "Запит успішно відхилено." });

    // ВИПРАВЛЕНО: Перевели сповіщення користувачу на HTML
    const dateStr = `${request.date.getUTCDate()}-го числа`;
    await ctx.api.sendMessage(
      Number(request.worker.telegramId), 
      `❌ Ваш запит на коригування за <b>${dateStr}</b> було відхилено адміном.`,
      { parse_mode: "HTML" }
    );
  } catch (err) {
    console.error("Помилка під час відхилення запиту:", err);
    await ctx.answerCallbackQuery({ text: "❌ Помилка бази даних." });
  }
});

// ========================================================================
// ГОЛОВНІ ОБРОБНИКИ ТЕКСТУ ТА КЛІКІВ КАЛЕНДАРЯ (СПРЯМОВУЮТЬ В МЕНЮ-ХЕНДЛЕР)
// ========================================================================

// Ловимо звичайні текстові повідомлення та кнопки з меню
bot.on("message:text", handleMenuClicks);

// Ловимо кліки по інлайн-календарю і ТЕЖ відправляємо їх в handleMenuClicks
bot.on("callback_query:data", async (ctx) => {
  if (ctx.callbackQuery.data.startsWith("approve_req:") || ctx.callbackQuery.data.startsWith("reject_req:")) {
    return;
  }
  return await handleMenuClicks(ctx);
});

// Запуск бота
bot.start();
console.log("🚀 Бот залізобетонно запущений з повною підтримкою інлайн-календаря та HTML-модерації!");