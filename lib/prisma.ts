// lib/prisma.ts
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/lib/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Prisma 7 saco el motor Rust: el cliente ya no habla con MySQL por su cuenta,
// hay que pasarle un driver adapter. Ojo que el pool ahora lo maneja mariadb y
// no Prisma, asi que los defaults cambiaron; para tocarlos van como query
// params de la url (?connectionLimit=5).
const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error("Falta DATABASE_URL");
}

const adapter = new PrismaMariaDb(url);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: ["query"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
