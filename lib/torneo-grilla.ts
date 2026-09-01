/**
 * Armado de la grilla de un torneo: partidos de zona + llave, ubicados en los
 * slots de cancha disponibles.
 *
 * Modulo puro a proposito. Toda la logica de scheduling vive aca, sin prisma ni
 * auth, para que se pueda ejercitar sin base de datos: la adaptacion anterior
 * tenia el algoritmo enterrado en la server action y los defectos de orden entre
 * fases no se podian ver sin levantar la app entera.
 *
 * Orden de asignacion, portado de Gen2PageV2.tsx del organizador:
 *   1. partidos de zona con restriccion horaria (los que menos margen tienen)
 *   2. partidos de zona sin restriccion, + reintentos
 *   3. especiales de zona (AG1-AG2 / AP1-AP2), despues de sus dos alimentadores
 *   4. fases de la llave en orden, cada una despues de que la anterior termine
 */

import { minutesToTime, parseTimeToMinutes } from "@/lib/horarios";
import {
  buildElimMatches,
  buildZonaMatches,
  FASES_LLAVE,
  fasesDelCuadro,
  requireLlaveEntry,
  siembraDeToken,
  zonaDeToken,
  type ElimMatchSpec,
  type FaseLlave,
  type ZonaMatchSpec,
} from "@/lib/torneo-llave";
import {
  buildCuadroDirecto,
  semillaDeToken,
} from "@/lib/torneo-llave-directa";

export type GrillaDay = {
  label: string;
  key: string;
  /** ISO del dia a medianoche local. */
  date: string;
};

export type GrillaPareja = {
  nombre: string;
  /** Formato "dia,HH:mm,HH:mm": franja en la que la pareja NO puede jugar. */
  restriccion: string | null;
};

export type GrillaZona = {
  grupoId: number;
  nombre: string;
  /** Letra de la zona ("A"), la que usan los tokens de la tabla. */
  letra: string;
  /** parejaIds ordenados por siembra dentro de la zona: indice 0 = A1. */
  parejaIdPorSiembra: number[];
};

export type GrillaCancha = {
  canchaId: number;
  label: string;
  /** Una ventana por dia de GrillaInput.days, en el mismo orden. */
  dayWindows: Array<{ start: string; end: string }>;
};

export type GrillaInput = {
  zonas: GrillaZona[];
  /**
   * "ZONAS" (default) arma zonas y despues el cuadro desde LLAVE_TABLA.
   * "DIRECTO" saltea las zonas y siembra el cuadro con `siembra`.
   */
  modo?: "ZONAS" | "DIRECTO";
  /** Solo en DIRECTO: ids de pareja en orden de siembra, el 0 es la semilla 1. */
  siembra?: number[];
  parejas: Map<number, GrillaPareja>;
  days: GrillaDay[];
  canchas: GrillaCancha[];
  durationMin: number;
  gapMultiplier: number;
  shuffleSeed: number;
  allowExtraFirstDay: boolean;
};

/** ZONA cubre tanto el round robin como los especiales de ganadores/perdedores. */
export type GrillaFase = "ZONA" | FaseLlave;

export type GrillaMatch = {
  key: string;
  grupoId: number | null;
  grupoNombre: string | null;
  phase: GrillaFase;
  llave: string | null;
  canchaId: number;
  canchaLabel: string;
  dayKey: string;
  dayLabel: string;
  start: string;
  end: string;
  scheduledAt: string;
  pareja1Id: number | null;
  pareja2Id: number | null;
  pareja1Letra: string | null;
  pareja2Letra: string | null;
  pareja1Nombre: string;
  pareja2Nombre: string;
  restricted: boolean;
};

export type GrillaUnassigned = {
  key: string;
  grupoId: number | null;
  grupoNombre: string | null;
  phase: GrillaFase;
  llave: string | null;
  pareja1Id: number | null;
  pareja2Id: number | null;
  pareja1Letra: string | null;
  pareja2Letra: string | null;
  pareja1Nombre: string;
  pareja2Nombre: string;
  restricted: boolean;
  /** true en los cruces de primera ronda con Bye, que no se juegan nunca. */
  conBye: boolean;
};

