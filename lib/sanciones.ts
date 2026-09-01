import "server-only";

import { prisma, type TxAuditado } from "@/lib/prisma";
import { fechaKey, fechaKeyDB, fechaParaDB } from "@/lib/turnos-horario";

/**
 * Sanciones disciplinarias: la parte que bloquea.
 *
 * Vive aca y no en la action para que los cinco puntos de inscripcion de
 * actions/torneos-inscripcion.ts pregunten lo mismo. Si cada uno armara su
 * consulta, alcanzaria con que uno quede desactualizado para que exista un
 * camino por el que un sancionado se anota igual.
 */

export type SancionVigente = {
  id: number;
  desde: Date;
  hasta: Date;
  motivo: string;
};

/** Formatea una columna `@db.Date` como dd/mm/aaaa sin correrla de dia. */
export function formatearFechaSancion(fecha: Date) {
  const [anio, mes, dia] = fechaKeyDB(fecha).split("-");
  return `${dia}/${mes}/${anio}`;
}

/**
 * Sanciones que cubren hoy, de varios jugadores, en una sola consulta.
 *
 * Devuelve un Map por jugador. Se piden de a varios porque en una inscripcion
 * hay dos jugadores y no tiene sentido pegarle dos veces a la base.
 *
 * `cliente` existe porque los puntos de bloqueo corren dentro de
 * `enTransaccion`: hay que consultar por el mismo `tx` y no por el cliente
 * base, o se lee fuera de la transaccion.
 */
export async function sancionesVigentes(
  complejoId: number,
  jugadorIds: number[],
  cliente: TxAuditado | typeof prisma = prisma,
): Promise<Map<number, SancionVigente>> {
  const ids = [...new Set(jugadorIds.filter((id) => Number.isInteger(id) && id > 0))];
  if (!ids.length || !Number.isInteger(complejoId) || complejoId <= 0) {
    return new Map();
  }

  // Contra una columna `@db.Date` hay que comparar con medianoche UTC: con la
  // medianoche local la sancion queda corta o larga por un dia segun la zona.
  const hoy = fechaParaDB(fechaKey(new Date()));

  const filas = await cliente.sancion.findMany({
    where: {
      complejoId,
      jugadorId: { in: ids },
      estado: "VIGENTE",
      desde: { lte: hoy },
      hasta: { gte: hoy },
    },
    // Si hay varias solapadas gana la que termina mas tarde: es la que
    // realmente lo tiene afuera.
    orderBy: { hasta: "desc" },
    select: { id: true, jugadorId: true, desde: true, hasta: true, motivo: true },
  });

  const mapa = new Map<number, SancionVigente>();

  for (const fila of filas) {
    if (mapa.has(fila.jugadorId)) continue;
    mapa.set(fila.jugadorId, {
      id: fila.id,
      desde: fila.desde,
      hasta: fila.hasta,
      motivo: fila.motivo,
    });
  }

  return mapa;
}

/** Igual que `sancionesVigentes` pero para un solo jugador. */
export async function sancionVigente(
  complejoId: number,
  jugadorId: number,
  cliente: TxAuditado | typeof prisma = prisma,
): Promise<SancionVigente | null> {
  const mapa = await sancionesVigentes(complejoId, [jugadorId], cliente);
  return mapa.get(jugadorId) ?? null;
}

/**
 * El texto que ve quien intenta inscribirse.
 *
 * Nombra al jugador y la fecha de fin: quien se topa con esto tiene que
 * entender que pasa y hasta cuando, sin ir a preguntar al club.
 */
export function mensajeSancion(nombre: string, sancion: SancionVigente) {
  return `${nombre} tiene una sancion vigente en este club hasta el ${formatearFechaSancion(sancion.hasta)} y no puede inscribirse a sus torneos.`;
}

/** Variante en primera persona, para cuando el sancionado es quien mira. */
export function mensajeSancionPropia(sancion: SancionVigente) {
  return `Tenes una sancion vigente en este club hasta el ${formatearFechaSancion(sancion.hasta)}, asi que no podes inscribirte a sus torneos. Motivo: ${sancion.motivo}`;
}
