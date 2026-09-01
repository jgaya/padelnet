import "server-only";

import { enTransaccion, prisma } from "@/lib/prisma";
import { logrosDelEvento, type EventoJuego } from "@/lib/logros-catalogo";

/**
 * Motor de logros: convierte lo que pasa en la cancha en medallas.
 *
 * Se llama con `procesarEventos` desde las actions que registran resultados y
 * ranking. Dos reglas:
 *
 * 1. **Nunca puede voltear la operacion que lo origino.** Todo va en try/catch:
 *    perder una medalla es un problema; que no se pueda cargar un resultado es
 *    peor.
 * 2. **Se llama despues** de que la escritura termino y fuera de su
 *    transaccion, para no alargarla.
 *
 * Corrige tres cosas de la version de referencia
 * (~/organizador/src/app/actions/logros.ts):
 *
 * - Ahi el desbloqueo era un segundo `upsert` con `update: {}`, que sobre una
 *   fila ya existente no escribia nada: `unlockedAt` quedaba en null para
 *   siempre y **ningun logro se otorgaba jamas**. Aca el desbloqueo es un
 *   `update` explicito sobre la fila que devolvio el incremento.
 * - Ahi no se chequeaba que el codigo existiera y `ach.id` explotaba.
 * - Ahi las llamadas no se esperaban: si fallaban, se perdian en silencio.
 */

type LogroDelCatalogo = { id: number; progresoObjetivo: number | null };

/**
 * Suma progreso y, si llega al objetivo, otorga.
 *
 * El `upsert` devuelve la fila **ya incrementada**, asi que el total con el que
 * se compara es el de despues de sumar. Va en transaccion para que el
 * incremento y el desbloqueo no queden separados.
 */
async function otorgar(
  userId: number,
  logro: LogroDelCatalogo,
  cantidad: number,
) {
  await enTransaccion(async (tx) => {
    const fila = await tx.logroUsuario.upsert({
      where: { userId_logroId: { userId, logroId: logro.id } },
      update: { progreso: { increment: cantidad } },
      create: { userId, logroId: logro.id, progreso: cantidad },
      select: { progreso: true, obtenidoAt: true },
    });

    // Sin objetivo declarado, se gana la primera vez que pasa.
    const objetivo = logro.progresoObjetivo ?? 1;

    if (!fila.obtenidoAt && fila.progreso >= objetivo) {
      await tx.logroUsuario.update({
        where: { userId_logroId: { userId, logroId: logro.id } },
        data: { obtenidoAt: new Date() },
      });
    }
  });
}

/**
 * Procesa un lote de eventos.
 *
 * En lote y no de a uno porque un solo partido genera muchos de golpe (cuatro
 * jugadores por "partido jugado", dos por "ganado", uno por set): asi el
 * catalogo se lee una sola vez en vez de una por evento.
 */
export async function procesarEventos(eventos: EventoJuego[]): Promise<void> {
  if (!eventos.length) return;

  try {
    // Cuanto suma cada par (jugador, codigo) en este lote.
    const acumulado = new Map<string, number>();

    for (const evento of eventos) {
      for (const [codigo, cantidad] of logrosDelEvento(evento)) {
        const clave = `${evento.userId}|${codigo}`;
        acumulado.set(clave, (acumulado.get(clave) ?? 0) + cantidad);
      }
    }

    if (!acumulado.size) return;

    const codigos = [
      ...new Set([...acumulado.keys()].map((clave) => clave.split("|")[1])),
    ];

    // Solo los activos: un logro retirado deja de otorgarse, pero quien ya lo
    // tiene lo conserva.
    const catalogo = await prisma.logro.findMany({
      where: { codigo: { in: codigos }, activo: true },
      select: { id: true, codigo: true, progresoObjetivo: true },
    });

    const porCodigo = new Map(catalogo.map((logro) => [logro.codigo, logro]));

    for (const [clave, cantidad] of acumulado) {
      const [userIdTexto, codigo] = clave.split("|");
      const logro = porCodigo.get(codigo);

      // Un codigo que el superadmin todavia no cargo no es un error: se saltea.
      if (!logro) continue;

      await otorgar(Number(userIdTexto), logro, cantidad);
    }
  } catch (error) {
    console.error("[logros] no se pudieron procesar los eventos", error);
  }
}
