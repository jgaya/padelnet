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

/** Clave simetrica de un cruce: da lo mismo el orden de las parejas. */
function claveCruce(a: number, b: number) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

/**
 * Ganador de un partido. Si no se cargo explicito se deduce de los sets; un
 * empate en sets no define nada.
 */
function ganadorDelPartido(partido: PartidoParaPosiciones): number | null {
  if (partido.ganadorId) return partido.ganadorId;
  if (partido.pareja1Id === null || partido.pareja2Id === null) return null;

  const { setWinsP1, setWinsP2 } = computeMatchSetStats(partido.sets);
  if (setWinsP1 > setWinsP2) return partido.pareja1Id;
  if (setWinsP2 > setWinsP1) return partido.pareja2Id;

  return null;
}

/**
 * Lo que hace falta para desempatar por el resultado entre las parejas
 * empatadas. Se arma con `construirContextoDesempate`.
 */
export type ContextoDesempate = {
  /** clave del cruce -> id de la pareja que lo gano. */
  cruces: Map<string, number>;
  /** Cuantas parejas comparten cada total de puntos. */
  parejasPorPuntos: Map<number, number>;
};

/**
 * Arma el contexto de desempate a partir de las filas ya tabuladas y los
 * partidos de la zona.
 *
 * Si dos parejas se enfrentaron mas de una vez (no pasa en una zona normal),
 * gana el ultimo resultado cargado.
 */
export function construirContextoDesempate(
  filas: PosicionZona[],
  partidos: PartidoParaPosiciones[],
): ContextoDesempate {
  const cruces = new Map<string, number>();

  for (const partido of partidos) {
    if (partido.pareja1Id === null || partido.pareja2Id === null) continue;

    const ganadorId = ganadorDelPartido(partido);
    if (ganadorId === null) continue;

    cruces.set(claveCruce(partido.pareja1Id, partido.pareja2Id), ganadorId);
  }

  const parejasPorPuntos = new Map<number, number>();
  for (const fila of filas) {
    parejasPorPuntos.set(fila.pts, (parejasPorPuntos.get(fila.pts) ?? 0) + 1);
  }

  return { cruces, parejasPorPuntos };
}

/**
 * Criterios, en orden: puntos, **resultado entre las dos parejas empatadas**,
 * partidos ganados, diferencia de sets, diferencia de games. Devuelve 0 si
 * empatan en todos: ese caso lo resuelve quien llama (la tabla publica
 * desempata por nombre, el armado de la llave frena y le pide al admin que
 * decida).
 *
 * El desempate por el enfrentamiento directo solo se aplica si viene el
 * `contexto`, para no cambiar el comportamiento de quien todavia llame sin el.
 *
 * ## Por que solo con DOS parejas empatadas
 *
 * Con tres o mas empatadas en puntos el resultado entre ellas puede ser
 * circular: A le gano a B, B a C y C a A. Un comparador que responda eso no es
 * transitivo, y `Array.sort` con un comparador no transitivo devuelve un orden
 * arbitrario que ademas cambia segun la implementacion. Asi que con tres o mas
 * se cae directo a los criterios de siempre, que si son un orden total.
 */
export function compararPosiciones(
  a: PosicionZona,
  b: PosicionZona,
  contexto?: ContextoDesempate,
) {
  if (b.pts !== a.pts) return b.pts - a.pts;

  // Empatadas en puntos: si jugaron entre ellas, manda ese resultado.
  if (contexto && (contexto.parejasPorPuntos.get(a.pts) ?? 0) === 2) {
    const ganadorId = contexto.cruces.get(claveCruce(a.parejaId, b.parejaId));

    // Si no hubo partido entre ellas, `ganadorId` viene undefined y el
    // desempate sigue como estaba.
    if (ganadorId === a.parejaId) return -1;
    if (ganadorId === b.parejaId) return 1;
  }

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
 * Posiciones de una zona de round robin, ya ordenadas y con el desempate por
 * enfrentamiento directo aplicado. El orden entre parejas que empatan en todo
 * queda indefinido: hay que consultar hayEmpateSinResolver() antes de usarlo
 * para decidir quien clasifica.
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

  const filas = Array.from(porPareja.values());
  const contexto = construirContextoDesempate(filas, partidos);

  return filas.sort((a, b) => compararPosiciones(a, b, contexto));
}

/**
 * true si dos parejas quedaron empatadas en todos los criterios, o sea que el
 * orden entre ellas seria arbitrario. Solo mira posiciones consecutivas: si
 * empatan, estan pegadas tras el sort.
 *
 * Hay que pasarle el mismo `contexto` con el que se ordeno, o va a reportar
 * como empate sin resolver algo que el enfrentamiento directo ya resolvio.
 */
export function hayEmpateSinResolver(
  filas: PosicionZona[],
  contexto?: ContextoDesempate,
) {
  for (let index = 1; index < filas.length; index += 1) {
    if (compararPosiciones(filas[index - 1], filas[index], contexto) === 0) {
      return true;
    }
  }

  return false;
}
