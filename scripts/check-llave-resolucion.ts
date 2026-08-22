/**
 * Chequeo de invariantes del encadenado de la llave y de las posiciones de zona.
 *
 * Ejecutar con: npm run check:resolucion
 *
 * Es la parte que decide quien juega contra quien: si el encadenado se corre un
 * slot, el cuadro entero queda mal y no hay forma de darse cuenta mirando la UI.
 */

import { LLAVE_TABLA } from "../lib/llave-tabla";
import { buildElimMatches, fasesDelCuadro, type FaseLlave } from "../lib/torneo-llave";
import {
  calcularPosiciones,
  hayEmpateSinResolver,
  type PartidoParaPosiciones,
} from "../lib/torneo-posiciones";
import {
  esBye,
  esTokenEspecialDeZona,
  parseTokenClasificado,
  parseTokenEspecial,
  posicionesZonaDeCuatro,
  siguienteEnLlave,
} from "../lib/torneo-resolucion";

let fallos = 0;
const fallar = (...args: unknown[]) => {
  fallos += 1;
  console.error("  FALLO:", ...args);
};
const igual = (actual: unknown, esperado: unknown, mensaje: string) => {
  if (JSON.stringify(actual) !== JSON.stringify(esperado)) {
    fallar(`${mensaje}: fue ${JSON.stringify(actual)}, esperaba ${JSON.stringify(esperado)}`);
  }
};

// ---------------------------------------------------------------------------
console.log("Encadenado de la llave");

{
  const completo: FaseLlave[] = ["DF", "OF", "CF", "SF", "F"];

  igual(siguienteEnLlave("DF", 1, completo), { fase: "OF", numero: 1, slot: 1 }, "DF1 -> OF1 slot 1");
  igual(siguienteEnLlave("DF", 2, completo), { fase: "OF", numero: 1, slot: 2 }, "DF2 -> OF1 slot 2");
  igual(siguienteEnLlave("DF", 3, completo), { fase: "OF", numero: 2, slot: 1 }, "DF3 -> OF2 slot 1");
  igual(siguienteEnLlave("DF", 4, completo), { fase: "OF", numero: 2, slot: 2 }, "DF4 -> OF2 slot 2");
  igual(siguienteEnLlave("DF", 16, completo), { fase: "OF", numero: 8, slot: 2 }, "DF16 -> OF8 slot 2");
  igual(siguienteEnLlave("SF", 1, completo), { fase: "F", numero: 1, slot: 1 }, "SF1 -> F1 slot 1");
  igual(siguienteEnLlave("SF", 2, completo), { fase: "F", numero: 1, slot: 2 }, "SF2 -> F1 slot 2");
  igual(siguienteEnLlave("F", 1, completo), null, "la final no alimenta a nadie");

  // En un cuadro chico que arranca en CF, el "siguiente" de CF es SF y no OF.
  const chico: FaseLlave[] = ["CF", "SF", "F"];
  igual(siguienteEnLlave("CF", 3, chico), { fase: "SF", numero: 2, slot: 1 }, "cuadro chico: CF3 -> SF2 slot 1");
  igual(siguienteEnLlave("DF", 1, chico), null, "una fase que no existe en el cuadro no encadena");
}

// ---------------------------------------------------------------------------
console.log("El cuadro se encadena entero, en las 42 entradas de la tabla");

