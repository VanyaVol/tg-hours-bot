import { Bot } from "grammy";
import * as dotenv from "dotenv";

// Завантажуємо змінні середовища з файлу .env
dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  throw new Error("Помилка: TELEGRAM_BOT_TOKEN не знайдено в .env файлі!");
}

// Ініціалізуємо бота (TypeScript автоматично підтягує всі типи для методів)
const bot = new Bot(token);

// Обробка команди /start
bot.command("start", async (ctx) => {
  // Завдяки TypeScript ви бачите автодоповнення методів через крапку
  await ctx.reply(`Привіт, ${ctx.from?.first_name}! Ласкаво просимо до системи обліку годин.`);
});

// Простий текстовий ехо-відповідач для тесту
bot.on("message:text", async (ctx) => {
  const text = ctx.message.text;
  await ctx.reply(`Ви написали: ${text}. Скоро тут буде логіка запису годин!`);
});

// Запуск бота (метод Long Polling — бот сам постійно опитує сервери Telegram)
bot.start();
console.log("🚀 Бот успішно запущений і готовий до роботи!");