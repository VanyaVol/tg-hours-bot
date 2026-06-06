import { prisma } from "../../config/database.js";
import { getMainMenuKeyboard } from "../keyboards/mainMenu.js"; // Змінили імпорт на головне меню
import type { MyContext } from "../../index.js";

export async function handleChangeLanguage(ctx: MyContext) { 
  const text = ctx.message?.text;
  const telegramId = ctx.from?.id;
  const firstName = ctx.from?.first_name || "Worker";
  const lastName = ctx.from?.last_name || null;

  if (!telegramId || !text) return;

  // Динамічно визначаємо код мови на основі натиснутої кнопки
  let langCode = "uk";
  
  switch (text) {
    case "🇬🇧 English":
      langCode = "en";
      break;
    case "🇷🇺 Русский":
      langCode = "ru";
      break;
    case "🇵🇱 Polski":
      langCode = "pl";
      break;
    case "🇪🇸 Español":
      langCode = "es";
      break;
    case "🇺🇦 Українська":
    default:
      langCode = "uk";
      break;
  }

  try {
    // 1. Оновлюємо або створюємо користувача в базі даних Prisma
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

    // 2. Примусово змінюємо мову в поточному контексті для плагіна i18n
    if (ctx.i18n && typeof ctx.i18n.useLocale === "function") {
      ctx.i18n.useLocale(langCode);
    }

    // 3. ГЕНЕРУЄМО ГОЛОВНЕ МЕНЮ замість налаштувань
    // Воно автоматично підтягне кнопки новою мовою з вашого .ftl файлу (наприклад: 📝 Registrar horas)
    const replyMarkup = getMainMenuKeyboard(ctx);

    // 4. Відповідаємо повідомленням про зміну мови і прикріплюємо головне меню
    await ctx.reply(ctx.t("msg-lang-changed"), {
      reply_markup: replyMarkup,
    });

  } catch (error) {
    console.error("🔴 КРИТИЧНА ПОМИЛКА ЗМІНИ МОВИ:", error);
    await ctx.reply("❌ Error changing language / Помилка зміни мови.");
  }
}