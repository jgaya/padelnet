/**
 * Puntajes de ranking por posicion final en un torneo.
 *
 * Cada torneo guarda sus propios valores en el modelo Ronda (torneoId, nombre,
 * orden, valor). Este catalogo define las posiciones y los valores por defecto
 * que se precargan al crear un torneo; el admin los puede editar.
 *
 * Modulo puro (sin "use server"): lo importan las actions y el form client.
 */

export type RankingPosicion = {
  /** Coincide con Ronda.nombre, que es la clave unica por torneo. */
  nombre: string;
  orden: number;
  defaultValor: number;
};

export const RANKING_POSICIONES: readonly RankingPosicion[] = [
  { nombre: "Campeon", orden: 1, defaultValor: 100 },
  { nombre: "Sub Campeon", orden: 2, defaultValor: 80 },
  { nombre: "Semifinalista", orden: 3, defaultValor: 60 },
  { nombre: "Cuartos de final", orden: 4, defaultValor: 40 },
  { nombre: "Octavos de final", orden: 5, defaultValor: 30 },
  { nombre: "Dieciseisavos de final", orden: 6, defaultValor: 20 },
  { nombre: "Treintaidoavos de final", orden: 7, defaultValor: 15 },
  { nombre: "Perdedor Zona", orden: 8, defaultValor: 10 },
  { nombre: "Perdedor Zona por W.O.", orden: 9, defaultValor: 0 },
];

export const POSICION_CAMPEON = "Campeon";
export const POSICION_SUBCAMPEON = "Sub Campeon";
export const POSICION_ZONA = "Perdedor Zona";
export const POSICION_ZONA_WO = "Perdedor Zona por W.O.";

/**
 * Prefijo con el que llaveValue() escribe Partido.llave -> nombre de la ronda
 * que le corresponde al PERDEDOR de esa fase. El ganador de la final es el
 * campeon y se resuelve aparte.
 *
 * Los prefijos salen de actions/torneos-partidos.ts (llaveValue): "Final 1",
 * "Semifinal 2", "Cuartos 3", "Octavos 5", "Dieciseisavos 9".
 */
export const LLAVE_PREFIJO_A_POSICION: ReadonlyArray<{
  prefijo: string;
  posicionPerdedor: string;
}> = [
  { prefijo: "Final", posicionPerdedor: POSICION_SUBCAMPEON },
  { prefijo: "Semifinal", posicionPerdedor: "Semifinalista" },
  { prefijo: "Cuartos", posicionPerdedor: "Cuartos de final" },
  { prefijo: "Octavos", posicionPerdedor: "Octavos de final" },
  { prefijo: "Dieciseisavos", posicionPerdedor: "Dieciseisavos de final" },
  { prefijo: "Treintaidoavos", posicionPerdedor: "Treintaidoavos de final" },
];

export type PuntajesPorPosicion = Record<string, number>;

export function defaultPuntajes(): PuntajesPorPosicion {
  return Object.fromEntries(
    RANKING_POSICIONES.map((posicion) => [
      posicion.nombre,
      posicion.defaultValor,
    ]),
  );
}

export function getPosicion(nombre: string): RankingPosicion | null {
  return RANKING_POSICIONES.find((pos) => pos.nombre === nombre) ?? null;
}

/**
 * Resuelve el nombre de la ronda del perdedor de un partido segun su llave.
 * "Semifinal 2" -> "Semifinalista". Devuelve null si la llave no corresponde a
 * una fase conocida (o es null, como en los partidos de zona).
 *
 * Ojo con el orden de comparacion: "Semifinal" se evalua antes que "Final"
 * porque ambos terminan en "final".
 */
export function posicionPerdedorPorLlave(
  llave: string | null | undefined,
): string | null {
  if (!llave) return null;

  const normalizada = llave.trim().toLowerCase();

  // Semifinal primero: "semifinal 1" tambien empieza distinto que "final 1",
  // pero se deja explicito para que no dependa del orden del array.
  const semifinal = LLAVE_PREFIJO_A_POSICION.find(
    (item) => item.prefijo === "Semifinal",
  );
  if (semifinal && normalizada.startsWith("semifinal")) {
    return semifinal.posicionPerdedor;
  }

  const match = LLAVE_PREFIJO_A_POSICION.find((item) =>
    normalizada.startsWith(item.prefijo.toLowerCase()),
  );

  return match?.posicionPerdedor ?? null;
}

export function esLlaveFinal(llave: string | null | undefined): boolean {
  if (!llave) return false;

  const normalizada = llave.trim().toLowerCase();
  return normalizada.startsWith("final");
}

/** Orden de la posicion, para quedarse con la mejor de un jugador. */
export function ordenDePosicion(nombre: string): number {
  return getPosicion(nombre)?.orden ?? Number.MAX_SAFE_INTEGER;
}
