import { Keyboard } from "grammy";
import type { MyContext } from "../../index.js";

export function getAdminButtonsKeyboard(ctx: MyContext, allowCorrections: boolean, allowLeaves: boolean) {
  const keyboard = new Keyboard();

  // Використовуємо унікальні префікси "Доступ:", щоб уникнути конфліктів із текстовими командами користувачів
  const corrStatus = allowCorrections ? "🟢 Доступ: Запросити коригування" : "🔴 Доступ: Запросити коригування";
  const leaveStatus = allowLeaves ? "🟢 Доступ: Вихідний/Відпустка/Лікарняний" : "🔴 Доступ: Вихідний/Відпустка/Лікарняний";

  keyboard.text(corrStatus).row();
  keyboard.text(leaveStatus).row();
  keyboard.text(ctx.t("btn-back-settings")).resized();

  return keyboard;
}