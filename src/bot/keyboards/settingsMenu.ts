import { Keyboard } from "grammy";
import type { MyContext } from "../../index.js";
import { ADMIN_TG_ID } from "../../index.js";

export function getSettingsKeyboard(ctx: MyContext) {
  const keyboard = new Keyboard();
  const userId = ctx.from?.id; // Отримуємо Telegram ID поточного користувача

  // Додаємо кнопку сповіщень без перенесення на новий рядок (.row())
  keyboard.text(ctx.t("btn-notifications"));

  // ЯКЩО ЦЕ ТИ (АДМІН) — додаємо кнопку керування зправа від сповіщень в той самий рядок
  if (userId === ADMIN_TG_ID) {
    keyboard.text("🛠 Керування кнопками бота");
  }
  
  // Тепер переносимо на новий рядок для решти кнопок
  keyboard.row();

  keyboard.text(ctx.t("btn-change-lang")).text(ctx.t("btn-calendar-view")).row();
  keyboard.text(ctx.t("btn-reload")).row();
  keyboard.text(ctx.t("btn-back-main")).resized();
  
  return keyboard;
}

/**
 * 2. Меню вибору мови інтерфейсу
 */
export function getLanguageKeyboard(ctx: MyContext) {
  return new Keyboard()
    .text("🇺🇦 Українська").text("🇬🇧 English").text("🇷🇺 Русский")
    .row()
    .text("🇵🇱 Polski").text("🇪🇸 Español")
    .row()
    .text(ctx.t("btn-back-settings"))
    .resized();
}

/**
 * 3. Меню вибору стилю відображення календаря («Список» або «Картинка»)
 */
export function getCalendarViewKeyboard(ctx: MyContext) {
  return new Keyboard()
    .text(ctx.t("btn-view-reply"))  // Відображатиметься як "Список" відповідно до локалізації
    .text(ctx.t("btn-view-inline")) // Відображатиметься як "Картинка" відповідно до локалізації
    .row()
    .text(ctx.t("btn-back-settings"))
    .resized();
}

/**
 * 4. Головне підменю налаштувань сповіщень
 */
export function getNotificationsMenuKeyboard(ctx: MyContext, enabled: boolean) {
  const toggleButton = enabled ? ctx.t("btn-notif-toggle-off") : ctx.t("btn-notif-toggle-on");
  
  const keyboard = new Keyboard().text(toggleButton).row();
  
  if (enabled) {
    keyboard.text(ctx.t("btn-notif-interval")).text(ctx.t("btn-notif-time")).row();
  }
  
  return keyboard.text(ctx.t("btn-back-settings")).resized();
}

/**
 * 5. Меню вибору періодичності нагадувань
 */
export function getNotifIntervalKeyboard(ctx: MyContext) {
  return new Keyboard()
    .text(ctx.t("btn-interval-1")).text(ctx.t("btn-interval-2"))
    .row()
    .text(ctx.t("btn-interval-3")).text(ctx.t("btn-interval-7"))
    .row()
    .text(ctx.t("btn-back-settings"))
    .resized();
}

/**
 * 6. ТАЙМ-ПІКЕР (Крок 1 з 2): Вибір годин (від 00:00 до 23:00)
 */
export function getNotifHoursKeyboard() {
  const keyboard = new Keyboard();
  
  // Генеруємо сітку годин по 6 штук у ряд для компактності
  for (let i = 0; i < 24; i++) {
    const hourStr = String(i).padStart(2, "0");
    keyboard.text(`${hourStr}:...`);
    if ((i + 1) % 6 === 0) keyboard.row();
  }
  
  return keyboard.text("Назад до сповіщень").resized();
}

/**
 * 7. ТАЙМ-ПІКЕР (Крок 2 з 2): Вибір точних хвилин з кроком у 5 хвилин
 */
export function getNotifMinutesKeyboard() {
  return new Keyboard()
    .text("00").text("05").text("10").text("15")
    .row()
    .text("20").text("25").text("30").text("35")
    .row()
    .text("40").text("45").text("50").text("55")
    .row()
    .text("Назад до сповіщень")
    .resized();
}