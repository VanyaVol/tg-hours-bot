import { prisma } from "../../config/database.js";
import { getSettingsKeyboard, getNotifMinutesKeyboard } from "../keyboards/settingsMenu.js";

export async function handleNotificationSteps(ctx: any, activeDraftLog: any, text: string, telegramId: number, dbWorker: any) {
  // --- КРОК: ВИБІР ПЕРІОДИЧНОСТІ СПОВІЩЕНЬ (hours === -200) ---
  if (activeDraftLog.hours === -200) {
    let intervalDays = 1;
    if (text === ctx.t("btn-interval-2")) intervalDays = 2;
    if (text === ctx.t("btn-interval-3")) intervalDays = 3;
    if (text === ctx.t("btn-interval-7")) intervalDays = 7;

    await prisma.worker.update({ where: { telegramId: BigInt(telegramId) }, data: { notificationInterval: intervalDays } });
    await prisma.timeLog.delete({ where: { id: activeDraftLog.id } });
    return await ctx.reply(ctx.t("msg-notif-updated"), { reply_markup: getSettingsKeyboard(ctx) });
  }

  // --- КРОК 1 З 2: ВИБІР ГОДИНИ СПОВІЩЕННЯ (hours === -300) ---
  if (activeDraftLog.hours === -300) {
    const cleanHour = text.replace(/[^0-9]/g, "");
    const hourNum = parseInt(cleanHour, 10);

    if (isNaN(hourNum) || hourNum < 0 || hourNum > 23) {
      return await ctx.reply("❌ Будь ласка, оберіть годину з кнопок (00-23):");
    }

    const formattedHour = String(hourNum).padStart(2, "0");
    
    await prisma.worker.update({
      where: { telegramId: BigInt(telegramId) },
      data: { notificationTime: `${formattedHour}:` }
    });

    await prisma.timeLog.update({
      where: { id: activeDraftLog.id },
      data: { hours: -400 }
    });

    return await ctx.reply(ctx.t("msg-choose-minute", { hour: formattedHour }), { reply_markup: getNotifMinutesKeyboard() });
  }

  // --- КРОК 2 З 2: ВИБІР ХВИЛИНИ СПОВІЩЕННЯ (hours === -400) ---
  if (activeDraftLog.hours === -400) {
    const cleanMinute = text.replace(/[^0-9]/g, "");
    const minuteNum = parseInt(cleanMinute, 10);

    if (isNaN(minuteNum) || minuteNum < 0 || minuteNum > 59) {
      return await ctx.reply("❌ Некоректні хвилини. Оберіть значення від 00 до 59:");
    }

    const formattedMinute = String(minuteNum).padStart(2, "0");
    const currentSavedHour = dbWorker.notificationTime.split(":")[0] || "20";
    const finalTimeStr = `${currentSavedHour}:${formattedMinute}`;

    await prisma.worker.update({
      where: { telegramId: BigInt(telegramId) },
      data: { notificationTime: finalTimeStr }
    });

    await prisma.timeLog.delete({ where: { id: activeDraftLog.id } });
    return await ctx.reply(ctx.t("msg-notif-updated"), { reply_markup: getSettingsKeyboard(ctx) });
  }
}