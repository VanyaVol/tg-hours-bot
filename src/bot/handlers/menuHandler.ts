import { handleStartCommand } from "../commands/start.js";
import { handleChangeLanguage } from "./changeLanguage.js";
import { getMainMenuKeyboard } from "../keyboards/mainMenu.js";
import { getSettingsKeyboard, getLanguageKeyboard } from "../keyboards/settingsMenu.js";
import type { MyContext } from "../../index.js";

export async function handleMenuClicks(ctx: MyContext) {
  const text = ctx.message?.text;
  if (!text) return;

  // 1. Обробка вибору мови (завжди нативні тексти)
  if (text === "🇺🇦 Українська" || text === "🇬🇧 English") {
    return await handleChangeLanguage(ctx);
  }

  // 2. Системні кнопки навігації.
  // Просто пропишемо всі можливі варіанти (UA та EN) прямо з твоїх .ftl файлів:
  const reloadVariants = ["🔄 Перезавантаження", "🔄 Reload"];
  const backMainVariants = ["🔙 Назад до меню", "⬅️ Back to main menu", "🔙 Back to main menu"];
  const backSettingsVariants = ["🔙 Назад", "⬅️ Back", "🔙 Back"];

  // Перевіряємо збіг
  if (reloadVariants.includes(text)) {
    await ctx.reply("Reloading / Перезавантаження...");
    return await handleStartCommand(ctx);
  }

  if (backMainVariants.includes(text)) {
    return await ctx.reply(ctx.t("msg-welcome-back", { name: ctx.from?.first_name || "Worker" }), { 
      reply_markup: getMainMenuKeyboard(ctx) 
    });
  }

  if (backSettingsVariants.includes(text)) {
    return await ctx.reply(ctx.t("msg-settings-title"), { reply_markup: getSettingsKeyboard(ctx) });
  }

  // 3. Динамічні кнопки контенту (працюють строго за поточною локаллю користувача)
  if (text === ctx.t("btn-enter-hours")) {
    await ctx.reply(ctx.t("msg-enter-hours"));
  } 
  else if (text === ctx.t("btn-calendar")) {
    await ctx.reply(ctx.t("msg-calendar-loading"));
  } 
  else if (text === ctx.t("btn-status")) {
    await ctx.reply(ctx.t("msg-status-select"));
  } 
  else if (text === ctx.t("btn-request-fix")) {
    await ctx.reply(ctx.t("msg-request-fix"));
  } 
  else if (text === ctx.t("btn-settings")) {
    await ctx.reply(ctx.t("msg-settings-title"), { reply_markup: getSettingsKeyboard(ctx) });
  } 
  else if (text === ctx.t("btn-notifications")) {
    await ctx.reply(ctx.t("msg-notifications-info"));
  } 
  else if (text === ctx.t("btn-change-lang")) {
    await ctx.reply(ctx.t("msg-choose-lang"), { reply_markup: getLanguageKeyboard(ctx) });
  } 
  else if (text === ctx.t("btn-help")) {
    await ctx.reply(ctx.t("msg-help"));
  } 
  else {
    await ctx.reply(ctx.t("msg-unknown"));
  }
}