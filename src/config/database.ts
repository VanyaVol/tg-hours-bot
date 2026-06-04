import { PrismaClient } from '@prisma/client';

// Ініціалізуємо єдиний екземпляр клієнта для всього додатку
export const prisma = new PrismaClient();