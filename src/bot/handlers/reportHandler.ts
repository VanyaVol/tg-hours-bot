import { prisma } from "../../config/database.js";
import { generateCalendarImage } from "../utils/calendarImageGenerator.js";
import { getMainMenuKeyboard } from "../keyboards/mainMenu.js";
import { InputFile } from "grammy";

export async function processReport(ctx: any, text: string, workerDbId: number, dbWorker: any, monthsNames: string[]) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const monthName = text.replace("📅 ", "");
  const monthIdx = monthsNames.indexOf(monthName);
  if (monthIdx === -1) return await ctx.reply(ctx.t("msg-unknown"));

  const now = new Date();
  let targetYear = now.getFullYear();
  if (monthIdx > now.getMonth()) targetYear -= 1;

  const startOfMonth = new Date(targetYear, monthIdx, 1);
  const endOfMonth = new Date(targetYear, monthIdx + 1, 0, 23, 59, 59);

  try {
    const logs = await prisma.timeLog.findMany({
      where: { workerId: workerDbId, date: { gte: startOfMonth, lte: endOfMonth }, hours: { gte: 0 } },
      orderBy: { date: "asc" }
    });

    if (logs.length === 0) {
      return await ctx.reply(ctx.t("msg-report-empty"), { 
        reply_markup: await getMainMenuKeyboard(ctx, telegramId) // Додано await та telegramId
      });
    }

    const totalHours = logs.reduce((sum, log) => sum + log.hours, 0);

    // ====================================================
    // ТВІЙ ОРИГІНАЛЬНИЙ ГРАФІЧНИЙ КАЛЕНДАР (IMAGE)
    // ====================================================
    if (dbWorker.calendarView === "IMAGE") {
      await ctx.reply("⏳ Генерую ваш персональний calendar...");
      const mappedLogs = logs.map(l => ({ day: l.date.getDate(), hours: l.hours }));
      const imageBuffer = generateCalendarImage(monthName, targetYear, mappedLogs);

      return await ctx.replyWithPhoto(new InputFile(imageBuffer), {
        caption: `📅 *Календар робочих днів:* ${monthName} ${targetYear}\n\n📊 *Всього за місяць:* ${totalHours} відпрацьованих годин.`,
        parse_mode: "Markdown",
        reply_markup: await getMainMenuKeyboard(ctx, telegramId) // Додано await та telegramId
      });
    }

    // ====================================================
    // ТВІЙ ТЕКСТОВИЙ СПИСОК (LIST)
    // ====================================================
    let reportLines = [`${ctx.t("msg-report-title", { month: monthName, year: String(targetYear) })}\n`];
    logs.forEach(log => {
      const dayStr = String(log.date.getDate()).padStart(2, "0");
      const monthStr = String(log.date.getMonth() + 1).padStart(2, "0");
      if (log.hours === 0) reportLines.push(`❌ ${dayStr}.${monthStr} — 🚫 Не працював`);
      else reportLines.push(`✅ ${dayStr}.${monthStr} — ⏱️ ${log.hours} god.`);
    });

    reportLines.push(`\n📈 **Всього відпрацьовано:** ${totalHours} god.`);
    return await ctx.reply(reportLines.join("\n"), { 
      parse_mode: "Markdown", 
      reply_markup: await getMainMenuKeyboard(ctx, telegramId) // Додано await та telegramId
    });

  } catch (err) {
    console.error(err);
    return await ctx.reply("❌ Database error.");
  }
}