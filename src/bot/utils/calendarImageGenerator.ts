import { createCanvas } from "@napi-rs/canvas";

interface DayLog {
  day: number;
  hours: number;
}

export function generateCalendarImage(monthName: string, year: number, logs: DayLog[]): Buffer {
  const width = 760;
  const height = 640;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Мапа для пошуку годин та підрахунок загальної суми
  const logsMap = new Map<number, number>();
  let totalHours = 0;
  
  logs.forEach(l => {
    logsMap.set(l.day, l.hours);
    totalHours += l.hours;
  });

  // 1. Головний фон (м'який світло-сірий преміальний відтінок)
  ctx.fillStyle = "#F4F7F6";
  ctx.fillRect(0, 0, width, height);

  // 2. Шапка: Назва місяця та рік (ліворуч)
  ctx.fillStyle = "#1E293B";
  ctx.font = "bold 32px Arial";
  ctx.textAlign = "left";
  ctx.fillText(`${monthName} ${year}`, 40, 60);

  // 3. Віджет суми годин (праворуч у шапці)
  const widgetX = 500;
  const widgetY = 25;
  const widgetW = 220;
  const widgetH = 50;
  
  // Фон віджета суми годин
  ctx.fillStyle = "#0EA5E9"; // Красивий блакитний колір
  ctx.beginPath();
  ctx.roundRect(widgetX, widgetY, widgetW, widgetH, 12);
  ctx.fill();

  // Текст всередині віджета
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 16px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`Разом: ${totalHours} год.`, widgetX + widgetW / 2, widgetY + 31);

  // 4. Дні тижня (Пн-Нд)
  const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];
  ctx.font = "bold 16px Arial";
  
  const cellWidth = 94;
  const cellHeight = 82;
  const startX = 40;
  const startY = 140;

  weekdays.forEach((day, i) => {
    // Вихідні робимо приглушено червоними
    ctx.fillStyle = (i === 5 || i === 6) ? "#EF4444" : "#64748B";
    ctx.textAlign = "center";
    ctx.fillText(day, startX + i * cellWidth + cellWidth / 2, startY - 20);
  });

  // Розрахунок календарної сітки
  const now = new Date();
  // Визначаємо індекс місяця, який ми зараз малюємо
  const monthsList = ["Січень","Лютий","Березень","Квітень","Травень","Червень","Липень","Серпень","Вересень","Жовтень","Листопад","Грудень"];
  const targetMonthIdx = monthsList.indexOf(monthName) !== -1 ? monthsList.indexOf(monthName) : now.getMonth();

  const firstDay = new Date(year, targetMonthIdx, 1);
  let startDayOfWeek = firstDay.getDay();
  startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // Перетворення системи Неділя=0 -> Понеділок=0
  
  const daysInMonth = new Date(year, targetMonthIdx + 1, 0).getDate();
  const today = now.getDate();
  const isCurrentMonth = (now.getMonth() === targetMonthIdx && now.getFullYear() === year);

  let currentDay = 1;

  for (let row = 0; row < 6; row++) {
    if (currentDay > daysInMonth) break;

    for (let col = 0; col < 7; col++) {
      const x = startX + col * cellWidth;
      const y = startY + row * cellHeight;

      // Пропускаємо пусті клітинки на початку місяця або в кінці
      if ((row === 0 && col < startDayOfWeek) || currentDay > daysInMonth) {
        continue;
      }

      const isWeekend = (col === 5 || col === 6);
      const hasLog = logsMap.has(currentDay);
      const hours = logsMap.get(currentDay) || 0;

      // Малюємо красиву підкладку (картку) для кожного дня
      ctx.beginPath();
      ctx.roundRect(x + 3, y + 3, cellWidth - 6, cellHeight - 6, 10);
      
      if (hasLog && hours > 0) {
        ctx.fillStyle = "#E2F0D9"; // Ніжно-зелений фон для відпрацьованих днів
      } else if (hasLog && hours === 0) {
        ctx.fillStyle = "#FEE2E2"; // Ніжно-червоний фон, якщо "Не працював"
      } else if (isWeekend) {
        ctx.fillStyle = "#EAEDE9"; // Легкий фон для порожніх вихідних
      } else {
        ctx.fillStyle = "#FFFFFF"; // Чистий білий для звичайних робочих днів
      }
      ctx.fill();

      // Малюємо легку рамку навколо картки дня
      ctx.strokeStyle = "#E2E8F0";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Підсвічування сьогоднішнього дня (акцентне коло навколо цифри)
      if (isCurrentMonth && currentDay === today) {
        ctx.beginPath();
        ctx.arc(x + cellWidth / 2, y + 30, 22, 0, 2 * Math.PI);
        ctx.fillStyle = "#3B82F6"; // Синій заповнений маркер дня
        ctx.fill();
      }

      // Цифра дня
      ctx.font = "bold 20px Arial";
      ctx.textAlign = "center";
      
      if (isCurrentMonth && currentDay === today) {
        ctx.fillStyle = "#FFFFFF"; // Білий текст на синьому колі
      } else if (isWeekend && (!hasLog || hours === 0)) {
        ctx.fillStyle = "#EF4444"; // Червоний колір для вихідних
      } else {
        ctx.fillStyle = "#1E293B"; // Темно-серій для стандартних чисел
      }
      
      ctx.fillText(String(currentDay), x + cellWidth / 2, y + 37);

      // Виведення годин під числом
      if (hasLog) {
        ctx.font = "bold 13px Arial";
        if (hours > 0) {
          ctx.fillStyle = "#2E7D32"; // Темно-зелений читабельний текст годин
          ctx.fillText(`${hours} год.`, x + cellWidth / 2, y + 62);
        } else {
          ctx.fillStyle = "#C62828"; // Приглушений червоний текст для відпочинку
          ctx.fillText("0 год.", x + cellWidth / 2, y + 62);
        }
      }

      currentDay++;
    }
  }

  return canvas.toBuffer("image/png");
}