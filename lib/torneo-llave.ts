/**
 * Armado de zonas y de la llave a partir de LLAVE_TABLA.
 *
 * Port de lo que el organizador hace en PreGenDinamico.tsx (el map sobre
 * `procesados`) y de la clasificacion de tokens de Gen2PageV2.tsx. Modulo puro:
 * no toca prisma ni la DB, trabaja con tokens y numeros de siembra.
 *
 * Tokens que aparecen en la tabla:
 *  - Partidos de zona: `A1-A4` -> la pareja sembrada 1 de la Zona A contra la 4.
 *  - Especiales de zona: `AG1-AG2` (ganadores de los dos primeros partidos de la
 *    Zona A) y `AP1-AP2` (perdedores). Solo existen en zonas de 4 parejas, donde
 *    la zona no es round robin sino un mini cuadro 1v4 / 2v3 / G-G / P-P.
 *  - Entrantes de la llave: `1A` (primero de la Zona A), `2B`, `3A`, o `Bye`.
 */

import {
  getLlavePorParejas,
  LLAVE_MAX_PAREJAS,
  LLAVE_MIN_PAREJAS,
  RONDAS_POSTERIORES,
  type LlaveEntry,
  type LlaveRound,
} from "@/lib/llave-tabla";

export {
  getLlavePorParejas,
  LLAVE_MAX_PAREJAS,
  LLAVE_MIN_PAREJAS,
} from "@/lib/llave-tabla";
export type { LlaveEntry, LlaveRound } from "@/lib/llave-tabla";

export type FaseLlave = "DF" | "OF" | "CF" | "SF" | "F";

/** Orden de disputa de las fases de la llave. */
export const FASES_LLAVE: readonly FaseLlave[] = ["DF", "OF", "CF", "SF", "F"];

export type ZonaMatchSpec = {
  /** Identificador estable dentro del torneo, p.ej. "A1-A4". */
  key: string;
  /** Letra de la zona ("A"). */
  zona: string;
  /**
   * true para `AG1-AG2` / `AP1-AP2`: las parejas no se conocen al generar la
   * grilla porque dependen del resultado de los dos primeros partidos de la zona.
   */
  especial: boolean;
  token1: string;
  token2: string;
};

export type ElimMatchSpec = {
  /** Identificador estable, p.ej. "DF3" o "SF1". */
  key: string;
  fase: FaseLlave;
  /** Posicion dentro de la fase, 1-based. */
  numero: number;
  /** true solo para la primera ronda del cuadro, la unica que sale de la tabla. */
  primeraRonda: boolean;
  /**
   * Entrantes de la primera ronda ("1A", "2B", "Bye"). En las rondas
   * posteriores son null: el rival se conoce recien al resolverse la anterior.
   */
  token1: string | null;
  token2: string | null;
  /** true cuando alguno de los dos entrantes es Bye, o sea que no se juega. */
  conBye: boolean;
};

const RE_TOKEN_ESPECIAL = /^[A-Z](G|P)[12]$/;
const RE_TOKEN_ZONA = /^[A-Z]\d+$/;
const RE_FASE_NUMERO = /^([A-Z]+)(\d+)$/;

export function esTokenEspecial(token: string) {
  return RE_TOKEN_ESPECIAL.test(token.trim());
}

export function esTokenZona(token: string) {
  const trimmed = token.trim();
  return RE_TOKEN_ZONA.test(trimmed) && !esTokenEspecial(trimmed);
}

/** Letra de zona de un token de partido de zona: "A1" -> "A", "AG1" -> "A". */
export function zonaDeToken(token: string) {
  return token.trim()[0]?.toUpperCase() ?? "";
}

/**
 * Posicion de siembra dentro de la zona: "A1" -> 1. Devuelve null para los
 * tokens especiales, que no referencian una siembra sino un resultado.
 */
export function siembraDeToken(token: string) {
  const trimmed = token.trim();
  if (!esTokenZona(trimmed)) return null;
  const numero = Number(trimmed.slice(1));
  return Number.isInteger(numero) ? numero : null;
}

/** Fase con la que arranca el cuadro segun el tamano de la primera ronda. */
export function faseDeRound(round: LlaveRound): FaseLlave {
  switch (round) {
    case 16:
      return "DF";
    case 8:
      return "OF";
    case 4:
      return "CF";
  }
}

/**
 * Error de dominio del armado, para que las actions lo puedan distinguir de un
 * fallo inesperado y mostrar el mensaje tal cual.
 */
export class LlaveTablaError extends Error {}

/**
 * Busca la entrada de la tabla, con mensaje explicito cuando la cantidad de
 * parejas cae fuera del rango cubierto.
 */
export function requireLlaveEntry(cantidadParejas: number): LlaveEntry {
  const entry = getLlavePorParejas(cantidadParejas);
  if (entry) return entry;

  throw new LlaveTablaError(
    `No hay un cuadro definido para ${cantidadParejas} parejas: la tabla cubre de ${LLAVE_MIN_PAREJAS} a ${LLAVE_MAX_PAREJAS}`,
  );
}

