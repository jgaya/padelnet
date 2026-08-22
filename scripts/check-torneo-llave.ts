/**
 * Chequeo de invariantes del armado de zonas, llave y grilla.
 *
 * Ejecutar con: npm run check:llave
 *
 * No hay framework de tests en el repo, y estas invariantes son justamente las
 * que la adaptacion anterior rompia en silencio (partidos de llave que nunca se
 * creaban, fases agendadas antes de sus alimentadores). Se chequean sin base de
 * datos porque lib/torneo-grilla.ts es puro.
 */

import { LLAVE_TABLA } from "../lib/llave-tabla";
import {
  buildElimMatches,
  buildZonaMatches,
  buildZonasDesdeTabla,
  fasesDelCuadro,
  getLlavePorParejas,
  LlaveTablaError,
  requireLlaveEntry,
  siembraDeToken,
} from "../lib/torneo-llave";
import {
  buildGrilla,
  type GrillaDay,
  type GrillaInput,
  type GrillaMatch,
  type GrillaPareja,
} from "../lib/torneo-grilla";

let fallos = 0;
const fallar = (...args: unknown[]) => {
  fallos += 1;
  console.error("  FALLO:", ...args);
};

// ---------------------------------------------------------------------------
// 1. La tabla y su interpretacion
// ---------------------------------------------------------------------------

console.log(`Tabla: ${LLAVE_TABLA.length} entradas`);

for (const entry of LLAVE_TABLA) {
  const total = entry.parejas;
  const etiqueta = `parejas=${total}`;

  if (entry.partidos.length !== total) {
    fallar(etiqueta, "partidos de zona != cantidad de parejas");
  }
  if (entry.llave.length !== 2 * entry.round) {
    fallar(etiqueta, "slots del cuadro != 2 * round");
  }

  // Las zonas cubren cada siembra de 1 a N exactamente una vez.
  const ids = Array.from({ length: total }, (_, index) => index + 1);
  const zonas = buildZonasDesdeTabla(ids);
  const usados = zonas.flatMap((zona) => zona.parejaIds);
  if (new Set(usados).size !== total || usados.length !== total) {
    fallar(etiqueta, "las zonas no cubren cada pareja exactamente una vez");
  }
  for (const zona of zonas) {
    if (![3, 4].includes(zona.parejaIds.length)) {
      fallar(etiqueta, "zona de tamano invalido", zona.nombre);
    }
  }

  // Los partidos de zona: round robin en las de 3, mini cuadro en las de 4.
  const zonaMatches = buildZonaMatches(entry);
  if (zonaMatches.length !== entry.partidos.length) {
    fallar(etiqueta, "se perdieron partidos de zona al ordenar");
  }
  for (const zonaTabla of entry.grupo) {
    const letra = zonaTabla.nombre.split(" ")[1];
    const suyos = zonaMatches.filter((match) => match.zona === letra);
    const especiales = suyos.filter((match) => match.especial).length;

    if (zonaTabla.parejas.length === 3 && (suyos.length !== 3 || especiales !== 0)) {
      fallar(etiqueta, `zona de 3 mal formada: ${letra}`);
    }
    if (zonaTabla.parejas.length === 4 && (suyos.length !== 4 || especiales !== 2)) {
      fallar(etiqueta, `zona de 4 mal formada: ${letra}`);
    }
    for (const match of suyos.filter((item) => !item.especial)) {
      for (const token of [match.token1, match.token2]) {
        const siembra = siembraDeToken(token);
        if (siembra === null || siembra < 1 || siembra > zonaTabla.parejas.length) {
          fallar(etiqueta, "siembra fuera de rango", match.key, token);
        }
      }
    }
  }

  // El cuadro: entrantes == clasificados, y cada fase la mitad de la anterior.
  const elim = buildElimMatches(entry);
  const primera = elim.filter((match) => match.primeraRonda);
  if (primera.length !== entry.round) {
    fallar(etiqueta, "posiciones de la primera ronda != round");
  }
  if (elim.filter((match) => match.fase === "F").length !== 1) {
    fallar(etiqueta, "el cuadro no termina en una unica final");
  }

  const entrantes = primera
    .flatMap((match) => [match.token1, match.token2])
    .filter((token): token is string => Boolean(token) && token !== "Bye");
  const esperados = entry.grupo.flatMap((zona) => {
    const letra = zona.nombre.split(" ")[1];
    return zona.parejas.length === 4
      ? [`1${letra}`, `2${letra}`, `3${letra}`]
      : [`1${letra}`, `2${letra}`];
  });
  if ([...entrantes].sort().join() !== [...esperados].sort().join()) {
    fallar(etiqueta, "los entrantes del cuadro no son los clasificados de zona");
  }

  const fases = fasesDelCuadro(entry);
  for (let index = 1; index < fases.length; index += 1) {
    const anterior = elim.filter((match) => match.fase === fases[index - 1]).length;
    const actual = elim.filter((match) => match.fase === fases[index]).length;
    if (actual !== anterior / 2) {
      fallar(etiqueta, `${fases[index]} no es la mitad de ${fases[index - 1]}`);
    }
  }
}

