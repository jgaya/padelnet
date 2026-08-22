/**
 * Como se van llenando los partidos que al generarse quedaron sin parejas.
 *
 * Al armar la grilla hay dos clases de partido con `parejaId` en null:
 *
 *   - Especiales de zona (`AG1-AG2`, `AP1-AP2`), solo en zonas de 4. Se resuelven
 *     con los resultados de los dos partidos previos de esa misma zona.
 *   - Partidos de llave. La primera ronda se resuelve con las posiciones de zona
 *     ("1A", "2B", "3A"); las rondas siguientes, con el ganador de la anterior.
 *
 * Modulo puro: solo las reglas de encadenado. Quien las aplica contra la DB es
 * actions/torneos-partidos.ts.
 */

import { FASES_LLAVE, type FaseLlave } from "@/lib/torneo-llave";

/** Slot de destino dentro del partido siguiente. */
export type SlotPartido = 1 | 2;

export type DestinoLlave = {
  fase: FaseLlave;
  numero: number;
  slot: SlotPartido;
};

/**
 * A donde va el ganador del partido `numero` de `fase`.
 *
 * El cuadro se numera por posicion: los partidos 1 y 2 de una ronda alimentan el
 * 1 de la siguiente, el 3 y el 4 alimentan el 2, y asi. El impar entra como
 * pareja1 y el par como pareja2, que es lo que mantiene el dibujo del cuadro.
 *
 * Devuelve null para la final, que no alimenta a nadie.
 */
export function siguienteEnLlave(
  fase: FaseLlave,
  numero: number,
  /** Fases que existen en este cuadro, en orden. Un cuadro chico arranca en CF. */
  fasesDelCuadro: readonly FaseLlave[] = FASES_LLAVE,
): DestinoLlave | null {
  const indice = fasesDelCuadro.indexOf(fase);
  if (indice === -1 || indice === fasesDelCuadro.length - 1) return null;
  if (!Number.isInteger(numero) || numero <= 0) return null;

  return {
    fase: fasesDelCuadro[indice + 1],
    numero: Math.ceil(numero / 2),
    slot: numero % 2 === 1 ? 1 : 2,
  };
}

/**
 * Token especial de zona -> de que partido sale y si es el ganador o el perdedor.
 *
 * En una zona de 4 se juegan `X1-X4` y `X2-X3`; despues `XG1-XG2` cruza a los dos
 * ganadores y `XP1-XP2` a los dos perdedores. El indice 1 corresponde al partido
 * que incluye la siembra 1 (`X1-X4`) y el 2 al otro (`X2-X3`).
 */
export type OrigenEspecial = {
  /** Siembras del partido del que sale, p.ej. [1, 4]. */
  siembras: [number, number];
  quien: "GANADOR" | "PERDEDOR";
};

const RE_ESPECIAL = /^([A-Z])(G|P)([12])$/;

export function parseTokenEspecial(token: string): OrigenEspecial | null {
  const match = token.trim().match(RE_ESPECIAL);
  if (!match) return null;

  const tipo = match[2] as "G" | "P";
  const indice = Number(match[3]);

  return {
    siembras: indice === 1 ? [1, 4] : [2, 3],
    quien: tipo === "G" ? "GANADOR" : "PERDEDOR",
  };
}

export function esTokenEspecialDeZona(token: string | null | undefined) {
  return typeof token === "string" && RE_ESPECIAL.test(token.trim());
}

/** "1A" -> { posicion: 1, zona: "A" }. "Bye" y cualquier otra cosa -> null. */
export function parseTokenClasificado(
  token: string | null | undefined,
): { posicion: number; zona: string } | null {
  if (typeof token !== "string") return null;

  const match = token.trim().match(/^([123])([A-Z])$/);
  if (!match) return null;

  return { posicion: Number(match[1]), zona: match[2] };
}

export function esBye(token: string | null | undefined) {
  return typeof token === "string" && token.trim().toLowerCase() === "bye";
}

/**
 * Posiciones finales de una zona de 4, que NO salen de la tabla sino del mini
 * cuadro: la zona termina en una final entre los dos ganadores y un partido por
 * el tercer puesto entre los dos perdedores.
 *
 *   1 = ganador de G1-G2      3 = ganador de P1-P2
 *   2 = perdedor de G1-G2     4 = perdedor de P1-P2
 *
 * Devuelve null si todavia falta alguno de los dos resultados.
 */
export function posicionesZonaDeCuatro(params: {
  finalGanadores: { ganadorId: number; perdedorId: number } | null;
  finalPerdedores: { ganadorId: number; perdedorId: number } | null;
}): number[] | null {
  const { finalGanadores, finalPerdedores } = params;
  if (!finalGanadores || !finalPerdedores) return null;

  return [
    finalGanadores.ganadorId,
    finalGanadores.perdedorId,
    finalPerdedores.ganadorId,
    finalPerdedores.perdedorId,
  ];
}