export type GrillaResult = {
  matches: GrillaMatch[];
  unassignedZona: GrillaUnassigned[];
  unassignedLlave: GrillaUnassigned[];
  slotsDisponibles: number;
  slotsOcupados: number;
};

function seededRandom(seed: number) {
  let state = seed % 2147483647;
  if (state <= 0) {
    state += 2147483646;
  }

  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function shuffleWithSeed<T>(items: T[], seed: number) {
  const next = [...items];
  const random = seededRandom(seed || 1);

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

function groupLetter(index: number) {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return letters[index] ?? `G${index + 1}`;
}

export function normalizeGroupLetter(nombre: string, fallbackIndex: number) {
  const match = nombre.match(/zona\s+([A-Z])/i);
  return (match?.[1] ?? groupLetter(fallbackIndex)).toUpperCase();
}

/**
 * Texto que se guarda en Partido.llave. Es un contrato: lo parsean
 * parseLlaveValue() (aca abajo), resolveRoundFromLlave() en
 * actions/torneos-public.ts y lib/ranking-puntajes.ts. No cambiar sin tocar los tres.
 */
export function llaveValue(phase: FaseLlave, index: number) {
  switch (phase) {
    case "DF":
      return `Dieciseisavos ${index}`;
    case "OF":
      return `Octavos ${index}`;
    case "CF":
      return `Cuartos ${index}`;
    case "SF":
      return `Semifinal ${index}`;
    case "F":
      return `Final ${index}`;
  }
}

const PREFIJO_A_FASE: ReadonlyArray<[string, FaseLlave]> = [
  // "Semifinal" antes que "Final": los dos terminan igual y startsWith se
  // confundiria si "Final" fuera primero.
  ["Semifinal", "SF"],
  ["Dieciseisavos", "DF"],
  ["Octavos", "OF"],
  ["Cuartos", "CF"],
  ["Final", "F"],
];

/** Inversa de llaveValue: "Octavos 3" -> { fase: "OF", numero: 3 }. */
export function parseLlaveValue(
  llave: string | null | undefined,
): { fase: FaseLlave; numero: number } | null {
  if (!llave) return null;

  const texto = llave.trim();
  for (const [prefijo, fase] of PREFIJO_A_FASE) {
    if (!texto.startsWith(prefijo)) continue;

    const numero = Number(texto.slice(prefijo.length).trim());
    if (!Number.isInteger(numero) || numero <= 0) return null;

    return { fase, numero };
  }

  return null;
}

function parseRestriction(value: string | null, day: GrillaDay) {
  if (!value) {
    return null;
  }

  const [rawDay, rawStart, rawEnd] = value.split(",").map((item) => item.trim());
  if (!rawDay || !rawStart || !rawEnd) {
    return null;
  }

  const normalizedDay = rawDay.toLowerCase();
  const longDay = new Date(day.date).toLocaleDateString("es-AR", {
    weekday: "long",
  });
  const dayMatches =
    normalizedDay === day.key.toLowerCase() ||
    normalizedDay === longDay.toLowerCase() ||
    day.label.toLowerCase().includes(normalizedDay) ||
    normalizedDay.includes(day.label.split(" ")[0].toLowerCase()) ||
    normalizedDay.includes(longDay.toLowerCase());

  if (!dayMatches) {
    return null;
  }

  try {
    return {
      startMin: parseTimeToMinutes(rawStart),
      endMin: parseTimeToMinutes(rawEnd),
    };
  } catch {
    return null;
  }
}

function isRestrictedAt(
  restrictions: string[],
  day: GrillaDay,
  startMin: number,
) {
  return restrictions.some((restriction) => {
    const parsed = parseRestriction(restriction, day);
    return parsed && startMin >= parsed.startMin && startMin < parsed.endMin;
  });
}

export function buildGrilla(input: GrillaInput): GrillaResult {
  const {
    zonas,
    parejas,
    days,
    canchas: selectedCanchas,
    durationMin,
    gapMultiplier,
    modo = "ZONAS",
    siembra = [],
  } = input;

  if (days.length === 0) {
    throw new Error("El torneo debe tener al menos un dia");
  }

  const labelPorCancha = new Map(
    selectedCanchas.map((cancha) => [cancha.canchaId, cancha.label]),
  );

  const zonasPorLetra = new Map<string, GrillaZona>();
  for (const zona of zonas) {
    if (zonasPorLetra.has(zona.letra)) {
      throw new Error(
        `Hay mas de una zona con la letra ${zona.letra}. Renombra las zonas como "Zona A", "Zona B", etc.`,
      );
    }
    zonasPorLetra.set(zona.letra, zona);
  }

  const totalParejas =
    modo === "DIRECTO"
      ? siembra.length
      : [...zonasPorLetra.values()].reduce(
          (total, zona) => total + zona.parejaIdPorSiembra.length,
          0,
        );

  // La tabla define, para esta cantidad de parejas, cuantas zonas hay, de que
  // tamano, sus partidos y los cruces del cuadro. Si las zonas cargadas no
  // coinciden no se puede armar nada coherente, asi que se corta con un mensaje
  // que diga que hay que corregir.
  //
  // En DIRECTO no hay tabla: el cuadro lo calcula lib/torneo-llave-directa.ts a
  // partir de la siembra, y no hay zonas que validar.
  const entry = modo === "DIRECTO" ? null : requireLlaveEntry(totalParejas);

  if (entry && entry.grupo.length !== zonasPorLetra.size) {
    throw new Error(
      `Con ${totalParejas} parejas el torneo necesita ${entry.grupo.length} zonas y hay ${zonasPorLetra.size}. Regenera las zonas desde la pantalla de zonas.`,
    );
  }

  for (const zonaTabla of entry?.grupo ?? []) {
    const letra = zonaTabla.nombre.split(" ")[1]?.toUpperCase() ?? "";
    const zona = zonasPorLetra.get(letra);

    if (!zona) {
      throw new Error(
        `Falta la ${zonaTabla.nombre}: con ${totalParejas} parejas el torneo va de la Zona A a la ${entry!.grupo[entry!.grupo.length - 1].nombre.split(" ")[1]}.`,
      );
    }

    if (zona.parejaIdPorSiembra.length !== zonaTabla.parejas.length) {
      throw new Error(
        `La ${zonaTabla.nombre} tiene ${zona.parejaIdPorSiembra.length} parejas y con ${totalParejas} parejas le corresponden ${zonaTabla.parejas.length}. Regenera las zonas desde la pantalla de zonas.`,
      );
    }
  }

  type PlannedMatch = {
    key: string;
    grupoId: number | null;
    grupoNombre: string | null;
    phase: GrillaFase;
    llave: string | null;
    pareja1Id: number | null;
    pareja2Id: number | null;
    pareja1Letra: string | null;
    pareja2Letra: string | null;
    pareja1Nombre: string;
    pareja2Nombre: string;
    restrictions: string[];
    /** Letra de la zona; null en los partidos de llave. */
    zona: string | null;
    /** true para AG1-AG2 / AP1-AP2: las parejas dependen de resultados. */
    especialZona: boolean;
    /** Fase del cuadro; null en los partidos de zona. */
    fase: FaseLlave | null;
    /** true en los cruces de primera ronda con Bye, que no se juegan. */
    conBye: boolean;
  };

  const resolveZonaToken = (token: string) => {
    const zona = zonasPorLetra.get(zonaDeToken(token));
    const siembra = siembraDeToken(token);
    if (!zona || siembra === null) return null;
    return zona.parejaIdPorSiembra[siembra - 1] ?? null;
  };

  const buildPlannedZonaMatch = (spec: ZonaMatchSpec): PlannedMatch => {
    const zona = zonasPorLetra.get(spec.zona);

    if (!zona) {
      throw new Error(`El partido ${spec.key} referencia una zona inexistente`);
    }

    const base = {
      key: spec.key,
      grupoId: zona.grupoId,
      grupoNombre: zona.nombre,
      phase: "ZONA" as const,
      llave: null,
      zona: spec.zona,
      fase: null,
      conBye: false,
    };

    // Ganadores/perdedores de los dos primeros partidos de una zona de 4: se
    // agendan igual, pero las parejas recien se conocen con los resultados.
    if (spec.especial) {
      return {
        ...base,
        pareja1Id: null,
        pareja2Id: null,
        pareja1Letra: spec.token1,
        pareja2Letra: spec.token2,
        pareja1Nombre: spec.token1,
        pareja2Nombre: spec.token2,
        restrictions: [],
        especialZona: true,
      };
    }

    const pareja1Id = resolveZonaToken(spec.token1);
    const pareja2Id = resolveZonaToken(spec.token2);

    if (pareja1Id === null || pareja2Id === null) {
      throw new Error(
        `No se pudo resolver el partido de zona ${spec.key} contra las parejas cargadas`,
      );
    }

    return {
      ...base,
      pareja1Id,
      pareja2Id,
      pareja1Letra: spec.token1,
      pareja2Letra: spec.token2,
      pareja1Nombre: parejas.get(pareja1Id)?.nombre ?? spec.token1,
      pareja2Nombre: parejas.get(pareja2Id)?.nombre ?? spec.token2,
      restrictions: [
        parejas.get(pareja1Id)?.restriccion ?? null,
        parejas.get(pareja2Id)?.restriccion ?? null,
      ].filter((item): item is string => Boolean(item)),
      especialZona: false,
    };
  };

  const buildPlannedElimMatch = (spec: ElimMatchSpec): PlannedMatch => ({
    key: spec.key,
    grupoId: null,
    grupoNombre: null,
    phase: spec.fase,
    llave: llaveValue(spec.fase, spec.numero),
    pareja1Id: null,
    pareja2Id: null,
    pareja1Letra: spec.token1,
    pareja2Letra: spec.token2,
    pareja1Nombre: spec.token1 ?? "A definir",
    pareja2Nombre: spec.token2 ?? "A definir",
    restrictions: [],
    zona: null,
    especialZona: false,
    fase: spec.fase,
    conBye: spec.conBye,
  });

  /**
   * Variante de `buildPlannedElimMatch` para el cuadro directo.
   *
   * La diferencia de fondo: aca las parejas de la primera ronda **se conocen
   * al generar**, porque salen de la siembra y no del resultado de una zona.
   * Por eso el partido nace con `pareja1Id` puesto, y el Bye ya queda marcado.
   */
  const buildPlannedElimDirecto = (spec: ElimMatchSpec): PlannedMatch => {
    const base = buildPlannedElimMatch(spec);

    if (!spec.primeraRonda) return base;

    const parejaDeToken = (token: string | null) => {
      const semilla = semillaDeToken(token);
      return semilla === null ? null : (siembra[semilla - 1] ?? null);
    };

    const pareja1Id = parejaDeToken(spec.token1);
    const pareja2Id = parejaDeToken(spec.token2);

    const nombreDe = (id: number | null, token: string | null) =>
      id === null ? (token ?? "A definir") : (parejas.get(id)?.nombre ?? token ?? "");

    return {
      ...base,
      pareja1Id,
      pareja2Id,
      pareja1Nombre: nombreDe(pareja1Id, spec.token1),
      pareja2Nombre: nombreDe(pareja2Id, spec.token2),
      restrictions: [
        pareja1Id === null ? null : (parejas.get(pareja1Id)?.restriccion ?? null),
        pareja2Id === null ? null : (parejas.get(pareja2Id)?.restriccion ?? null),
      ].filter((item): item is string => Boolean(item)),
    };
  };

  const zonaMatches = entry
    ? buildZonaMatches(entry).map(buildPlannedZonaMatch)
    : [];
  const elimMatches = entry
    ? buildElimMatches(entry).map(buildPlannedElimMatch)
    : buildCuadroDirecto(siembra).matches.map(buildPlannedElimDirecto);

  const slots: Array<{
    canchaId: number;
    day: GrillaDay;
    dayIndex: number;
    startMin: number;
    endMin: number;
    scheduledAt: Date;
    match?: PlannedMatch;
  }> = [];

  for (const config of selectedCanchas) {
    for (const [dayIndex, dayWindow] of config.dayWindows.entries()) {
      const dayDate = new Date(days[dayIndex].date);
      const startMin = parseTimeToMinutes(dayWindow.start);
      const endMin = parseTimeToMinutes(dayWindow.end);
      let lastEndMin = startMin;

      for (
        let slotStartMin = startMin;
        slotStartMin + durationMin <= endMin;
        slotStartMin += durationMin
      ) {
        const scheduledAt = new Date(dayDate);
        scheduledAt.setHours(
          Math.floor(slotStartMin / 60),
          slotStartMin % 60,
          0,
          0,
        );
        slots.push({
          canchaId: config.canchaId,
          day: days[dayIndex],
          dayIndex,
          startMin: slotStartMin,
          endMin: slotStartMin + durationMin,
          scheduledAt,
        });
        lastEndMin = slotStartMin + durationMin;
      }

      const remainingMin = endMin - lastEndMin;
      const allowExtra =
        remainingMin > 30 &&
        (dayIndex === 1 || (dayIndex === 0 && input.allowExtraFirstDay));

      if (allowExtra) {
        const scheduledAt = new Date(dayDate);
        scheduledAt.setHours(
          Math.floor(lastEndMin / 60),
          lastEndMin % 60,
          0,
          0,
        );
        slots.push({
          canchaId: config.canchaId,
          day: days[dayIndex],
          dayIndex,
          startMin: lastEndMin,
          endMin,
          scheduledAt,
        });
      }
    }
  }

  slots.sort(
    (left, right) =>
      left.dayIndex - right.dayIndex ||
      left.scheduledAt.getTime() - right.scheduledAt.getTime() ||
      left.canchaId - right.canchaId,
  );

  // Reparto de dias entre zonas y llave. Las zonas se juegan los dos primeros
  // dias y el cuadro los ultimos, si no las zonas se comen todos los slots y no
  // queda lugar para la llave.
  const lastDayIndex = days.length - 1;
  const zonaDayIndexes = new Set(
    days.length === 1 ? [0] : [0, 1],
  );
  const faseDayIndexes: Record<FaseLlave, Set<number>> = (() => {
    if (days.length >= 4) {
      return {
        DF: new Set([2]),
        OF: new Set([2]),
        CF: new Set([3]),
        SF: new Set([3]),
        F: new Set([3]),
      };
    }

    if (days.length === 3) {
      // Con 3 dias los dieciseisavos arrancan el segundo dia, ya sobre el final.
      return {
        DF: new Set([1]),
        OF: new Set([2]),
        CF: new Set([2]),
        SF: new Set([2]),
        F: new Set([2]),
      };
    }

    const unico = new Set([lastDayIndex]);
    return { DF: unico, OF: unico, CF: unico, SF: unico, F: unico };
  })();

  /**
   * Descanso minimo entre fases, en minutos. Es fijo a proposito: no se deriva
   * de gapMultiplier porque con 0x el cuadro quedaria sin ningun descanso.
   */
  const elimGap = (dayIndex: number) =>
    days.length >= 4 && dayIndex === 2 ? 120 : 60;
  const GAP_ESPECIALES_ZONA = 60;

  const absMinutes = (dayIndex: number, minute: number) =>
    dayIndex * 1440 + minute;

  const usageByPair = new Map<
    number,
    Array<{ dayKey: string; startMin: number; endMin: number }>
  >();
  const minGap = Math.ceil(durationMin * gapMultiplier);

  const hasPairConflict = (
    pairId: number | null,
    slot: (typeof slots)[number],
    restricted: boolean,
  ) => {
    if (pairId === null) return false;
    const played = usageByPair.get(pairId) ?? [];

    // Un solo partido por pareja el primer dia. Con un unico dia de torneo la
    // regla haria imposible cualquier grilla, asi que no aplica.
    if (
      days.length > 1 &&
      slot.dayIndex === 0 &&
      played.some((item) => item.dayKey === slot.day.key)
    ) {
      return true;
    }

    const gap = restricted ? minGap * 2 : minGap;
    return played.some(
      (item) =>
        item.dayKey === slot.day.key && slot.startMin < item.endMin + gap,
    );
  };

  const registerUsage = (
    match: PlannedMatch,
    slot: (typeof slots)[number],
  ) => {
    for (const pairId of [match.pareja1Id, match.pareja2Id]) {
      if (pairId === null) continue;
      const played = usageByPair.get(pairId) ?? [];
      played.push({
        dayKey: slot.day.key,
        startMin: slot.startMin,
        endMin: slot.endMin,
      });
      usageByPair.set(pairId, played);
    }
  };

  /**
   * Busca el primer slot libre que cumpla todas las condiciones y asigna.
   * `allowedDays` restringe los dias; `notBefore` es un minuto absoluto minimo.
   */
  const assignMatch = (
    match: PlannedMatch,
    allowedDays: Set<number>,
    notBefore = 0,
  ) => {
    const restricted = match.restrictions.length > 0;

    for (const slot of slots) {
      if (slot.match) continue;
      if (!allowedDays.has(slot.dayIndex)) continue;
      if (absMinutes(slot.dayIndex, slot.startMin) < notBefore) continue;
      if (isRestrictedAt(match.restrictions, slot.day, slot.startMin)) continue;

      if (
        hasPairConflict(match.pareja1Id, slot, restricted) ||
        hasPairConflict(match.pareja2Id, slot, restricted)
      ) {
        continue;
      }

      slot.match = match;
      registerUsage(match, slot);
      return true;
    }

    return false;
  };

  const pendientes: PlannedMatch[] = [];

  // 1) Zonas. Primero las que tienen restriccion horaria, que son las que menos
  // margen tienen; los especiales quedan para el final porque dependen de que
  // ya esten agendados sus dos alimentadores.
  const zonaRegulares = zonaMatches.filter((match) => !match.especialZona);
  const zonaEspeciales = zonaMatches.filter((match) => match.especialZona);
  const zonaOrdenadas = shuffleWithSeed(zonaRegulares, input.shuffleSeed);

  for (const match of [
    ...zonaOrdenadas.filter((item) => item.restrictions.length > 0),
    ...zonaOrdenadas.filter((item) => item.restrictions.length === 0),
  ]) {
    if (!assignMatch(match, zonaDayIndexes)) {
      pendientes.push(match);
    }
  }

  // Reintento de los pendientes de zona: al liberarse el orden de asignacion
  // algunos entran en el segundo intento.
  for (let intento = 0; intento < 3 && pendientes.length > 0; intento += 1) {
    let asignados = 0;

    for (let index = pendientes.length - 1; index >= 0; index -= 1) {
      if (assignMatch(pendientes[index], zonaDayIndexes)) {
        pendientes.splice(index, 1);
        asignados += 1;
      }
    }

    if (asignados === 0) break;
  }

  // 2) Especiales de zona: no antes de que terminen los dos partidos de los que
  // salen los ganadores/perdedores, mas un descanso.
  const finPorZona = new Map<string, number>();
  for (const slot of slots) {
    const match = slot.match;
    if (!match?.zona || match.especialZona) continue;
    finPorZona.set(
      match.zona,
      Math.max(
        finPorZona.get(match.zona) ?? 0,
        absMinutes(slot.dayIndex, slot.endMin),
      ),
    );
  }

  for (const match of zonaEspeciales) {
    const notBefore =
      (finPorZona.get(match.zona ?? "") ?? 0) + GAP_ESPECIALES_ZONA;

    if (!assignMatch(match, zonaDayIndexes, notBefore)) {
      pendientes.push(match);
    }
  }

  const unassignedZona: GrillaUnassigned[] = [];
  const unassignedLlave: GrillaUnassigned[] = [];

  const toUnassigned = (match: PlannedMatch): GrillaUnassigned => ({
    key: match.key,
    grupoId: match.grupoId,
    grupoNombre: match.grupoNombre,
    phase: match.phase,
    llave: match.llave,
    pareja1Id: match.pareja1Id,
    pareja2Id: match.pareja2Id,
    pareja1Letra: match.pareja1Letra,
    pareja2Letra: match.pareja2Letra,
    pareja1Nombre: match.pareja1Nombre,
    pareja2Nombre: match.pareja2Nombre,
    restricted: match.restrictions.length > 0,
    conBye: match.conBye,
  });

  for (const match of pendientes) {
    unassignedZona.push(toUnassigned(match));
  }

  // 3) Llave. El cuadro no puede empezar antes de que termine la ultima zona, y
  // cada fase espera a que la anterior este completa: si no, las semis podrian
  // caer antes que los cuartos que las alimentan.
  const finZonas = slots.reduce((max, slot) => {
    if (slot.match?.phase !== "ZONA") return max;
    return Math.max(max, absMinutes(slot.dayIndex, slot.endMin));
  }, 0);

  const finPorFase = new Map<FaseLlave, number>();
  const asignadosPorFase = new Map<FaseLlave, number>();
  // Con zonas sale de la tabla; en directo, de los partidos que se armaron.
  // Las dos formas dan las fases presentes en orden de disputa.
  const fases = entry
    ? fasesDelCuadro(entry)
    : FASES_LLAVE.filter((fase) =>
        elimMatches.some((match) => match.fase === fase),
      );

  for (const [faseIndex, fase] of fases.entries()) {
    const deLaFase = elimMatches.filter((match) => match.fase === fase);
    // Los cruces con Bye no se juegan: se persisten como placeholder para que la
    // columna del cuadro quede completa.
    const jugables = deLaFase.filter((match) => !match.conBye);

    for (const match of deLaFase.filter((item) => item.conBye)) {
      unassignedLlave.push(toUnassigned(match));
    }

    const faseAnterior = faseIndex > 0 ? fases[faseIndex - 1] : null;
    const anteriorCompleta =
      faseAnterior === null ||
      (asignadosPorFase.get(faseAnterior) ?? 0) ===
        elimMatches.filter(
          (item) => item.fase === faseAnterior && !item.conBye,
        ).length;

    if (!anteriorCompleta) {
      // Sin la fase anterior entera no se puede ubicar esta sin arriesgar que
      // quede antes que su alimentador.
      for (const match of jugables) {
        unassignedLlave.push(toUnassigned(match));
      }
      continue;
    }

    const allowedDays = faseDayIndexes[fase];
    const gap = Math.max(
      ...[...allowedDays].map((dayIndex) => elimGap(dayIndex)),
    );
    const notBefore = Math.max(
      finZonas + gap,
      faseAnterior ? (finPorFase.get(faseAnterior) ?? 0) + gap : 0,
    );

    let asignados = 0;

    for (const match of jugables) {
      if (assignMatch(match, allowedDays, notBefore)) {
        asignados += 1;
      } else {
        unassignedLlave.push(toUnassigned(match));
      }
    }

    asignadosPorFase.set(fase, asignados);
    finPorFase.set(
      fase,
      slots.reduce((max, slot) => {
        if (slot.match?.fase !== fase) return max;
        return Math.max(max, absMinutes(slot.dayIndex, slot.endMin));
      }, 0),
    );
  }

  const matches = slots
    .filter((slot) => slot.match)
    .map((slot) => {
      const match = slot.match!;
      return {
        key: match.key,
        grupoId: match.grupoId,
        grupoNombre: match.grupoNombre,
        phase: match.phase,
        llave: match.llave,
        canchaId: slot.canchaId,
        canchaLabel: labelPorCancha.get(slot.canchaId) ?? `Cancha ${slot.canchaId}`,
        dayKey: slot.day.key,
        dayLabel: slot.day.label,
        start: minutesToTime(slot.startMin),
        end: minutesToTime(slot.endMin),
        scheduledAt: slot.scheduledAt.toISOString(),
        pareja1Id: match.pareja1Id,
        pareja2Id: match.pareja2Id,
        pareja1Letra: match.pareja1Letra,
        pareja2Letra: match.pareja2Letra,
        pareja1Nombre: match.pareja1Nombre,
        pareja2Nombre: match.pareja2Nombre,
        restricted: match.restrictions.length > 0,
      };
    });

  return {
    matches,
    unassignedZona,
    unassignedLlave,
    slotsDisponibles: slots.length,
    slotsOcupados: matches.length,
  };
}

// Reexport por conveniencia: la action de partidos los usa para validar los
// rangos horarios que llegan del formulario.
export { minutesToTime, parseTime, parseTimeToMinutes } from "@/lib/horarios";
