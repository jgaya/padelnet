import "server-only";

import { prisma } from "@/lib/prisma";
import type { TorneoSiembra } from "@/lib/generated/prisma/client";

/**
 * Orden de siembra de las parejas de un torneo de eliminacion directa.
 *
 * Devuelve los ids de pareja de mejor a peor sembrada: la posicion 0 es la
 * semilla 1, que es la que recibe el primer BYE si el cuadro no se llena.
 *
 * ## Sobre el criterio por ranking
 *
 * La tabla de ranking de este proyecto es por complejo, sexo y categoria, y no
 * existe una tabla "de parejas": una pareja son dos jugadores que hasta pueden
 * estar en tablas distintas. Lo que se hace es **sumar los puntos de los dos**,
 * que es lo razonable y lo que se entiende como fuerza de la pareja, pero no es
 * literalmente "la posicion de la pareja en el ranking" porque esa posicion no
 * esta definida en ningun lado.
 *
 * Los puntos salen de la misma tabla `Ranking` que alimenta la pagina publica
 * (`getPublicComplejoRanking`), para que el orden del cuadro sea coherente con
 * el que el jugador ve publicado.
 */

export type ParejaSembrada = {
  parejaId: number;
  /** Suma de puntos de los dos jugadores. 0 si ninguno tiene. */
  puntos: number;
  createdAt: Date;
};

/**
 * Parejas del torneo que entran al cuadro: titulares y no dadas de baja.
 *
 * Los suplentes quedan afuera. Si alguna vez se quiere que entren, es sacar el
 * filtro y el cuadro se agranda solo.
 */
async function parejasDelTorneo(torneoId: number) {
  return prisma.pareja.findMany({
    where: { torneoId, deletedAt: null, suplente: false },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      createdAt: true,
      player1Id: true,
      player2Id: true,
    },
  });
}

/**
 * Puntos de ranking de cada jugador dentro del complejo del torneo.
 *
 * Un solo `groupBy` en vez de una consulta por jugador.
 */
async function puntosPorJugador(complejoId: number, jugadorIds: number[]) {
  if (!jugadorIds.length) return new Map<number, number>();

  const filas = await prisma.ranking.groupBy({
    by: ["jugadorId"],
    where: {
      deletedAt: null,
      jugadorId: { in: jugadorIds },
      torneo: {
        deletedAt: null,
        evento: { complejoId, deletedAt: null },
      },
    },
    _sum: { valor: true },
  });

  // `Ranking.valor` es Decimal: se pasa a number para poder sumarlo. Son
  // puntos de torneo, enteros chicos, asi que no hay perdida de precision.
  return new Map(
    filas.map((fila) => [fila.jugadorId, Number(fila._sum.valor ?? 0)]),
  );
}

/**
 * Ordena las parejas segun el criterio del torneo.
 *
 * En `RANKING`, **las parejas sin puntos van al fondo**, ordenadas entre si por
 * orden de inscripcion: quien no tiene antecedentes en el club no recibe un
 * BYE. Los empates de puntos se resuelven igual, por inscripcion.
 */
export async function ordenarParejasParaSiembra(
  torneoId: number,
  criterio: TorneoSiembra,
): Promise<number[]> {
  const parejas = await parejasDelTorneo(torneoId);

  if (criterio === "INSCRIPCION" || parejas.length === 0) {
    // Ya vienen ordenadas por createdAt de la consulta.
    return parejas.map((pareja) => pareja.id);
  }

  const torneo = await prisma.torneo.findFirst({
    where: { id: torneoId },
    select: { evento: { select: { complejoId: true } } },
  });

  if (!torneo) return parejas.map((pareja) => pareja.id);

  const jugadorIds = [
    ...new Set(parejas.flatMap((p) => [p.player1Id, p.player2Id])),
  ];

  const puntos = await puntosPorJugador(torneo.evento.complejoId, jugadorIds);

  const conPuntos: ParejaSembrada[] = parejas.map((pareja) => ({
    parejaId: pareja.id,
    puntos:
      (puntos.get(pareja.player1Id) ?? 0) + (puntos.get(pareja.player2Id) ?? 0),
    createdAt: pareja.createdAt,
  }));

  return [...conPuntos]
    .sort((a, b) => {
      if (a.puntos !== b.puntos) return b.puntos - a.puntos;
      // Empate (incluidas las dos en cero): manda el orden de inscripcion.
      return a.createdAt.getTime() - b.createdAt.getTime();
    })
    .map((pareja) => pareja.parejaId);
}
