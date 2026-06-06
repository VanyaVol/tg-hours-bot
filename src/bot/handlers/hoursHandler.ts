import { prisma } from "../../config/database.js";
import { getMainMenuKeyboard } from "../keyboards/mainMenu.js";
import { getHoursKeyboard } from "../keyboards/hoursMenu.js";

export async function handleHoursInput(ctx: any, activeDraftLog: any, text: string, workerDbId: number) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const targetDate = activeDraftLog.date;
  const targetDay = targetDate.getDate();
  const cleanText = text.replace(/[^0-9.]/g, "");
  const clickedNumber = parseFloat(cleanText);

  // ====================================================
  // ВАРІАНТ: КОРИСТУВАЧ НЕ ПРАЦЮВАВ (0 ГОДИН)
  // ====================================================
  if (text === ctx.t("btn-did-not-work")) {
    try {
      await prisma.timeLog.update({ where: { id: activeDraftLog.id }, data: { hours: 0 } });
      
      return await ctx.reply(ctx.t("msg-status-not-working", { date: `${targetDay}-го числа` }), { 
        reply_markup: await getMainMenuKeyboard(ctx, telegramId) // Додано await та telegramId
      });
    } catch (err) { 
      console.error(err);
      return await ctx.reply("❌ Database error."); 
    }
  }

  // ====================================================
  // ВАРІАНТ: ВВЕДЕННЯ ЗВИЧАЙНИХ ГОДИН (ВІД 1 ДО 12)
  // ====================================================
  if (!isNaN(clickedNumber) && clickedNumber >= 1 && clickedNumber <= 12) {
    try {
      const oldLog = await prisma.timeLog.findFirst({ 
        where: { workerId: workerDbId, date: targetDate, id: { not: activeDraftLog.id } } 
      });
      
      if (oldLog) {
        await prisma.timeLog.update({ where: { id: oldLog.id }, data: { hours: clickedNumber } });
        await prisma.timeLog.delete({ where: { id: activeDraftLog.id } });
      } else {
        await prisma.timeLog.update({ where: { id: activeDraftLog.id }, data: { hours: clickedNumber } });
      }
      
      return await ctx.reply(ctx.t("msg-hours-saved", { date: `${targetDay}-го числа`, hours: String(clickedNumber) }), { 
        reply_markup: await getMainMenuKeyboard(ctx, telegramId) // Додано await та telegramId
      });
    } catch (err) { 
      console.error(err);
      return await ctx.reply("❌ Database error."); 
    }
  }

  // Якщо користувач ввів щось не те — знову показуємо йому клавіатуру вибору годин
  return await ctx.reply(ctx.t("msg-select-hours", { date: String(targetDay) }), { 
    reply_markup: getHoursKeyboard(ctx) 
  });
}