/**
 * Composicion de zonas para una lista de parejas ya ordenada por siembra (la
 * posicion 0 es la siembra 1). La tabla define la cantidad de zonas y su tamano,
 * que puede mezclar zonas de 3 y de 4 en el mismo torneo.
 */
export function buildZonasDesdeTabla(parejaIdsEnOrdenDeSiembra: number[]) {
  const entry = requireLlaveEntry(parejaIdsEnOrdenDeSiembra.length);

  return entry.grupo.map((zona) => ({
    nombre: zona.nombre,
    parejaIds: zona.parejas.map((siembra) => {
      const parejaId = parejaIdsEnOrdenDeSiembra[siembra - 1];
      if (parejaId === undefined) {
        throw new LlaveTablaError(
          `La tabla referencia la siembra ${siembra} pero solo hay ${parejaIdsEnOrdenDeSiembra.length} parejas`,
        );
      }
      return parejaId;
    }),
  }));
}

/**
 * Port literal de ordenarPartidosPorRondas del organizador
 * (src/app/utils/common.ts): agrupa los partidos por zona y los intercala por
 * ronda, para que la grilla no arranque con todos los partidos de la Zona A
 * seguidos.
 */
export function ordenarPartidosPorRondas(partidos: string[]) {
  const zonas = new Map<string, string[]>();

  for (const partido of partidos) {
    const zona = zonaDeToken(partido);
    const lista = zonas.get(zona);
    if (lista) {
      lista.push(partido);
    } else {
      zonas.set(zona, [partido]);
    }
  }

  const zonasOrdenadas = [...zonas.keys()].sort();
  const rondas = Math.max(0, ...[...zonas.values()].map((lista) => lista.length));
  const resultado: string[] = [];

  for (let ronda = 0; ronda < rondas; ronda += 1) {
    for (const zona of zonasOrdenadas) {
      const partido = zonas.get(zona)?.[ronda];
      if (partido) resultado.push(partido);
    }
  }

  return resultado;
}

/** Partidos de zona de la tabla, intercalados por ronda y clasificados. */
export function buildZonaMatches(entry: LlaveEntry): ZonaMatchSpec[] {
  return ordenarPartidosPorRondas([...entry.partidos]).map((partido) => {
    const [token1, token2] = partido.split("-").map((token) => token.trim());

    if (!token1 || !token2) {
      throw new LlaveTablaError(`Partido de zona invalido en la tabla: ${partido}`);
    }

    return {
      key: partido,
      zona: zonaDeToken(token1),
      especial: esTokenEspecial(token1) || esTokenEspecial(token2),
      token1,
      token2,
    };
  });
}

/**
 * Cuadro completo: la primera ronda sale de `entry.llave` cruzando los slots de
 * a pares, y el resto de las fases de RONDAS_POSTERIORES.
 *
 * Se devuelve una entrada por cada posicion de la primera ronda, incluidas las
 * que tienen Bye: no se juegan, pero la columna del cuadro es posicional y las
 * fases siguientes se numeran en base a ella (OF1 se alimenta de DF1 y DF2).
 * El llamador decide si las agenda (`conBye === false`) o solo las persiste como
 * placeholder.
 */
export function buildElimMatches(entry: LlaveEntry): ElimMatchSpec[] {
  const faseInicial = faseDeRound(entry.round);
  const matches: ElimMatchSpec[] = [];

  for (let slot = 0; slot < entry.llave.length; slot += 2) {
    const numero = slot / 2 + 1;
    const token1 = entry.llave[slot] ?? "Bye";
    const token2 = entry.llave[slot + 1] ?? "Bye";

    matches.push({
      key: `${faseInicial}${numero}`,
      fase: faseInicial,
      numero,
      primeraRonda: true,
      token1,
      token2,
      conBye: token1 === "Bye" || token2 === "Bye",
    });
  }

  for (const token of RONDAS_POSTERIORES[entry.round]) {
    const parsed = token.match(RE_FASE_NUMERO);
    const fase = parsed?.[1] as FaseLlave | undefined;
    const numero = Number(parsed?.[2]);

    if (!fase || !FASES_LLAVE.includes(fase) || !Number.isInteger(numero)) {
      throw new LlaveTablaError(`Ronda posterior invalida en la tabla: ${token}`);
    }

    matches.push({
      key: token,
      fase,
      numero,
      primeraRonda: false,
      token1: null,
      token2: null,
      conBye: false,
    });
  }

  return matches;
}

/** Fases que efectivamente tienen partidos en este cuadro, en orden de disputa. */
export function fasesDelCuadro(entry: LlaveEntry): FaseLlave[] {
  const presentes = new Set(buildElimMatches(entry).map((match) => match.fase));
  return FASES_LLAVE.filter((fase) => presentes.has(fase));
}