for (const entry of LLAVE_TABLA) {
  const etiqueta = `parejas=${entry.parejas}`;
  const fases = fasesDelCuadro(entry);
  const matches = buildElimMatches(entry);

  // Cada partido existe una sola vez por (fase, numero).
  const porClave = new Map<string, number>();
  for (const match of matches) {
    const clave = `${match.fase}-${match.numero}`;
    porClave.set(clave, (porClave.get(clave) ?? 0) + 1);
  }
  if ([...porClave.values()].some((n) => n > 1)) {
    fallar(etiqueta, "hay partidos repetidos en el cuadro");
  }

  // Todo partido, salvo la final, encadena a uno que existe.
  const slotsOcupados = new Map<string, Set<number>>();
  for (const match of matches) {
    const destino = siguienteEnLlave(match.fase, match.numero, fases);

    if (match.fase === "F") {
      if (destino !== null) fallar(etiqueta, "la final encadena a algo");
      continue;
    }

    if (!destino) {
      fallar(etiqueta, `${match.fase}${match.numero} no encadena a ninguna fase`);
      continue;
    }

    const claveDestino = `${destino.fase}-${destino.numero}`;
    if (!porClave.has(claveDestino)) {
      fallar(etiqueta, `${match.fase}${match.numero} apunta a ${claveDestino}, que no existe`);
      continue;
    }

    // Dos partidos distintos no pueden caer en el mismo slot del mismo destino.
    const usados = slotsOcupados.get(claveDestino) ?? new Set<number>();
    if (usados.has(destino.slot)) {
      fallar(etiqueta, `dos partidos caen en ${claveDestino} slot ${destino.slot}`);
    }
    usados.add(destino.slot);
    slotsOcupados.set(claveDestino, usados);
  }

  // Todo partido que no sea de primera ronda tiene sus dos slots alimentados.
  for (const match of matches.filter((item) => !item.primeraRonda)) {
    const usados = slotsOcupados.get(`${match.fase}-${match.numero}`);
    if (!usados || usados.size !== 2) {
      fallar(etiqueta, `${match.fase}${match.numero} no tiene sus dos alimentadores`);
    }
  }

  // Y se llega a la final siguiendo la cadena desde cualquier partido.
  for (const match of matches) {
    let actual: { fase: FaseLlave; numero: number } | null = match;
    let saltos = 0;
    while (actual && actual.fase !== "F" && saltos < 10) {
      const siguiente = siguienteEnLlave(actual.fase, actual.numero, fases);
      actual = siguiente ? { fase: siguiente.fase, numero: siguiente.numero } : null;
      saltos += 1;
    }
    if (actual?.fase !== "F") {
      fallar(etiqueta, `${match.fase}${match.numero} no llega a la final`);
      break;
    }
  }
}

// ---------------------------------------------------------------------------
console.log("Tokens");

{
  igual(parseTokenEspecial("AG1"), { siembras: [1, 4], quien: "GANADOR" }, "AG1 = ganador de 1v4");
  igual(parseTokenEspecial("AG2"), { siembras: [2, 3], quien: "GANADOR" }, "AG2 = ganador de 2v3");
  igual(parseTokenEspecial("BP1"), { siembras: [1, 4], quien: "PERDEDOR" }, "BP1 = perdedor de 1v4");
  igual(parseTokenEspecial("BP2"), { siembras: [2, 3], quien: "PERDEDOR" }, "BP2 = perdedor de 2v3");
  igual(parseTokenEspecial("A1"), null, "un token de zona normal no es especial");
  igual(parseTokenEspecial("1A"), null, "un token de clasificado no es especial");

  if (!esTokenEspecialDeZona("CG2")) fallar("CG2 deberia ser especial");
  if (esTokenEspecialDeZona("C2")) fallar("C2 no es especial");

  igual(parseTokenClasificado("1A"), { posicion: 1, zona: "A" }, "1A");
  igual(parseTokenClasificado("3P"), { posicion: 3, zona: "P" }, "3P");
  igual(parseTokenClasificado("Bye"), null, "Bye no es un clasificado");
  igual(parseTokenClasificado("A1"), null, "A1 (token de zona) no es un clasificado");
  igual(parseTokenClasificado(null), null, "null no es un clasificado");

  if (!esBye("Bye")) fallar("Bye deberia detectarse");
  if (!esBye("bye")) fallar("bye en minuscula tambien");
  if (esBye("1A")) fallar("1A no es Bye");
}

// ---------------------------------------------------------------------------
console.log("Zona de 4: las posiciones salen del mini cuadro, no de la tabla");

