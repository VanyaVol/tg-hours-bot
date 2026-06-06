import cron from "node-cron";
import { Bot } from "grammy";
import { prisma } from "../../config/database.js";
import type { MyContext } from "../../index.js";

export function initNotificationCron(bot: Bot<MyContext>) {
  // Запуск кожну хвилину: * * * * *
  cron.schedule("* * * * *", async () => {
    const now = new Date();
    
    // Форматуємо поточний час у рядок "ЧЧ:ММ"
    const currentHours = String(now.getHours()).padStart(2, "0");
    const currentMinutes = String(now.getMinutes()).padStart(2, "0");
    const currentTimeStr = `${currentHours}:${currentMinutes}`;
    
    const todayDate = now.getDate();

    try {
      // 1. Шукаємо користувачів, у яких увімкнені сповіщення на поточну хвилину
      const workersToNotify = await prisma.worker.findMany({
        where: {
          notificationsEnabled: true,
          notificationTime: currentTimeStr
        }
      });

      for (const worker of workersToNotify) {
        // 2. Перевірка періодичності ( notificationInterval )
        // Якщо інтервал більше 1 (наприклад, раз на 2 дні чи тиждень),
        // ми перевіряємо, чи підходить сьогоднішній день місяця під цей інтервал
        if (worker.notificationInterval > 1) {
          // Проста математична перевірка по днях місяця:
          if (todayDate % worker.notificationInterval !== 0) {
            continue; // Пропускаємо, сьогодні не день його сповіщення
          }
        }

        // 3. Перевіряємо, чи заповнив користувач ВЖЕ години за сьогодні.
        // Якщо заповнив — турбувати його не потрібно!
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), todayDate, 0, 0, 0, 0);
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), todayDate, 23, 59, 59);

        const todayLog = await prisma.timeLog.findFirst({
          where: {
            workerId: worker.id,
            date: { gte: startOfToday, lte: endOfToday },
            hours: { gte: 0 } // Враховуємо і 0 (Не працював), і робочі години
          }
        });

        if (todayLog) {
          continue; // Години вже внесені, йдемо далі
        }

        // 4. Надсилаємо сповіщення, якщо години порожні
        try {
          // bot.t дозволяє відправити текст мовою користувача, яка збережена в базі
          await bot.api.sendMessage(
            Number(worker.telegramId),
            "🔔 *Нагадування!*\n\nВи ще не заповнили години за сьогодні. Будь ласка, знайдіть хвилинку та внесіть дані через меню «Ввести години».",
            { parse_mode: "Markdown" }
          );
          console.log(`🟢 Сповіщення успішно надіслано користувачу ${worker.telegramId}`);
        } catch (sendErr) {
          console.error(`🔴 Не вдалося надіслати повідомлення на ID ${worker.telegramId}:`, sendErr);
        }
      }
    } catch (dbErr) {
      console.error("🔴 Помилка в роботі крона сповіщень:", dbErr);
    }
  });

  console.log("🚀 Фоновий крон сповіщень успішно ініціалізовано (перевірка щохвилини)!");
}