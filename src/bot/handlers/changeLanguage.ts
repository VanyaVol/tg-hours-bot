import { prisma } from "../../config/database.js";
import { getSettingsKeyboard } from "../keyboards/settingsMenu.js";
import type { MyContext } from "../../index.js";

export async function handleChangeLanguage(ctx: MyContext) { 
  const text = ctx.message?.text;
  const telegramId = ctx.from?.id;
  const firstName = ctx.from?.first_name || "Worker";
  const lastName = ctx.from?.last_name || null;

  if (!telegramId) return;

  const langCode = text === "🇺🇦 Українська" ? "uk" : "en";

  try {
    // 1. Оновлюємо або створюємо юзера в БД (Prisma)
    await prisma.worker.upsert({
      where: { telegramId: BigInt(telegramId) },
      update: { language: langCode },
      create: { 
        telegramId: BigInt(telegramId), 
        firstName, 
        lastName, 
        language: langCode 
      },
    });

    // 2. Змінюємо мову в самому плагіні через правильний асинхронний метод setLocale
    if (ctx.i18n && typeof ctx.i18n.setLocale === "function") {
      await ctx.i18n.setLocale(langCode);
    }

    // 3. Відповідаємо вже оновленою мовою
    await ctx.reply(ctx.t("msg-lang-changed"), {
      reply_markup: getSettingsKeyboard(ctx),
    });
  } catch (error) {
    console.error("🔴 КРИТИЧНА ПОМИЛКА ЗМІНИ МОВИ:", error);
    await ctx.reply("❌ Error changing language.");
  }
}