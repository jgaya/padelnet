/**
 * Verifica el cuadro de eliminacion directa.
 *
 * Ejecutar con: npm run check:siembra
 *
 * Un cuadro mal sembrado no se nota al mirarlo: se nota en la semifinal, el
 * dia que resulta que los dos mejores ya se habian cruzado en la primera
 * ronda. Por eso esto corre solo, sin base ni navegador, y chequea las
 * propiedades que tienen que valer para todo tamaño.
 */

import {
  buildCuadroDirecto,
  BYE,
  ordenDeSiembra,
  semillaDeToken,
  tamanoDeCuadro,
} from "../lib/torneo-llave-directa";

const problemas: string[] = [];
let pasadas = 0;

function check(nombre: string, condicion: boolean, detalle = "") {
  if (condicion) {
    pasadas += 1;
    console.log(`OK    ${nombre}${detalle ? `  ${detalle}` : ""}`);
    return;
  }

  problemas.push(`${nombre}${detalle ? `  ${detalle}` : ""}`);
  console.error(`FALLA ${nombre}${detalle ? `  ${detalle}` : ""}`);
}

// ---------------------------------------------------------------------------
// 1. El orden estandar, contra los valores conocidos
// ---------------------------------------------------------------------------

check(
  "orden de siembra de 4",
  JSON.stringify(ordenDeSiembra(4)) === JSON.stringify([1, 4, 2, 3]),
  JSON.stringify(ordenDeSiembra(4)),
);

check(
  "orden de siembra de 8",
  JSON.stringify(ordenDeSiembra(8)) === JSON.stringify([1, 8, 4, 5, 2, 7, 3, 6]),
  JSON.stringify(ordenDeSiembra(8)),
);

// ---------------------------------------------------------------------------
// 2. Propiedades que valen para todo tamaño
// ---------------------------------------------------------------------------

for (const tamano of [8, 16, 32]) {
  const orden = ordenDeSiembra(tamano);

  check(
    `cuadro ${tamano}: estan todas las semillas una sola vez`,
    orden.length === tamano && new Set(orden).size === tamano,
  );

  // Cada semilla enfrenta a su complemento: es lo que hace que los BYE caigan
  // solos en los mejores sembrados.
  let complementosOk = true;
  for (let i = 0; i < orden.length; i += 2) {
    if (orden[i] + orden[i + 1] !== tamano + 1) complementosOk = false;
  }
  check(`cuadro ${tamano}: cada cruce suma ${tamano + 1}`, complementosOk);

  const sector = (semilla: number, partes: number) => {
    const slot = orden.indexOf(semilla);
    return Math.floor(slot / (tamano / partes));
  };

  check(
    `cuadro ${tamano}: la 1 y la 2 en mitades distintas`,
    sector(1, 2) !== sector(2, 2),
  );

  check(
    `cuadro ${tamano}: la 1 a la 4 en cuartos distintos`,
    new Set([1, 2, 3, 4].map((s) => sector(s, 4))).size === 4,
  );
}

// ---------------------------------------------------------------------------
// 3. Los BYE, caso por caso
// ---------------------------------------------------------------------------

/** Ids ficticios: la semilla n es la pareja n * 100. */
const parejasDePrueba = (n: number) =>
  Array.from({ length: n }, (_, i) => (i + 1) * 100);

for (const { parejas, tamano, byesEsperados } of [
  { parejas: 16, tamano: 16, byesEsperados: 0 },
  { parejas: 12, tamano: 16, byesEsperados: 4 },
  { parejas: 9, tamano: 16, byesEsperados: 7 },
  { parejas: 8, tamano: 8, byesEsperados: 0 },
  { parejas: 5, tamano: 8, byesEsperados: 3 },
  { parejas: 32, tamano: 32, byesEsperados: 0 },
  { parejas: 17, tamano: 32, byesEsperados: 15 },
]) {
  const cuadro = buildCuadroDirecto(parejasDePrueba(parejas));
  const primera = cuadro.matches.filter((m) => m.primeraRonda);

  check(
    `${parejas} parejas: cuadro de ${tamano} con ${byesEsperados} byes`,
    cuadro.tamano === tamano && cuadro.byes === byesEsperados,
    `-> ${cuadro.tamano} slots, ${cuadro.byes} byes, fase ${cuadro.faseInicial}`,
  );

  // Ningun partido puede tener dos BYE: seria una ronda fantasma.
  check(
    `${parejas} parejas: ningun cruce con dos byes`,
    !primera.some((m) => m.token1 === BYE && m.token2 === BYE),
  );

  // Los byes tienen que ser exactamente los de las mejores semillas.
  const semillasConBye = primera
    .filter((m) => m.conBye)
    .map((m) => semillaDeToken(m.token1) ?? semillaDeToken(m.token2))
    .filter((s): s is number => s !== null)
    .sort((a, b) => a - b);

  const esperadas = Array.from({ length: byesEsperados }, (_, i) => i + 1);

  check(
    `${parejas} parejas: los byes son de las semillas ${byesEsperados ? `1 a ${byesEsperados}` : "(ninguna)"}`,
    JSON.stringify(semillasConBye) === JSON.stringify(esperadas),
    semillasConBye.length ? `-> ${semillasConBye.join(", ")}` : "",
  );

  // Todas las parejas entran, y una sola vez.
  const semillasEnJuego = primera
    .flatMap((m) => [semillaDeToken(m.token1), semillaDeToken(m.token2)])
    .filter((s): s is number => s !== null);

  check(
    `${parejas} parejas: entran todas y una sola vez`,
    semillasEnJuego.length === parejas &&
      new Set(semillasEnJuego).size === parejas,
  );

  // El cuadro tiene que llegar a una unica final.
  const finales = cuadro.matches.filter((m) => m.fase === "F");
  check(`${parejas} parejas: una sola final`, finales.length === 1);

  // Cada ronda tiene la mitad de partidos que la anterior.
  const porFase = new Map<string, number>();
  for (const m of cuadro.matches) {
    porFase.set(m.fase, (porFase.get(m.fase) ?? 0) + 1);
  }
  const cantidades = [...porFase.values()];
  let mitades = true;
  for (let i = 1; i < cantidades.length; i++) {
    if (cantidades[i] !== cantidades[i - 1] / 2) mitades = false;
  }
  check(
    `${parejas} parejas: cada ronda es la mitad de la anterior`,
    mitades,
    `-> ${[...porFase.entries()].map(([f, c]) => `${f}:${c}`).join(" ")}`,
  );
}

// ---------------------------------------------------------------------------
// 4. Los limites
// ---------------------------------------------------------------------------

for (const fuera of [0, 4, 33, 50]) {
  let tiro = false;
  try {
    tamanoDeCuadro(fuera);
  } catch {
    tiro = true;
  }
  check(`${fuera} parejas queda fuera de rango y corta`, tiro);
}

// ---------------------------------------------------------------------------

console.log("");
if (problemas.length) {
  console.error(`check:siembra FALLA - ${problemas.length} problema(s)`);
  process.exit(1);
}

console.log(`check:siembra OK - ${pasadas} verificaciones`);
