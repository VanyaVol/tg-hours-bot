import { Keyboard } from "grammy";
import { prisma } from "../../config/database.js";
import { ADMIN_TG_ID } from "../../index.js";
import type { MyContext } from "../../index.js";


export async function getMainMenuKeyboard(ctx: MyContext, telegramId: number) {
  const keyboard = new Keyboard();

  const adminConfig = await prisma.worker.findUnique({
    where: { telegramId: BigInt(ADMIN_TG_ID) }
  });

  const canShowStatusMenu = adminConfig?.allowLeaves ?? true;
  const canShowCorrectionMenu = adminConfig?.allowCorrections ?? true;

  // 1. Перший ряд кнопок (Введення годин та Календар)
  keyboard.text(ctx.t("btn-enter-hours")).text(ctx.t("btn-calendar")).row();

  // 2. Другий ряд: Кнопки Статус та Запросити коригування (відображаються динамічно)
  if (canShowStatusMenu) {
    keyboard.text(ctx.t("btn-status"));
  }
  
  if (canShowCorrectionMenu) {
    keyboard.text(ctx.t("btn-request-fix"));
  }

  // Якщо хоча б одна з кнопок другого ряду увімкнена, завершуємо рядок
  if (canShowStatusMenu || canShowCorrectionMenu) {
    keyboard.row();
  }

  // 3. Третій ряд: Налаштування та Допомога
  keyboard.text(ctx.t("btn-settings")).text(ctx.t("btn-help")).resized();

  return keyboard;
}