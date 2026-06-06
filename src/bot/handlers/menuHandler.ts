import { handleStartCommand } from "../commands/start.js";
import { handleChangeLanguage } from "./changeLanguage.js";
import { getMainMenuKeyboard } from "../keyboards/mainMenu.js";
import {
  getSettingsKeyboard,
  getLanguageKeyboard,
  getCalendarViewKeyboard,
  getNotificationsMenuKeyboard,
  getNotifIntervalKeyboard,
  getNotifHoursKeyboard,
  getNotifMinutesKeyboard
} from "../keyboards/settingsMenu.js";
import { getCalendarKeyboard } from "../keyboards/calendarMenu.js";
import { getReportMonthKeyboard } from "../keyboards/reportMonthMenu.js";
import { getAdminButtonsKeyboard } from "../keyboards/adminMenu.js";
import { prisma } from "../../config/database.js";
import type { MyContext } from "../../index.js";

// Імпорти ізольованих хендлерів
import { handleHoursInput } from "./hoursHandler.js";
import { handleNotificationSteps } from "./notificationHandler.js";
import { processReport } from "./reportHandler.js";
import { processDateSelection } from "./dateHandler.js";
import { handleCorrectionSteps } from "./correctionHandler.js";

import { ADMIN_TG_ID } from "../../index.js";

