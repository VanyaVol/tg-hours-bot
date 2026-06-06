import { prisma } from "../../config/database.js";
import { getMainMenuKeyboard } from "../keyboards/mainMenu.js";
import { getSettingsKeyboard } from "../keyboards/settingsMenu.js";
import { getHoursKeyboard } from "../keyboards/hoursMenu.js";
import { ADMIN_TG_ID } from "../../index.js";

export async function handleCorrectionSteps(ctx: any, activeDraftLog: any, text: string, telegramId: number, workerDbId: number) {
  
  // Перевіряємо, чи користувач намагається вийти або перемкнутися на інше меню
  const sysText = text.trim();
  if (
    sysText === ctx.t("btn-back-main") || 
    sysText === ctx.t("btn-cancel") || 
    sysText === ctx.t("btn-settings") || 
    sysText.includes("Налаштування")
  ) {
    await prisma.timeLog.delete({ where: { id: activeDraftLog.id } });
    
    if (sysText.includes("Налаштування") || sysText === ctx.t("btn-settings")) {
      return await ctx.reply(ctx.t("msg-settings-title"), { reply_markup: getSettingsKeyboard(ctx) });
    }
    return await ctx.reply(ctx.t("msg-welcome-back", { name: ctx.from?.first_name || "Worker" }), {
      reply_markup: getMainMenuKeyboard(ctx)
    });
  }

  // --- КРОК 1: ОБРОБКА ОБРАНОГО ДНЯ (Стан -500) ---
  if (activeDraftLog.hours === -500) {
    const incomingText = ctx.callbackQuery?.data || text || "";
    
    // Відсікаємо все, що йде після риски '|' (години), щоб вони не склеювалися з днем
    const textBeforePipe = incomingText.split("|")[0];
    const cleanDay = parseInt(textBeforePipe.replace(/[^0-9]/g, ""), 10);
    const todayDate = new Date().getDate();

    if (isNaN(cleanDay) || cleanDay < 1 || cleanDay > 31) {
      if (ctx.callbackQuery) await ctx.answerCallbackQuery().catch(() => {});
      return await ctx.reply("❌ Будь ласка, оберіть день (число) на кнопках календаря або введіть його цифрою (наприклад: 15):");
    }
    
    if (cleanDay > todayDate) {
      if (ctx.callbackQuery) await ctx.answerCallbackQuery().catch(() => {});
      return await ctx.reply("❌ Ви не можете запросити коригування за майбутню дату. Оберіть інший день:");
    }

    if (ctx.callbackQuery) await ctx.answerCallbackQuery().catch(() => {});

    const now = new Date();
    const targetDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), cleanDay, 0, 0, 0, 0));

    await prisma.timeLog.update({
      where: { id: activeDraftLog.id },
      data: { date: targetDate, hours: -510 }
    });

    return await ctx.reply(
      `📅 Ви обрали дату: <b>${cleanDay}-е число</b>.\n\n⏱️ Оберіть на клавіатурі або введіть кількість годин, яку потрібно зарахувати за цей день:`, 
      { parse_mode: "HTML", reply_markup: getHoursKeyboard(ctx) }
    );
  }

  // --- КРОК 2: ОБРОБКА ВВЕДЕНИХ ГОДИН (Стан -510) ---
  if (activeDraftLog.hours === -510) {
    let hoursNum: number;

    // ВИПРАВЛЕНО: Перевіряємо, чи користувач натиснув кнопку "Не працював"
    const lowerText = text.toLowerCase();
    if (lowerText.includes("не працював") || lowerText.includes("✖") || lowerText.includes("не работал")) {
      hoursNum = 0; // Прирівнюємо до 0 годин
    } else {
      // Якщо це звичайна цифра або кнопка з цифрою типу "⏱️ 8 год."
      const cleanText = text.replace(",", ".");
      hoursNum = parseFloat(cleanText.replace(/[^0-9.]/g, ""));
    }

    if (isNaN(hoursNum) || hoursNum < 0 || hoursNum > 12) {
      return await ctx.reply("❌ Некоректна кількість годин. Оберіть значення з кнопок меню або введіть число від 0 до 12:");
    }

    const encodedState = -520 - hoursNum;

    await prisma.timeLog.update({
      where: { id: activeDraftLog.id },
      data: { hours: encodedState }
    });

    return await ctx.reply("💬 Напишіть коротку причину коригування (наприклад: 'Забув відмітитися'):", {
      reply_markup: { remove_keyboard: true }
    });
  }

  // --- КРОК 3: ОБРОБКА ПРИЧИНИ ТА ВІДПРАВКА АДМІНУ (Стан <= -520) ---
  if (activeDraftLog.hours <= -520) {
    const hoursNum = Math.abs(activeDraftLog.hours) - 520;
    const targetDate = activeDraftLog.date;

    const request = await prisma.correctionRequest.create({
      data: {
        workerId: workerDbId,
        date: targetDate,
        hours: hoursNum,
        comment: text.trim()
      }
    });

    await prisma.timeLog.delete({ where: { id: activeDraftLog.id } });

    const dateStr = `${targetDate.getUTCDate()}.${targetDate.getUTCMonth() + 1}.${targetDate.getUTCFullYear()}`;
    const workerName = ctx.from?.first_name || "Worker";
    const username = ctx.from?.username ? `@${ctx.from.username}` : "немає";

    const adminMessage = `🔔 <b>Новий запит на коригування!</b>\n\n` +
                         `👤 <b>Працівник:</b> ${workerName} (${username})\n` +
                         `📅 <b>Дата для зміни:</b> ${dateStr}\n` +
                         `⏱️ <b>Нові години:</b> ${hoursNum} god.\n` +
                         `💬 <b>Причина:</b> ${text.trim()}`;

    const adminKeyboard = {
      inline_keyboard: [
        [
          { text: "✅ Підтвердити", callback_data: `approve_req:${request.id}` },
          { text: "❌ Відхилити", callback_data: `reject_req:${request.id}` }
        ]
      ]
    };

    try {
      await ctx.api.sendMessage(ADMIN_TG_ID, adminMessage, { parse_mode: "HTML", reply_markup: adminKeyboard });
    } catch (err) {
      console.error("Не вдалося надіслати повідомлення адміну:", err);
    }

    return await ctx.reply("🚀 Ваш запит на коригування успішно надіслано адміну на перевірку!", {
      reply_markup: getMainMenuKeyboard(ctx)
    });
  }
}