/**
 * Estadisticas acumuladas de cada pareja de un torneo: partidos, sets y games
 * ganados y perdidos.
 *
 * Se derivan de los resultados cargados, no se llevan incrementando partido por
 * partido: recalcular todo desde cero es lo que permite corregir un resultado y
 * volver a finalizar el torneo sin que los contadores queden inflados.
 *
 * Reusa `calcularPosiciones` de lib/torneo-posiciones.ts, que es el mismo
 * criterio que usan la tabla publica de zonas y el armado de la llave. Si esto
 * contara los sets a su manera, la ficha de la pareja diria una cosa y la tabla
 * de posiciones otra.
 *
 * Modulo de lib y no una action: lo llaman los servers actions de torneo, que ya
 * validaron permisos. Como "use server" no puede exportar nada que no sea un
 * endpoint, dejarlo aca evita publicar un recalculo de estadisticas al mundo.
 */

import { enTransaccion, prisma } from "@/lib/prisma";
import { calcularPosiciones } from "@/lib/torneo-posiciones";

export type EstadisticasParejasResult = {
  success: boolean;
  parejasActualizadas: number;
  message?: string;
};

export async function actualizarEstadisticasParejas(
  torneoId: number,
): Promise<EstadisticasParejasResult> {
  try {
    // Sin filtrar por deletedAt a proposito: calcularPosiciones descarta el
    // partido entero si alguna de las dos parejas no esta en la lista, asi que
    // dejar afuera una pareja borrada le comeria los partidos a su rival.
    const parejas = await prisma.pareja.findMany({
      where: { torneoId },
      select: {
        id: true,
        partidoGanados: true,
        partidoPerdidos: true,
        setGanados: true,
        setPerdidos: true,
        gameGanados: true,
        gamePerdidos: true,
      },
    });

    if (parejas.length === 0) {
      return { success: true, parejasActualizadas: 0 };
    }

    // Zona y llave por igual: son todos partidos del torneo. Los WALKOVER
    // cuentan como partido ganado y perdido aunque no tengan sets cargados.
    const partidos = await prisma.partido.findMany({
      where: {
        torneoId,
        deletedAt: null,
        status: { in: ["FINISHED", "WALKOVER"] },
      },
      select: {
        pareja1Id: true,
        pareja2Id: true,
        ganadorId: true,
        sets: { select: { gamesPareja1: true, gamesPareja2: true } },
      },
    });

    const filas = calcularPosiciones(
      parejas.map((pareja) => pareja.id),
      partidos,
    );
    const filaPorPareja = new Map(filas.map((fila) => [fila.parejaId, fila]));

    const cambios = parejas.flatMap((pareja) => {
      const fila = filaPorPareja.get(pareja.id);
      if (!fila) return [];

      const sinCambios =
        pareja.partidoGanados === fila.pg &&
        pareja.partidoPerdidos === fila.pp &&
        pareja.setGanados === fila.sg &&
        pareja.setPerdidos === fila.sp &&
        pareja.gameGanados === fila.gg &&
        pareja.gamePerdidos === fila.gp;

      if (sinCambios) return [];

      return [
        {
          id: pareja.id,
          data: {
            partidoGanados: fila.pg,
            partidoPerdidos: fila.pp,
            setGanados: fila.sg,
            setPerdidos: fila.sp,
            gameGanados: fila.gg,
            gamePerdidos: fila.gp,
          },
        },
      ];
    });

    if (cambios.length > 0) {
      await enTransaccion(async (tx) => {
        for (const cambio of cambios) {
          await tx.pareja.update({
            where: { id: cambio.id },
            data: cambio.data,
          });
        }
      });
    }

    return { success: true, parejasActualizadas: cambios.length };
  } catch (error) {
    console.error("[estadisticas] actualizarEstadisticasParejas", error);

    return {
      success: false,
      parejasActualizadas: 0,
      message:
        error instanceof Error
          ? error.message
          : "Error al actualizar las estadisticas de las parejas",
    };
  }
}