export async function handleMenuClicks(ctx: MyContext) {
  const text = ctx.message?.text || ctx.callbackQuery?.data || "";
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const dbWorker = await prisma.worker.findUnique({ where: { telegramId: BigInt(telegramId) } });
  if (!dbWorker) return await ctx.reply("❌ Користувача не знайдено. Введіть /start");
  const workerDbId = dbWorker.id;
  const monthsNames = ctx.t("calendar-months").split("_");

  // 1. Обробка вибору мови
  if (["🇺🇦 Українська", "🇬🇧 English", "🇷🇺 Русский", "🇵🇱 Polski", "🇪🇸 Español"].includes(text)) {
    return await handleChangeLanguage(ctx);
  }

  // ====================================================
  // КЕРУВАННЯ ДОСТУПОМ ДО КНОПОК ДЛЯ АДМІНА (БЕЗ КОНФЛІКТІВ)
  // ====================================================
  
  // Вхід в меню керування кнопками
  if (text === "🛠 Керування кнопками бота" && telegramId === ADMIN_TG_ID) {
    return await ctx.reply("⚙️ <b>Меню керування доступом до кнопок</b>\n\nНатисніть на кнопку нижче, щоб увімкнути або вимкнути її відображення для користувачів:", {
      parse_mode: "HTML",
      reply_markup: getAdminButtonsKeyboard(ctx, dbWorker.allowCorrections, dbWorker.allowLeaves)
    });
  }

  // ТУМБЛЕР 1: Керування кнопкою "Запросити коригування"
  if (text.includes("Доступ: Запросити коригування") && telegramId === ADMIN_TG_ID) {
    const currentAdmin = await prisma.worker.findUnique({ where: { telegramId: BigInt(ADMIN_TG_ID) } });
    const currentStatus = currentAdmin?.allowCorrections ?? true;

    const updatedWorker = await prisma.worker.update({
      where: { telegramId: BigInt(ADMIN_TG_ID) },
      data: { allowCorrections: !currentStatus }
    });

    dbWorker.allowCorrections = updatedWorker.allowCorrections;

    return await ctx.reply(`Змінено! Кнопка "Запросити коригування" тепер <b>${updatedWorker.allowCorrections ? "УВІМКНЕНА" : "ВИМКНЕНА"}</b> для користувачів.`, {
      parse_mode: "HTML",
      reply_markup: getAdminButtonsKeyboard(ctx, updatedWorker.allowCorrections, dbWorker.allowLeaves)
    });
  }

  // ТУМБЛЕР 2: Керування кнопкою Статусу (Вихідний/Відпустка/Лікарняний)
  if (text.includes("Доступ: Вихідний") && telegramId === ADMIN_TG_ID) {
    const currentAdmin = await prisma.worker.findUnique({ where: { telegramId: BigInt(ADMIN_TG_ID) } });
    const currentStatus = currentAdmin?.allowLeaves ?? true;

    const updatedWorker = await prisma.worker.update({
      where: { telegramId: BigInt(ADMIN_TG_ID) },
      data: { allowLeaves: !currentStatus }
    });

    dbWorker.allowLeaves = updatedWorker.allowLeaves;

    return await ctx.reply(`Змінено! Кнопка "Вихідний/Відпустка/Лікарняний" тепер <b>${updatedWorker.allowLeaves ? "УВІМКНЕНА" : "ВИМКНЕНА"}</b> для користувачів.`, {
      parse_mode: "HTML",
      reply_markup: getAdminButtonsKeyboard(ctx, dbWorker.allowCorrections, updatedWorker.allowLeaves)
    });
  }

  // 2. Системні кнопки навігації
  if (text === ctx.t("btn-reload")) {
    await prisma.timeLog.deleteMany({ where: { workerId: workerDbId, hours: { lt: 0 } } });
    await ctx.reply("Reloading...");
    return await handleStartCommand(ctx);
  }

  if (text === ctx.t("btn-back-main") || text === ctx.t("btn-cancel")) {
    await prisma.timeLog.deleteMany({ where: { workerId: workerDbId, hours: { lt: 0 } } });
    return await ctx.reply(ctx.t("msg-welcome-back", { name: ctx.from?.first_name || "Worker" }), {
      reply_markup: await getMainMenuKeyboard(ctx, telegramId)
    });
  }

  if (text === ctx.t("btn-back-settings") || text === "Назад до сповіщень") {
    await prisma.timeLog.deleteMany({ where: { workerId: workerDbId, hours: { lt: 0 } } });
    return await ctx.reply(ctx.t("msg-settings-title"), { reply_markup: getSettingsKeyboard(ctx) });
  }

  // Шукаємо активні чернетки стейтів
  const activeDraftLog = await prisma.timeLog.findFirst({
    where: { workerId: workerDbId, hours: { lt: 0 } }
  });

  // 3. ОБРОБКА КРОКІВ НАЛАШТУВАННЯ, ВВЕДЕННЯ ГОДИН ТА КОРЕКТИРОВОК
  if (activeDraftLog) {
    if (activeDraftLog.hours <= -500) {
      return await handleCorrectionSteps(ctx, activeDraftLog, text, telegramId, workerDbId);
    }
    else if (activeDraftLog.hours === -1) {
      return await handleHoursInput(ctx, activeDraftLog, text, workerDbId);
    } 
    else {
      return await handleNotificationSteps(ctx, activeDraftLog, text, telegramId, dbWorker);
    }
  }

  // ====================================================
  // 4. ДИНАМІЧНІ КНОПКИ ГОЛОВНОГО МЕНЮ
  // ====================================================
  if (text === ctx.t("btn-enter-hours")) {
    const calendarKeyboard = await getCalendarKeyboard(ctx);
    return await ctx.reply(ctx.t("msg-choose-date"), { reply_markup: calendarKeyboard });
  }
  else if (text === ctx.t("btn-calendar")) {
    return await ctx.reply(ctx.t("msg-choose-report-month"), { reply_markup: getReportMonthKeyboard(ctx) });
  }
  
  // КНОПКА ЗАПРОСИТИ КОРЕКТИРОВКУ (Звичайні користувачі)
  else if (text === ctx.t("btn-request-correction") || text === ctx.t("btn-request-fix") || text.toLowerCase().includes("кориг") || text.toLowerCase().includes("корект")) {
    await prisma.timeLog.deleteMany({ where: { workerId: workerDbId, hours: { lt: 0 } } });
    
    await prisma.timeLog.create({
      data: { workerId: workerDbId, date: new Date(), hours: -500 }
    });

    const calendarKeyboard = await getCalendarKeyboard(ctx);
    return await ctx.reply("✍️ <b>Запит на коригування годин.</b>\n\nОберіть на календарі день місяця, за який ви хочете змінити дані:", { 
      parse_mode: "HTML", 
      reply_markup: calendarKeyboard 
    });
  }
  
  // Логіка головного меню сповіщень
  else if (text === ctx.t("btn-notifications")) {
    const statusText = dbWorker.notificationsEnabled ? "🟢 Увімкнено" : "🔴 Вимкнено";
    let intervalText = "Щодня";
    if (dbWorker.notificationInterval === 2) intervalText = "Раз на 2 дні";
    if (dbWorker.notificationInterval === 3) intervalText = "Раз на 3 дні";
    if (dbWorker.notificationInterval === 7) intervalText = "Раз на тиждень";

    const displayTime = dbWorker.notificationTime.endsWith(":") ? "20:00" : dbWorker.notificationTime;

    return await ctx.reply(
      ctx.t("msg-notification-menu", { status: statusText, interval: intervalText, time: displayTime }),
      { parse_mode: "Markdown", reply_markup: getNotificationsMenuKeyboard(ctx, dbWorker.notificationsEnabled) }
    );
  }
  else if (text === ctx.t("btn-notif-toggle-on") || text === ctx.t("btn-notif-toggle-off")) {
    const newState = text === ctx.t("btn-notif-toggle-on");
    const updatedWorker = await prisma.worker.update({
      where: { telegramId: BigInt(telegramId) },
      data: { notificationsEnabled: newState }
    });

    dbWorker.notificationsEnabled = updatedWorker.notificationsEnabled;

    const statusText = updatedWorker.notificationsEnabled ? "🟢 Увімкнено" : "🔴 Вимкнено";
    let intervalText = "Щодня";
    if (updatedWorker.notificationInterval === 2) intervalText = "Раз на 2 дні";
    if (updatedWorker.notificationInterval === 3) intervalText = "Раз на 3 дні";
    if (updatedWorker.notificationInterval === 7) intervalText = "Раз на тиждень";

    return await ctx.reply(
      ctx.t("msg-notification-menu", { status: statusText, interval: intervalText, time: updatedWorker.notificationTime }),
      { parse_mode: "Markdown", reply_markup: getNotificationsMenuKeyboard(ctx, updatedWorker.notificationsEnabled) }
    );
  }
  else if (text === ctx.t("btn-notif-interval") && dbWorker.notificationsEnabled) {
    await prisma.timeLog.create({ data: { workerId: workerDbId, date: new Date(), hours: -200 } });
    return await ctx.reply(ctx.t("msg-choose-interval"), { reply_markup: getNotifIntervalKeyboard(ctx) });
  }
  else if (text === ctx.t("btn-notif-time") && dbWorker.notificationsEnabled) {
    await prisma.timeLog.create({ data: { workerId: workerDbId, date: new Date(), hours: -300 } });
    return await ctx.reply(ctx.t("msg-choose-hour"), { parse_mode: "Markdown", reply_markup: getNotifHoursKeyboard() });
  }

  // Інші налаштування
  else if (text === ctx.t("btn-settings")) {
    return await ctx.reply(ctx.t("msg-settings-title"), { parse_mode: "HTML", reply_markup: getSettingsKeyboard(ctx) });
  }
  else if (text === ctx.t("btn-change-lang")) {
    return await ctx.reply(ctx.t("msg-choose-lang"), { reply_markup: getLanguageKeyboard(ctx) });
  }
  else if (text === ctx.t("btn-calendar-view")) {
    return await ctx.reply(ctx.t("msg-calendar-view-title"), { reply_markup: getCalendarViewKeyboard(ctx) });
  }
  else if (text === ctx.t("btn-view-reply")) {
    await prisma.worker.update({ where: { telegramId: BigInt(telegramId) }, data: { calendarView: "LIST" } });
    return await ctx.reply(ctx.t("msg-view-changed"), { reply_markup: getSettingsKeyboard(ctx) });
  }
  else if (text === ctx.t("btn-view-inline")) {
    await prisma.worker.update({ where: { telegramId: BigInt(telegramId) }, data: { calendarView: "IMAGE" } });
    return await ctx.reply(ctx.t("msg-view-changed"), { reply_markup: getSettingsKeyboard(ctx) });
  }
  else if (text === ctx.t("btn-help")) {
    return await ctx.reply(ctx.t("msg-help"));
  }

  // 5. ГЕНЕРАЦІЯ ЗВІТУ
  else if (text.startsWith("📅 ")) {
    return await processReport(ctx, text, workerDbId, dbWorker, monthsNames);
  }
  
  // 6. ОБРОБКА ВИБОРУ ДНЯ В КАЛЕНДАРІ ВВЕДЕННЯ ГОДИН
  else {
    return await processDateSelection(ctx, text, workerDbId);
  }
}