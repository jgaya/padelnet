import {
  FASES_LLAVE,
  LlaveTablaError,
  type ElimMatchSpec,
  type FaseLlave,
} from "@/lib/torneo-llave";

/**
 * Cuadro de eliminacion directa: sin zonas, las parejas entran sembradas.
 *
 * Modulo puro, sin prisma ni DB. Es el reemplazo de LLAVE_TABLA para el
 * formato ELIMINACION_DIRECTA: en vez de leer los cruces de una tabla fija,
 * los calcula a partir de la cantidad de parejas.
 *
 * ## Los BYE salen solos
 *
 * No hay logica que reparta BYE, y es a proposito. Con la siembra estandar
 * cada semilla enfrenta a `tamaño + 1 - semilla`, asi que alcanza con poner
 * las semillas en ese orden y tratar como BYE toda posicion mayor que la
 * cantidad real de parejas:
 *
 *   cuadro de 16, 12 parejas -> la 1 enfrenta a la 16 (no existe -> BYE),
 *   la 2 a la 15 (BYE), la 3 a la 14 (BYE), la 4 a la 13 (BYE),
 *   la 5 a la 12, que si existe y se juega.
 *
 * De ahi salen las dos condiciones del pedido: un BYE por sector empezando por
 * el mejor sembrado, y repartidos en vez de amontonados, porque las semillas 1
 * a 4 caen en cuartos distintos del cuadro.
 */

/** Cuadros que entran en las fases que existen (DF, OF, CF, SF, F). */
export type TamanoCuadro = 8 | 16 | 32;

export const DIRECTA_MIN_PAREJAS = 5;
export const DIRECTA_MAX_PAREJAS = 32;

/** Marca de slot vacio. Es el mismo texto que usa LLAVE_TABLA. */
export const BYE = "Bye";

export type CuadroDirecto = {
  tamano: TamanoCuadro;
  faseInicial: FaseLlave;
  /** Cuantos slots quedaron sin pareja. */
  byes: number;
  /**
   * Semilla que ocupa cada slot, en orden. Las mayores que la cantidad de
   * parejas son BYE.
   */
  slots: number[];
  matches: ElimMatchSpec[];
  /** Id de pareja por semilla (1-based): `parejaPorSemilla[0]` es la semilla 1. */
  parejaPorSemilla: number[];
};

/**
 * Cuadro mas chico que entra a todas las parejas.
 *
 * 5..8 -> 8, 9..16 -> 16, 17..32 -> 32.
 */
export function tamanoDeCuadro(parejas: number): TamanoCuadro {
  if (!Number.isInteger(parejas)) {
    throw new LlaveTablaError("La cantidad de parejas tiene que ser un entero");
  }

  if (parejas < DIRECTA_MIN_PAREJAS || parejas > DIRECTA_MAX_PAREJAS) {
    throw new LlaveTablaError(
      `El cuadro directo va de ${DIRECTA_MIN_PAREJAS} a ${DIRECTA_MAX_PAREJAS} parejas y hay ${parejas}`,
    );
  }

  if (parejas <= 8) return 8;
  if (parejas <= 16) return 16;
  return 32;
}

/**
 * Fase con la que arranca un cuadro de este tamaño.
 *
 * El tamaño esta en slots y las fases se nombran por cantidad de partidos, que
 * es la mitad: 32 slots son 16 partidos, o sea dieciseisavos.
 */
export function faseInicialDeCuadro(tamano: TamanoCuadro): FaseLlave {
  switch (tamano) {
    case 32:
      return "DF";
    case 16:
      return "OF";
    case 8:
      return "CF";
  }
}

