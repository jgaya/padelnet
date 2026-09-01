// lib/prisma.ts
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/lib/generated/prisma/client";

import { auditarTx, extensionAuditoria } from "@/lib/auditoria";

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof crearCliente> | undefined;
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

function crearCliente() {
  return new PrismaClient({
    adapter,
    // Loguear cada consulta en produccion no aporta y duplica el volumen del
    // log ahora que la auditoria agrega una lectura previa por cada update.
    log: process.env.NODE_ENV === "production" ? ["warn", "error"] : ["query"],
  }).$extends(extensionAuditoria);
}

/**
 * El cliente ya viene con la auditoria puesta: toda escritura sobre los modelos
 * de MODELOS_AUDITADOS deja su registro sin que el codigo que llama haga nada.
 * Ver lib/auditoria.ts.
 */
export const prisma = globalForPrisma.prisma ?? crearCliente();

/**
 * El `tx` que recibe `enTransaccion`. Se deriva del cliente extendido y no de
 * `Prisma.TransactionClient`, que describe el cliente sin extensiones: si se
 * usara ese, los tipos de cada modelo no coincidirian.
 */
export type TxAuditado = Omit<
  ReturnType<typeof crearCliente>,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Transaccion interactiva. **Usar siempre esto en vez de
 * `prisma.$transaction(async ...)`.**
 *
 * Ademas de abrir la transaccion, envuelve el `tx` para que sus escrituras se
 * auditen contra esa misma transaccion. Con `prisma.$transaction` pelado, la
 * extension registraria por el cliente base: el registro sobreviviria a un
 * rollback y bajo presion de pool puede colgarse hasta el `P2028`.
 *
 * `scripts/check-auditoria.ts` falla si aparece un `$transaction(async` suelto,
 * justamente para que esto no se olvide.
 */
export function enTransaccion<T>(
  fn: (tx: TxAuditado) => Promise<T>,
  opciones?: { maxWait?: number; timeout?: number },
): Promise<T> {
  return prisma.$transaction((tx) => fn(auditarTx(tx)), opciones);
}
