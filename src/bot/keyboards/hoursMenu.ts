import { Keyboard } from "grammy";
import type { MyContext } from "../../index.js";

export function getHoursKeyboard(ctx: MyContext) {
  const keyboard = new Keyboard();

  // Генеруємо сітку кнопок від 1 до 12 (по 4 штуки в ряд) знизу екрана
  for (let i = 1; i <= 12; i++) {
    keyboard.text(String(i));
    if (i % 4 === 0) keyboard.row();
  }

  // Самий нижній ряд кнопок
  keyboard
    .text(ctx.t("btn-did-not-work"))
    .text(ctx.t("btn-cancel"))
    .resized();

  return keyboard;
}