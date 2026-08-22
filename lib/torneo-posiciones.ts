/**
 * Tabla de posiciones de una zona.
 *
 * Vivia dentro de actions/torneos-public.ts, que al ser "use server" no puede
 * exportar funciones sincronas. Se movio aca para que la tabla publica y el
 * armado de la llave usen exactamente el mismo criterio: si divergen, el cuadro
 * se arma con un orden distinto al que el jugador ve publicado.
 *
 * Puntaje: 2 por partido ganado, 1 por perdido (no se suma nada por no jugado).
 *
 * OJO: esto vale para las zonas de round robin, o sea las de 3 parejas. Las de 4
 * no son round robin sino un mini cuadro (1v4, 2v3, ganadores y perdedores), y
 * sus posiciones salen de lib/torneo-resolucion.ts, no de aca.
 */

export type PosicionZona = {
  parejaId: number;
  /** Puntos. */
  pts: number;
  /** Partidos ganados / perdidos. */
  pg: number;
  pp: number;
  /** Sets ganados / perdidos. */
  sg: number;
  sp: number;
  /** Games ganados / perdidos. */
  gg: number;
  gp: number;
};

export type PartidoParaPosiciones = {
  pareja1Id: number | null;
  pareja2Id: number | null;
  ganadorId: number | null;
  sets: Array<{ gamesPareja1: number; gamesPareja2: number }>;
};

export function computeMatchSetStats(
  sets: Array<{ gamesPareja1: number; gamesPareja2: number }>,
) {
  let setWinsP1 = 0;
  let setWinsP2 = 0;
  let gamesP1 = 0;
  let gamesP2 = 0;

  for (const set of sets) {
    gamesP1 += set.gamesPareja1;
    gamesP2 += set.gamesPareja2;

    if (set.gamesPareja1 > set.gamesPareja2) {
      setWinsP1 += 1;
    } else if (set.gamesPareja2 > set.gamesPareja1) {
      setWinsP2 += 1;
    }
  }

  return { setWinsP1, setWinsP2, gamesP1, gamesP2 };
}

function filaVacia(parejaId: number): PosicionZona {
  return { parejaId, pts: 0, pg: 0, pp: 0, sg: 0, sp: 0, gg: 0, gp: 0 };
}

/**
 * Criterios objetivos, en orden: puntos, partidos ganados, diferencia de sets,
 * diferencia de games. Devuelve 0 si empatan en todos: ese caso lo resuelve
 * quien llama (la tabla publica desempata por nombre, el armado de la llave
 * frena y le pide al admin que decida).
 */
export function compararPosiciones(a: PosicionZona, b: PosicionZona) {
  if (b.pts !== a.pts) return b.pts - a.pts;
  if (b.pg !== a.pg) return b.pg - a.pg;

  const difSetsA = a.sg - a.sp;
  const difSetsB = b.sg - b.sp;
  if (difSetsB !== difSetsA) return difSetsB - difSetsA;

  const difGamesA = a.gg - a.gp;
  const difGamesB = b.gg - b.gp;
  if (difGamesB !== difGamesA) return difGamesB - difGamesA;

  return 0;
}

/**
 * Posiciones de una zona de round robin, ya ordenadas. El orden entre parejas
 * que empatan en todo queda indefinido: hay que consultar hayEmpateSinResolver()
 * antes de usarlo para decidir quien clasifica.
 */
export function calcularPosiciones(
  parejaIds: number[],
  partidos: PartidoParaPosiciones[],
): PosicionZona[] {
  const porPareja = new Map<number, PosicionZona>(
    parejaIds.map((parejaId) => [parejaId, filaVacia(parejaId)]),
  );

  for (const partido of partidos) {
    if (partido.pareja1Id === null || partido.pareja2Id === null) continue;

    const p1 = porPareja.get(partido.pareja1Id);
    const p2 = porPareja.get(partido.pareja2Id);
    if (!p1 || !p2) continue;

    const { setWinsP1, setWinsP2, gamesP1, gamesP2 } = computeMatchSetStats(
      partido.sets,
    );

    p1.sg += setWinsP1;
    p1.sp += setWinsP2;
    p1.gg += gamesP1;
    p1.gp += gamesP2;

    p2.sg += setWinsP2;
    p2.sp += setWinsP1;
    p2.gg += gamesP2;
    p2.gp += gamesP1;

    // Si no se cargo el ganador explicito se deduce de los sets. Un empate en
    // sets no reparte puntos: el partido no esta resuelto.
    let ganadorId = partido.ganadorId;
    if (!ganadorId) {
      if (setWinsP1 > setWinsP2) ganadorId = partido.pareja1Id;
      else if (setWinsP2 > setWinsP1) ganadorId = partido.pareja2Id;
    }

    if (ganadorId === partido.pareja1Id) {
      p1.pg += 1;
      p1.pts += 2;
      p2.pp += 1;
      p2.pts += 1;
    } else if (ganadorId === partido.pareja2Id) {
      p2.pg += 1;
      p2.pts += 2;
      p1.pp += 1;
      p1.pts += 1;
    }
  }

  return Array.from(porPareja.values()).sort(compararPosiciones);
}

/**
 * true si dos parejas quedaron empatadas en todos los criterios objetivos, o
 * sea que el orden entre ellas seria arbitrario. Solo mira posiciones
 * consecutivas: si empatan, estan pegadas tras el sort.
 */
export function hayEmpateSinResolver(filas: PosicionZona[]) {
  for (let index = 1; index < filas.length; index += 1) {
    if (compararPosiciones(filas[index - 1], filas[index]) === 0) {
      return true;
    }
  }

  return false;
}