/**
 * Semilla que ocupa cada slot del cuadro, en orden.
 *
 * Es la siembra estandar, construida duplicando: se arranca de `[1, 2]` y en
 * cada paso, detras de cada semilla `s` ya colocada, se mete su complemento
 * `tamaño + 1 - s`.
 *
 *   [1, 2] -> [1, 4, 2, 3] -> [1, 8, 4, 5, 2, 7, 3, 6]
 *
 * La propiedad que importa: las mejores semillas quedan lo mas lejos posible
 * entre si. La 1 y la 2 en mitades distintas, la 1 a la 4 en cuartos
 * distintos. Un error aca no se nota hasta la semifinal, cuando resulta que
 * los dos mejores ya se cruzaron en la primera ronda; por eso
 * `scripts/check-siembra.ts` lo verifica.
 */
export function ordenDeSiembra(tamano: number): number[] {
  if (tamano < 2 || (tamano & (tamano - 1)) !== 0) {
    throw new LlaveTablaError(
      `El tamaño del cuadro tiene que ser una potencia de 2 y es ${tamano}`,
    );
  }

  let orden = [1, 2];

  while (orden.length < tamano) {
    const total = orden.length * 2;
    const siguiente: number[] = [];

    for (const semilla of orden) {
      siguiente.push(semilla, total + 1 - semilla);
    }

    orden = siguiente;
  }

  return orden;
}

/** Nombre del partido dentro de su fase: "OF3". */
function claveDePartido(fase: FaseLlave, numero: number) {
  return `${fase}${numero}`;
}

/**
 * Arma el cuadro completo para una lista de parejas ya ordenada por siembra
 * (la posicion 0 es la semilla 1).
 *
 * Devuelve `ElimMatchSpec[]` con la misma forma que `buildElimMatches`, para
 * que la generacion de la grilla y todo lo que viene despues no tengan que
 * distinguir de donde salio el cuadro. La diferencia esta en los tokens: aca
 * son `"S1"`, `"S12"` o `"Bye"` en vez de `"1A"`, `"2B"`.
 */
export function buildCuadroDirecto(
  parejaIdsPorSiembra: number[],
): CuadroDirecto {
  const parejas = parejaIdsPorSiembra.length;
  const tamano = tamanoDeCuadro(parejas);
  const faseInicial = faseInicialDeCuadro(tamano);
  const slots = ordenDeSiembra(tamano);

  const matches: ElimMatchSpec[] = [];

  // Primera ronda: sale de los slots. Una semilla mayor que la cantidad de
  // parejas es un lugar vacio, o sea un BYE.
  const tokenDeSlot = (semilla: number) =>
    semilla <= parejas ? `S${semilla}` : BYE;

  for (let slot = 0; slot < slots.length; slot += 2) {
    const numero = slot / 2 + 1;
    const token1 = tokenDeSlot(slots[slot]);
    const token2 = tokenDeSlot(slots[slot + 1]);

    matches.push({
      key: claveDePartido(faseInicial, numero),
      fase: faseInicial,
      numero,
      primeraRonda: true,
      token1,
      token2,
      conBye: token1 === BYE || token2 === BYE,
    });
  }

  // Rondas siguientes: cada una tiene la mitad de partidos que la anterior,
  // hasta la final. Se calculan en vez de tabularse, que es lo que hace
  // RONDAS_POSTERIORES para el formato con zonas.
  const desde = FASES_LLAVE.indexOf(faseInicial);
  let partidosEnLaRonda = tamano / 2;

  for (let i = desde + 1; i < FASES_LLAVE.length; i++) {
    partidosEnLaRonda = partidosEnLaRonda / 2;

    for (let numero = 1; numero <= partidosEnLaRonda; numero++) {
      matches.push({
        key: claveDePartido(FASES_LLAVE[i], numero),
        fase: FASES_LLAVE[i],
        numero,
        primeraRonda: false,
        token1: null,
        token2: null,
        conBye: false,
      });
    }
  }

  return {
    tamano,
    faseInicial,
    byes: tamano - parejas,
    slots,
    matches,
    parejaPorSemilla: [...parejaIdsPorSiembra],
  };
}

/** "S12" -> 12. Null si el token no es una semilla. */
export function semillaDeToken(token: string | null | undefined): number | null {
  if (!token) return null;

  const match = /^S(\d+)$/.exec(token.trim());
  if (!match) return null;

  const numero = Number(match[1]);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}
