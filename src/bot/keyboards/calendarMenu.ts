import { Keyboard } from "grammy";
import { prisma } from "../../config/database.js";
import type { MyContext } from "../../index.js";

export async function getCalendarKeyboard(ctx: MyContext) {
  const keyboard = new Keyboard();
  const telegramId = ctx.from?.id;
  if (!telegramId) return keyboard;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0 = Січень, 11 = Грудень
  const todayDate = now.getDate();

  // 1. Шукаємо працівника в базі, щоб отримати його внутрішній Int ID
  const dbWorker = await prisma.worker.findUnique({
    where: { telegramId: BigInt(telegramId) }
  });
  const workerDbId = dbWorker?.id || 0;

  // 2. Витягуємо з БД всі заповнені логи годин за поточний місяць
  const startOfMonth = new Date(currentYear, currentMonth, 1);
  const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

  const existingLogs = await prisma.timeLog.findMany({
    where: {
      workerId: workerDbId,
      date: {
        gte: startOfMonth,
        lte: endOfMonth
      },
      hours: { gte: 0 } // Не беремо чернетки (-1)
    }
  });

  // Створюємо карту для швидкого пошуку: день -> кількість годин
  const logsMap = new Map<number, number>();
  existingLogs.forEach(log => {
    logsMap.set(log.date.getDate(), log.hours);
  });

  // 3. Отримуємо назви місяців та днів тижня з локалізації
  const months = ctx.t("calendar-months").split("_");
  const weekdays = ctx.t("calendar-weekdays").split("_");

  // Шапка календаря
  keyboard.text(`${months[currentMonth]} ${currentYear}`).row();

  // Рядок днів тижня
  weekdays.forEach(day => keyboard.text(day));
  keyboard.row();

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  let startDayOfWeek = firstDayOfMonth.getDay();
  startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  let currentDay = 1;

  for (let row = 0; row < 6; row++) {
    if (currentDay > daysInMonth) {
      break;
    }

    for (let col = 0; col < 7; col++) {
      if (row === 0 && col < startDayOfWeek) {
        keyboard.text(" "); 
      } 
      else if (currentDay > daysInMonth) {
        keyboard.text(" "); 
      } 
      else {
        if (currentDay > todayDate) {
          keyboard.text(" ");
        } else {
          // Форматуємо день, щоб завжди було дві цифри (01, 02 ... 15) для збереження рівної сітки
          const formattedDay = String(currentDay).padStart(2, "0");

          // МАРКУВАННЯ ДНІВ (ОНОВЛЕНО КОЛЬОРИ ТА ГОДИНИ)
          if (logsMap.has(currentDay)) {
            const hours = logsMap.get(currentDay);
            if (hours === 0) {
              // Якщо зазначено "Не працював" — підсвічуємо жовтим кружком і пишемо 0г
              keyboard.text(`❌ ${formattedDay}`);
            } else {
              // Якщо години успішно внесені — підсвічуємо зеленим кружком і виводим кількість годин
              keyboard.text(`✅ ${formattedDay}`);
            }
          } else {
            // Звичайний чистий день без записів — залишаємо без кружків, щоб він виділявся пустотою
            keyboard.text(`  ${formattedDay}  `);
          }
        }
        currentDay++;
      }
    }
    keyboard.row();
  }

  keyboard.text(ctx.t("btn-cancel")).resized();

  return keyboard;
}