{
  // Ganadores: 10 le gana a 20. Perdedores: 30 le gana a 40.
  const posiciones = posicionesZonaDeCuatro({
    finalGanadores: { ganadorId: 10, perdedorId: 20 },
    finalPerdedores: { ganadorId: 30, perdedorId: 40 },
  });
  igual(posiciones, [10, 20, 30, 40], "1=ganador GG, 2=perdedor GG, 3=ganador PP, 4=perdedor PP");

  igual(
    posicionesZonaDeCuatro({
      finalGanadores: null,
      finalPerdedores: { ganadorId: 30, perdedorId: 40 },
    }),
    null,
    "sin la final de ganadores no hay posiciones",
  );
  igual(
    posicionesZonaDeCuatro({
      finalGanadores: { ganadorId: 10, perdedorId: 20 },
      finalPerdedores: null,
    }),
    null,
    "sin la de perdedores tampoco",
  );
}

// ---------------------------------------------------------------------------
console.log("Zona de 3: round robin");

const partido = (
  p1: number,
  p2: number,
  ganador: number | null,
  sets: Array<[number, number]>,
): PartidoParaPosiciones => ({
  pareja1Id: p1,
  pareja2Id: p2,
  ganadorId: ganador,
  sets: sets.map(([gamesPareja1, gamesPareja2]) => ({ gamesPareja1, gamesPareja2 })),
});

{
  // 1 gana los dos; 2 le gana a 3. Orden esperado: 1, 2, 3.
  const filas = calcularPosiciones(
    [1, 2, 3],
    [
      partido(1, 2, 1, [[6, 2], [6, 3]]),
      partido(1, 3, 1, [[6, 1], [6, 0]]),
      partido(2, 3, 2, [[6, 4], [6, 4]]),
    ],
  );
  igual(filas.map((f) => f.parejaId), [1, 2, 3], "orden por puntos");
  igual([filas[0].pts, filas[1].pts, filas[2].pts], [4, 3, 2], "2 puntos por ganado, 1 por perdido");
  if (hayEmpateSinResolver(filas)) fallar("no deberia haber empate");

  // Sin ganador explicito se deduce de los sets.
  const deducido = calcularPosiciones([1, 2], [partido(1, 2, null, [[6, 2], [6, 3]])]);
  igual(deducido[0].parejaId, 1, "el ganador se deduce de los sets si no esta cargado");

  // Empate en puntos, resuelto por diferencia de sets.
  const porSets = calcularPosiciones(
    [1, 2, 3],
    [
      partido(1, 2, 1, [[6, 0], [6, 0]]),
      partido(2, 3, 2, [[6, 4], [6, 4]]),
      partido(3, 1, 3, [[7, 5], [7, 5]]),
    ],
  );
  igual(porSets.length, 3, "triple empate en puntos");
  if (hayEmpateSinResolver(porSets)) {
    fallar("la diferencia de games deberia resolver este triple empate");
  }

  // Empate total: mismos puntos, sets y games. Tiene que frenar.
  const total = calcularPosiciones(
    [1, 2, 3],
    [
      partido(1, 2, 1, [[6, 4], [6, 4]]),
      partido(2, 3, 2, [[6, 4], [6, 4]]),
      partido(3, 1, 3, [[6, 4], [6, 4]]),
    ],
  );
  if (!hayEmpateSinResolver(total)) {
    fallar("un empate total tiene que detectarse");
  }

  // Zona sin ningun resultado: todas en cero, o sea empate total.
  const vacia = calcularPosiciones([1, 2, 3], []);
  igual(vacia.every((f) => f.pts === 0), true, "sin partidos, todo en cero");
  if (!hayEmpateSinResolver(vacia)) fallar("una zona sin jugar esta empatada");

  // Los partidos sin resolver no reparten puntos.
  const sinResolver = calcularPosiciones([1, 2], [partido(1, 2, null, [[6, 4], [4, 6]])]);
  igual([sinResolver[0].pts, sinResolver[1].pts], [0, 0], "un empate en sets no reparte puntos");

  // Un partido con una pareja ajena a la zona se ignora.
  const ajeno = calcularPosiciones([1, 2], [partido(1, 99, 1, [[6, 0], [6, 0]])]);
  igual(ajeno[0].pts, 0, "un partido contra una pareja de otra zona no suma");
}

if (fallos > 0) {
  console.error(`\n${fallos} fallo(s)`);
  process.exit(1);
}
console.log("\nOK: todas las invariantes de resolucion pasan");