for (const cantidad of [0, 6, 49, 100]) {
  try {
    requireLlaveEntry(cantidad);
    fallar(`requireLlaveEntry(${cantidad}) deberia fallar`);
  } catch (error) {
    if (!(error instanceof LlaveTablaError)) {
      fallar(`requireLlaveEntry(${cantidad}) lanzo un error inesperado`);
    }
  }
}

// ---------------------------------------------------------------------------
// 2. La grilla
// ---------------------------------------------------------------------------

function buildInput(
  totalParejas: number,
  cantidadDias: number,
  cantidadCanchas: number,
  overrides: Partial<GrillaInput> = {},
): GrillaInput {
  const ids = Array.from({ length: totalParejas }, (_, index) => index + 1);
  const zonas = buildZonasDesdeTabla(ids);
  const days: GrillaDay[] = Array.from({ length: cantidadDias }, (_, index) => {
    const fecha = new Date(2026, 2, 20 + index);
    return {
      label: `dia ${index + 1}`,
      key: `2026-03-${20 + index}`,
      date: fecha.toISOString(),
    };
  });

  return {
    zonas: zonas.map((zona, index) => ({
      grupoId: 100 + index,
      nombre: zona.nombre,
      letra: zona.nombre.split(" ")[1],
      parejaIdPorSiembra: zona.parejaIds,
    })),
    parejas: new Map<number, GrillaPareja>(
      ids.map((id) => [id, { nombre: `Pareja ${id}`, restriccion: null }]),
    ),
    days,
    canchas: Array.from({ length: cantidadCanchas }, (_, index) => ({
      canchaId: index + 1,
      label: `Cancha ${index + 1}`,
      dayWindows: days.map(() => ({ start: "09:00", end: "23:00" })),
    })),
    durationMin: 75,
    gapMultiplier: 1,
    shuffleSeed: 7,
    allowExtraFirstDay: false,
    ...overrides,
  };
}

const inicio = (match: GrillaMatch, days: GrillaDay[]) =>
  days.findIndex((day) => day.key === match.dayKey) * 1440 +
  Number(match.start.slice(0, 2)) * 60 +
  Number(match.start.slice(3));
const fin = (match: GrillaMatch, days: GrillaDay[]) =>
  days.findIndex((day) => day.key === match.dayKey) * 1440 +
  Number(match.end.slice(0, 2)) * 60 +
  Number(match.end.slice(3));

