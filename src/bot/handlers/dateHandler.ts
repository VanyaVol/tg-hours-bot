import { prisma } from "../../config/database.js";
import { getCalendarKeyboard } from "../keyboards/calendarMenu.js";
import { getHoursKeyboard } from "../keyboards/hoursMenu.js";

function getTargetDate(day: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), day, 0, 0, 0, 0));
}

export async function processDateSelection(ctx: any, text: string, workerDbId: number) {
  const cleanText = text.replace(/[^0-9]/g, "");
  const clickedDay = parseInt(cleanText, 10);
  const todayDate = new Date().getDate();

  if (text === " " || text.trim() === "") {
    // ВИПРАВЛЕНО: Видалили другий аргумент, залишили тільки ctx
    const calendarKeyboard = await getCalendarKeyboard(ctx); 
    return await ctx.reply(ctx.t("msg-choose-date"), { reply_markup: calendarKeyboard });
  }

  if (!isNaN(clickedDay) && clickedDay >= 1 && clickedDay <= 31) {
    if (clickedDay > todayDate) return await ctx.reply(ctx.t("msg-future-date-error"));
    const targetDate = getTargetDate(clickedDay);
    await prisma.timeLog.deleteMany({ where: { workerId: workerDbId, hours: { lt: 0 } } });
    await prisma.timeLog.create({ data: { workerId: workerDbId, date: targetDate, hours: -1 } });

    return await ctx.reply(ctx.t("msg-select-hours", { date: `${clickedDay}-е число` }), { reply_markup: getHoursKeyboard(ctx) });
  }
  await ctx.reply(ctx.t("msg-unknown"));
}