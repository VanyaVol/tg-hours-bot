import { prisma } from "../../config/database.js";
import { getMainMenuKeyboard } from "../keyboards/mainMenu.js";
import type { MyContext } from "../../index.js";

export async function handleStartCommand(ctx: MyContext) {
  const telegramId = ctx.from?.id;
  const firstName = ctx.from?.first_name || "Worker";
  const lastName = ctx.from?.last_name || null;

  if (!telegramId) return;

  try {
    let worker = await prisma.worker.findUnique({
      where: { telegramId: BigInt(telegramId) }
    });

    if (!worker) {
      worker = await prisma.worker.create({
        data: { telegramId: BigInt(telegramId), firstName, lastName }
      });
      await ctx.reply(ctx.t("msg-welcome-new"), { reply_markup: getMainMenuKeyboard(ctx) });
    } else {
      await ctx.reply(ctx.t("msg-welcome-back", { name: worker.firstName }), { reply_markup: getMainMenuKeyboard(ctx) });
    }
  } catch (error) {
    console.error("Помилка у команді /start:", error);
    await ctx.reply("❌ Error occurred during login.");
  }
}