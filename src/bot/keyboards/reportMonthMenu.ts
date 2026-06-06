import { Keyboard } from "grammy";
import type { MyContext } from "../../index.js";

// РЕГУЛЯТОР ПЕРІОДУ: Змінюй це число, щоб показувати більше або менше місяців для звітів
const REPORT_MONTHS_LIMIT = 3;

export function getReportMonthKeyboard(ctx: MyContext) {
  const keyboard = new Keyboard();
  const now = new Date();
  
  const monthsNames = ctx.t("calendar-months").split("_");
  const currentMonthIdx = now.getMonth();

  const buttons: string[] = [];

  // Генеруємо місяці від поточного назад
  for (let i = 0; i < REPORT_MONTHS_LIMIT; i++) {
    let targetMonthIdx = currentMonthIdx - i;
    if (targetMonthIdx < 0) targetMonthIdx += 12; // Перехід на минулий рік

    // Додаємо до тексту кнопки маркер звіту, щоб бот розумів, що це запит календаря звітності
    buttons.push(`📅 ${monthsNames[targetMonthIdx]}`);
  }

  // Робимо хронологічний порядок (наприклад: Квітень, Травень, Червень)
  buttons.reverse();

  // Додаємо на клавіатуру по 3 в ряд
  buttons.forEach((btnText, index) => {
    keyboard.text(btnText);
    if ((index + 1) % 3 === 0) keyboard.row();
  });

  if (buttons.length % 3 !== 0) keyboard.row();

  keyboard.text(ctx.t("btn-cancel")).resized();

  return keyboard;
}