function checkGrilla(
  totalParejas: number,
  cantidadDias: number,
  cantidadCanchas: number,
) {
  const input = buildInput(totalParejas, cantidadDias, cantidadCanchas);
  const result = buildGrilla(input);
  const entry = getLlavePorParejas(totalParejas)!;
  const etiqueta = `parejas=${totalParejas} dias=${cantidadDias} canchas=${cantidadCanchas}`;

  const totalLlave =
    entry.round + (entry.round === 16 ? 15 : entry.round === 8 ? 7 : 3);
  const todos = [
    ...result.matches,
    ...result.unassignedZona,
    ...result.unassignedLlave,
  ];

  // Todo partido del torneo existe exactamente una vez: nada se pierde en el camino.
  if (todos.length !== entry.partidos.length + totalLlave) {
    fallar(etiqueta, "cobertura", todos.length, "esperado", entry.partidos.length + totalLlave);
  }
  if (new Set(todos.map((match) => match.key)).size !== todos.length) {
    fallar(etiqueta, "hay keys de partido duplicadas");
  }

  const llave = [...result.matches, ...result.unassignedLlave].filter(
    (match) => match.phase !== "ZONA",
  );
  if (llave.length !== totalLlave) {
    fallar(etiqueta, "falta parte del cuadro", llave.length, totalLlave);
  }
  if (llave.filter((match) => match.phase === "F").length !== 1) {
    fallar(etiqueta, "el cuadro guardado no tiene una unica final");
  }
  for (const match of llave) {
    if (!match.llave) fallar(etiqueta, "partido de llave sin llave", match.key);
  }
  for (const match of result.matches.filter((item) => item.phase === "ZONA")) {
    if (match.grupoId === null) fallar(etiqueta, "zona sin grupoId", match.key);
  }

  // Una pareja no puede tener dos partidos solapados.
  const porPareja = new Map<number, GrillaMatch[]>();
  for (const match of result.matches) {
    for (const parejaId of [match.pareja1Id, match.pareja2Id]) {
      if (parejaId === null) continue;
      porPareja.set(parejaId, [...(porPareja.get(parejaId) ?? []), match]);
    }
  }
  for (const [parejaId, suyos] of porPareja) {
    const ordenados = [...suyos].sort(
      (left, right) => inicio(left, input.days) - inicio(right, input.days),
    );
    for (let index = 1; index < ordenados.length; index += 1) {
      if (inicio(ordenados[index], input.days) < fin(ordenados[index - 1], input.days)) {
        fallar(etiqueta, "solape de pareja", parejaId, ordenados[index].key);
      }
    }
  }

  // Una cancha no puede tener dos partidos en el mismo horario.
  const ocupados = new Set<string>();
  for (const match of result.matches) {
    const clave = `${match.canchaId}|${match.dayKey}|${match.start}`;
    if (ocupados.has(clave)) fallar(etiqueta, "doble uso de cancha", clave);
    ocupados.add(clave);
  }

  // El cuadro arranca despues de que terminen las zonas.
  const finZonas = Math.max(
    0,
    ...result.matches
      .filter((match) => match.phase === "ZONA")
      .map((match) => fin(match, input.days)),
  );
  const elimAgendados = result.matches.filter((match) => match.phase !== "ZONA");
  if (
    elimAgendados.length > 0 &&
    Math.min(...elimAgendados.map((match) => inicio(match, input.days))) < finZonas
  ) {
    fallar(etiqueta, "el cuadro arranca antes de terminar las zonas");
  }

  // Cada fase despues de que termine la anterior.
  const fases = fasesDelCuadro(entry);
  for (let index = 1; index < fases.length; index += 1) {
    const anterior = elimAgendados.filter((match) => match.phase === fases[index - 1]);
    const actual = elimAgendados.filter((match) => match.phase === fases[index]);
    if (anterior.length === 0 || actual.length === 0) continue;
    if (
      Math.min(...actual.map((match) => inicio(match, input.days))) <
      Math.max(...anterior.map((match) => fin(match, input.days)))
    ) {
      fallar(etiqueta, `${fases[index]} arranca antes de terminar ${fases[index - 1]}`);
    }
  }

  // Los especiales de zona, despues de sus dos alimentadores.
  for (const especial of result.matches.filter((match) =>
    /^[A-Z][GP][12]$/.test(match.pareja1Letra ?? ""),
  )) {
    const alimentadores = result.matches.filter(
      (match) =>
        match.phase === "ZONA" &&
        match.grupoNombre === especial.grupoNombre &&
        !/^[A-Z][GP][12]$/.test(match.pareja1Letra ?? ""),
    );
    if (alimentadores.length < 2) continue;
    if (
      inicio(especial, input.days) <
      Math.max(...alimentadores.map((match) => fin(match, input.days)))
    ) {
      fallar(etiqueta, `el especial ${especial.key} cae antes de sus alimentadores`);
    }
  }

  const zonaAgendados = result.matches.filter((match) => match.phase === "ZONA").length;
  console.log(
    `  ${etiqueta}: zona ${zonaAgendados}/${entry.partidos.length}` +
      ` llave ${elimAgendados.length}/${totalLlave}` +
      ` sinZona=${result.unassignedZona.length} sinLlave=${result.unassignedLlave.length}`,
  );
}

console.log("\nGrilla, 4 dias / 3 canchas:");
for (const parejas of [7, 8, 11, 12, 14, 16, 20, 24, 25, 33, 40, 48]) {
  checkGrilla(parejas, 4, 3);
}

console.log("Grilla, 3 dias:");
for (const parejas of [12, 24, 33]) checkGrilla(parejas, 3, 4);

console.log("Grilla, torneos cortos:");
checkGrilla(12, 2, 4);
checkGrilla(12, 1, 6);

console.log("Grilla, capacidad ajustada (debe degradar, no romper):");
checkGrilla(33, 4, 1);

// El descanso entre fases es fijo: no puede colapsar cuando gapMultiplier es 0.
{
  const input = buildInput(12, 4, 3, { gapMultiplier: 0 });
  const result = buildGrilla(input);
  const finZonas = Math.max(
    0,
    ...result.matches
      .filter((match) => match.phase === "ZONA")
      .map((match) => fin(match, input.days)),
  );
  const primeraLlave = Math.min(
    ...result.matches
      .filter((match) => match.phase !== "ZONA")
      .map((match) => inicio(match, input.days)),
  );
  if (primeraLlave - finZonas < 60) {
    fallar("con gapMultiplier 0 el descanso entre zonas y llave colapso");
  }
}

// Misma semilla, misma grilla.
{
  const a = JSON.stringify(buildGrilla(buildInput(24, 4, 3)).matches);
  const b = JSON.stringify(buildGrilla(buildInput(24, 4, 3)).matches);
  if (a !== b) fallar("la grilla no es deterministica para una misma semilla");
}

if (fallos > 0) {
  console.error(`\n${fallos} fallo(s)`);
  process.exit(1);
}
console.log("\nOK: todas las invariantes pasan");
