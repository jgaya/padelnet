import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Cuanto se conserva el registro de cambios.
 *
 * Doce meses cubren una temporada completa, que es el horizonte en el que
 * alguien puede venir a reclamar por un resultado o una recategorizacion.
 */
const RETENCION_MESES = 12;

/** Tope por corrida: es la tabla que mas crece, no conviene borrarla de un saque. */
const BATCH_SIZE = 5000;

export type LimpiarAuditoriaResult = {
  borradas: number;
  /** Quedan para la proxima corrida: se alcanzo el tope del lote. */
  pendientes: number;
};

/**
 * Borra los registros de auditoria que pasaron la retencion.
 *
 * Se dispara desde /api/cron/auditoria una vez por dia, igual que las otras
 * tareas.
 */
export async function limpiarAuditoriaVieja(): Promise<LimpiarAuditoriaResult> {
  const limite = new Date();
  limite.setMonth(limite.getMonth() - RETENCION_MESES);

  const where = { createdAt: { lt: limite } };

  // Se seleccionan los ids primero para acotar el DELETE al tamaño del lote:
  // `deleteMany` con un rango de fechas borraria todo lo vencido de una vez.
  const vencidos = await prisma.auditoria.findMany({
    where,
    take: BATCH_SIZE,
    orderBy: { id: "asc" },
    select: { id: true },
  });

  if (!vencidos.length) return { borradas: 0, pendientes: 0 };

  const { count } = await prisma.auditoria.deleteMany({
    where: { id: { in: vencidos.map((fila) => fila.id) } },
  });

  const pendientes = await prisma.auditoria.count({ where });

  return { borradas: count, pendientes };
}
