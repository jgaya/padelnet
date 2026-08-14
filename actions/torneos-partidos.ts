"use server";

import { prisma } from "@/lib/prisma";
import { ensureComplejoManagerAccess } from "@/lib/complejo-access";

export type TorneoPartidosDayConfig = {
  label: string;
  key: string;
  date: string;
};

export type TorneoPartidosGrupoSummary = {
  id: number;
  nombre: string;
  parejaCount: number;
};

export type TorneoPartidosCanchaOption = {
  id: number;
  numero: number;
  name: string | null;
  label: string;
};

export type TorneoPartidosSetupData = {
  torneo: {
    id: number;
    nombre: string;
    eventoNombre: string;
    inicio: string | null;
    fin: string | null;
    days: TorneoPartidosDayConfig[];
    partidosGenerados: boolean;
    partidoCount: number;
  };
  grupos: TorneoPartidosGrupoSummary[];
  canchas: TorneoPartidosCanchaOption[];
};

export type SaveTorneoPartidosPayload = {
  durationMin: number;
  gapMultiplier: number;
  shuffleSeed: number;
  allowExtraFirstDay: boolean;
  canchas: Array<{
    canchaId: number;
    selected: boolean;
    dayWindows: Array<{
      start: string;
      end: string;
    }>;
  }>;
};

export type TorneoPartidosPreviewMatch = {
  key: string;
  torneoId: number;
  grupoId: number | null;
  grupoNombre: string | null;
  phase: "ZONA" | "DF" | "OF" | "CF" | "SF" | "F";
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

export type TorneoPartidosUnassignedMatch = {
  key: string;
  grupoId: number | null;
  grupoNombre: string | null;
  phase: "ZONA" | "DF" | "OF" | "CF" | "SF" | "F";
  llave: string | null;
  pareja1Id: number | null;
  pareja2Id: number | null;
  pareja1Letra: string | null;
  pareja2Letra: string | null;
  pareja1Nombre: string;
  pareja2Nombre: string;
  restricted: boolean;
};

export type TorneoPartidoSetItem = {
  numero: number;
  gamesPareja1: number;
  gamesPareja2: number;
  tiebreakP1: number | null;
  tiebreakP2: number | null;
};

export type TorneoPartidosPreview = {
  matches: TorneoPartidosPreviewMatch[];
  unassigned: TorneoPartidosUnassignedMatch[];
  slotsDisponibles: number;
  slotsOcupados: number;
};

export type TorneoPartidoListItem = {
  id: number;
  torneoId: number;
  grupoId: number | null;
  llave: string | null;
  status: "PENDING" | "SCHEDULED" | "IN_PROGRESS" | "FINISHED" | "WALKOVER" | "CANCELLED";
  scheduledAt: string | null;
  canchaId: number | null;
  canchaLabel: string;
  pareja1Id: number | null;
  pareja2Id: number | null;
  pareja1Nombre: string;
  pareja2Nombre: string;
  pareja1Letra: string | null;
  pareja2Letra: string | null;
  ganadorId: number | null;
  perdedorId: number | null;
  walkover: boolean;
  sets: TorneoPartidoSetItem[];
};

export async function listTorneoPartidosByTorneo(
  complejoId: number,
  eventoId: number,
  torneoId: number,
): Promise<TorneoPartidoListItem[]> {
  await ensureTorneoAccess(complejoId, eventoId, torneoId);

  const partidos = await prisma.partido.findMany({
    where: {
      torneoId,
      deletedAt: null,
    },
    orderBy: [{ scheduledAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      torneoId: true,
      grupoId: true,
      llave: true,
      status: true,
      scheduledAt: true,
      cancha: {
        select: {
          id: true,
          numero: true,
          name: true,
        },
      },
      pareja1Id: true,
      pareja2Id: true,
      pareja1Letra: true,
      pareja2Letra: true,
      ganadorId: true,
      perdedorId: true,
      walkover: true,
      sets: {
        select: {
          numero: true,
          gamesPareja1: true,
          gamesPareja2: true,
          tiebreakP1: true,
          tiebreakP2: true,
        },
      },
      pareja1: {
        select: {
          jugador1: {
            select: {
              name: true,
              lastname: true,
            },
          },
          jugador2: {
            select: {
              name: true,
              lastname: true,
            },
          },
        },
      },
      pareja2: {
        select: {
          jugador1: {
            select: {
              name: true,
              lastname: true,
            },
          },
          jugador2: {
            select: {
              name: true,
              lastname: true,
            },
          },
        },
      },
    },
  });

  return partidos.map((partido) => ({
    id: partido.id,
    torneoId: partido.torneoId,
    grupoId: partido.grupoId,
    llave: partido.llave,
    status: partido.status,
    scheduledAt: partido.scheduledAt ? partido.scheduledAt.toISOString() : null,
    canchaId: partido.cancha?.id ?? null,
    canchaLabel: partido.cancha
      ? `Cancha ${partido.cancha.numero}${partido.cancha.name ? ` - ${partido.cancha.name}` : ""}`
      : "Sin cancha",
    pareja1Id: partido.pareja1Id,
    pareja2Id: partido.pareja2Id,
    pareja1Letra: partido.pareja1Letra,
    pareja2Letra: partido.pareja2Letra,
    pareja1Nombre: buildParejaNombre(
      partido.pareja1?.jugador1,
      partido.pareja1?.jugador2,
    ),
    pareja2Nombre: buildParejaNombre(
      partido.pareja2?.jugador1,
      partido.pareja2?.jugador2,
    ),
    ganadorId: partido.ganadorId,
    perdedorId: partido.perdedorId,
    walkover: partido.walkover,
    sets: partido.sets.map((set) => ({
      numero: set.numero,
      gamesPareja1: set.gamesPareja1,
      gamesPareja2: set.gamesPareja2,
      tiebreakP1: set.tiebreakP1,
      tiebreakP2: set.tiebreakP2,
    })),
  }));
}

export async function saveTorneoPartidoResultado(
  complejoId: number,
  eventoId: number,
  torneoId: number,
  partidoId: number,
  ganadorId: number,
  perdedorId: number,
  sets: Array<{
    numero: number;
    gamesPareja1: number;
    gamesPareja2: number;
    tiebreakP1?: number | null;
    tiebreakP2?: number | null;
  }>,
  walkover = false,
) {
  await ensureTorneoAccess(complejoId, eventoId, torneoId);

  const partido = await prisma.partido.findFirst({
    where: {
      id: partidoId,
      torneoId,
      deletedAt: null,
    },
    select: {
      id: true,
      pareja1Id: true,
      pareja2Id: true,
    },
  });

  if (!partido) {
    throw new Error("Partido no encontrado");
  }

  const validPairIds = [partido.pareja1Id, partido.pareja2Id].filter(
    (id): id is number => id !== null,
  );

  if (!validPairIds.includes(ganadorId) || !validPairIds.includes(perdedorId)) {
    throw new Error("El ganador o perdedor no pertenece a este partido");
  }

  await prisma.partido.update({
    where: { id: partidoId },
    data: {
      ganadorId,
      perdedorId,
      status: "FINISHED",
      walkover,
      sets: {
        deleteMany: {},
        create: sets.map((set) => ({
          numero: set.numero,
          gamesPareja1: set.gamesPareja1,
          gamesPareja2: set.gamesPareja2,
          tiebreakP1: set.tiebreakP1 ?? null,
          tiebreakP2: set.tiebreakP2 ?? null,
        })),
      },
    },
  });

  return { success: true };
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildTournamentDays(inicio: Date | null, fin: Date | null) {
  if (!inicio) {
    const initial = new Date();
    return [
      {
        label: formatDayLabel(initial),
        key: toDateKey(initial),
        date: initial.toISOString(),
      },
    ];
  }

  const start = new Date(inicio);
  start.setHours(0, 0, 0, 0);

  const end = fin ? new Date(fin) : new Date(start);
  end.setHours(0, 0, 0, 0);

  const days: TorneoPartidosDayConfig[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    days.push({
      label: formatDayLabel(cursor),
      key: toDateKey(cursor),
      date: new Date(cursor).toISOString(),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function buildParejaNombre(
  jugador1:
    | {
        name: string;
        lastname: string;
      }
    | null
    | undefined,
  jugador2:
    | {
        name: string;
        lastname: string;
      }
    | null
    | undefined,
) {
  const p1 = jugador1 ? `${jugador1.name} ${jugador1.lastname}` : "Jugador 1";
  const p2 = jugador2 ? `${jugador2.name} ${jugador2.lastname}` : "Jugador 2";
  return `${p1} / ${p2}`;
}

function parseTime(value: string) {
  const [hourRaw, minuteRaw] = value.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    throw new Error("El horario debe tener formato HH:mm");
  }

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error("El horario debe estar entre 00:00 y 23:59");
  }

  return { hour, minute };
}

function parseTimeToMinutes(value: string) {
  if (value === "24:00") {
    return 1440;
  }

  const { hour, minute } = parseTime(value);
  return hour * 60 + minute;
}

function minutesToTime(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${`${hour}`.padStart(2, "0")}:${`${minute}`.padStart(2, "0")}`;
}

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

function normalizeGroupLetter(nombre: string, fallbackIndex: number) {
  const match = nombre.match(/zona\s+([A-Z])/i);
  return (match?.[1] ?? groupLetter(fallbackIndex)).toUpperCase();
}

function llaveValue(phase: "DF" | "OF" | "CF" | "SF" | "F", index: number) {
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

function buildEliminationMatches(
  groups: Array<{ id: number; nombre: string; parejas: unknown[] }>,
) {
  const qualifiers = groups.flatMap((group, index) => {
    const letter = normalizeGroupLetter(group.nombre, index);
    return [`1${letter}`, `2${letter}`];
  });

  if (qualifiers.length < 4) {
    return [];
  }

  const bracketSize =
    qualifiers.length > 16 ? 32 : qualifiers.length > 8 ? 16 : qualifiers.length > 4 ? 8 : 4;
  const seeded = [...qualifiers.slice(0, bracketSize)];
  while (seeded.length < bracketSize) {
    seeded.push("Bye");
  }

  const phases: Array<"DF" | "OF" | "CF" | "SF" | "F"> =
    bracketSize === 32
      ? ["DF", "OF", "CF", "SF", "F"]
      : bracketSize === 16
        ? ["OF", "CF", "SF", "F"]
        : bracketSize === 8
          ? ["CF", "SF", "F"]
          : ["SF", "F"];

  const matches: Array<{
    key: string;
    grupoId: null;
    grupoNombre: null;
    phase: "DF" | "OF" | "CF" | "SF" | "F";
    llave: string;
    pareja1Id: null;
    pareja2Id: null;
    pareja1Letra: string | null;
    pareja2Letra: string | null;
    pareja1Nombre: string;
    pareja2Nombre: string;
    restrictions: string[];
  }> = [];

  let currentEntrants = seeded;
  for (const phase of phases) {
    const nextEntrants: string[] = [];
    for (let index = 0; index < currentEntrants.length; index += 2) {
      const matchNumber = index / 2 + 1;
      const left = currentEntrants[index] ?? null;
      const right = currentEntrants[index + 1] ?? null;

      if (left && right && left !== "Bye" && right !== "Bye") {
        matches.push({
          key: `${phase}-${matchNumber}`,
          grupoId: null,
          grupoNombre: null,
          phase,
          llave: llaveValue(phase, matchNumber),
          pareja1Id: null,
          pareja2Id: null,
          pareja1Letra: left,
          pareja2Letra: right,
          pareja1Nombre: left,
          pareja2Nombre: right,
          restrictions: [],
        });
      }

      nextEntrants.push(`${phase}${matchNumber}`);
    }
    currentEntrants = nextEntrants;
  }

  return matches;
}

function buildRoundRobinPairings(parejaIds: number[]) {
  if (parejaIds.length < 2) {
    return [];
  }

  const players: Array<number | null> =
    parejaIds.length % 2 === 0 ? [...parejaIds] : [...parejaIds, null];
  const rounds = players.length - 1;
  const pairings: Array<{ pareja1Id: number; pareja2Id: number }> = [];

  for (let round = 0; round < rounds; round += 1) {
    for (let index = 0; index < Math.floor(players.length / 2); index += 1) {
      const first = players[index];
      const second = players[players.length - 1 - index];

      if (first === null || second === null) {
        continue;
      }

      pairings.push({ pareja1Id: first, pareja2Id: second });
    }

    const moving = players.pop();
    if (moving === undefined) {
      break;
    }
    players.splice(1, 0, moving);
  }

  return pairings;
}

function parseRestriction(value: string | null, day: TorneoPartidosDayConfig) {
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
  day: TorneoPartidosDayConfig,
  startMin: number,
) {
  return restrictions.some((restriction) => {
    const parsed = parseRestriction(restriction, day);
    return parsed && startMin >= parsed.startMin && startMin < parsed.endMin;
  });
}

async function ensureTorneoAccess(
  complejoId: number,
  eventoId: number,
  torneoId: number,
) {
  await ensureComplejoManagerAccess(complejoId);

  const torneo = await prisma.torneo.findFirst({
    where: {
      id: torneoId,
      eventoId,
      deletedAt: null,
      evento: {
        complejoId,
        deletedAt: null,
      },
    },
    select: {
      id: true,
      nombre: true,
      inicio: true,
      fin: true,
      partidosGenerados: true,
      evento: {
        select: {
          nombre: true,
        },
      },
    },
  });

  if (!torneo) {
    throw new Error("Torneo no encontrado");
  }

  return torneo;
}

export async function getTorneoPartidosSetupData(
  complejoId: number,
  eventoId: number,
  torneoId: number,
): Promise<TorneoPartidosSetupData> {
  const torneo = await ensureTorneoAccess(complejoId, eventoId, torneoId);

  const [grupos, canchas, partidoCount] = await Promise.all([
    prisma.grupo.findMany({
      where: { torneoId },
      orderBy: [{ nombre: "asc" }, { id: "asc" }],
      select: {
        id: true,
        nombre: true,
        _count: {
          select: { parejas: true },
        },
      },
    }),
    prisma.cancha.findMany({
      where: {
        complejoId,
        deletedAt: null,
        isActive: true,
      },
      orderBy: [{ numero: "asc" }, { id: "asc" }],
      select: {
        id: true,
        numero: true,
        name: true,
      },
    }),
    prisma.partido.count({
      where: { torneoId, deletedAt: null },
    }),
  ]);

  return {
    torneo: {
      id: torneo.id,
      nombre: torneo.nombre,
      eventoNombre: torneo.evento.nombre,
      inicio: torneo.inicio ? torneo.inicio.toISOString() : null,
      fin: torneo.fin ? torneo.fin.toISOString() : null,
      days: buildTournamentDays(torneo.inicio, torneo.fin),
      partidosGenerados: torneo.partidosGenerados,
      partidoCount,
    },
    grupos: grupos.map((grupo) => ({
      id: grupo.id,
      nombre: grupo.nombre,
      parejaCount: grupo._count.parejas,
    })),
    canchas: canchas.map((cancha) => ({
      id: cancha.id,
      numero: cancha.numero,
      name: cancha.name,
      label: `Cancha ${cancha.numero}${cancha.name ? ` - ${cancha.name}` : ""}`,
    })),
  };
}

async function buildTorneoPartidosPreview(
  complejoId: number,
  eventoId: number,
  torneoId: number,
  payload: SaveTorneoPartidosPayload,
) {
  const torneo = await ensureTorneoAccess(complejoId, eventoId, torneoId);

  const grupos = await prisma.grupo.findMany({
    where: { torneoId },
    orderBy: [{ nombre: "asc" }, { id: "asc" }],
    select: {
      id: true,
      nombre: true,
      parejas: {
        orderBy: [{ seed: "asc" }, { id: "asc" }],
        select: {
          parejaId: true,
          pareja: {
            select: {
              restriccion: true,
              jugador1: {
                select: {
                  name: true,
                  lastname: true,
                },
              },
              jugador2: {
                select: {
                  name: true,
                  lastname: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (grupos.length === 0) {
    throw new Error("Debes crear zonas antes de generar partidos");
  }

  const selectedCanchas = (payload.canchas ?? []).filter(
    (item) => item.selected,
  );

  if (selectedCanchas.length === 0) {
    throw new Error("Debes seleccionar al menos una cancha");
  }

  const durationMin = Number(payload.durationMin);
  if (!Number.isInteger(durationMin) || durationMin < 30 || durationMin > 180) {
    throw new Error("La duracion debe estar entre 30 y 180 minutos");
  }

  const gapMultiplier = Number(payload.gapMultiplier);
  if (!Number.isFinite(gapMultiplier) || gapMultiplier < 0 || gapMultiplier > 3) {
    throw new Error("El descanso entre partidos debe estar entre 0x y 3x");
  }

  const days = buildTournamentDays(torneo.inicio, torneo.fin);
  if (days.length === 0) {
    throw new Error("El torneo debe tener un rango de fechas valido");
  }

  for (const config of selectedCanchas) {
    if (config.dayWindows.length !== days.length) {
      throw new Error("Cada cancha debe tener un horario para cada dia del torneo");
    }

    for (const dayWindow of config.dayWindows) {
      if (!dayWindow.start || !dayWindow.end) {
        throw new Error("Debes completar el rango horario de cada dia");
      }

      const startInfo = parseTime(dayWindow.start);
      const endInfo = parseTime(dayWindow.end);

      if (
        startInfo.hour > endInfo.hour ||
        (startInfo.hour === endInfo.hour && startInfo.minute >= endInfo.minute)
      ) {
        throw new Error("El horario de inicio debe ser anterior al horario de fin");
      }
    }
  }

  const canchaIds = selectedCanchas.map((config) => config.canchaId);
  const validCanchas = await prisma.cancha.findMany({
    where: {
      id: { in: canchaIds },
      complejoId,
      deletedAt: null,
      isActive: true,
    },
    select: { id: true },
  });

  if (validCanchas.length !== canchaIds.length) {
    throw new Error("Hay canchas invalidas en la seleccion");
  }

  const canchaLabels = new Map(
    (
      await prisma.cancha.findMany({
        where: { id: { in: canchaIds } },
        select: { id: true, numero: true, name: true },
      })
    ).map((cancha) => [
      cancha.id,
      `Cancha ${cancha.numero}${cancha.name ? ` - ${cancha.name}` : ""}`,
    ]),
  );

  const pairNames = new Map<number, string>();
  const pairRestrictions = new Map<number, string | null>();
  const pairingsByGrupo: Array<{
    key: string;
    grupoId: number | null;
    grupoNombre: string | null;
    phase: "ZONA" | "DF" | "OF" | "CF" | "SF" | "F";
    llave: string | null;
    pareja1Id: number | null;
    pareja2Id: number | null;
    pareja1Letra: string | null;
    pareja2Letra: string | null;
    pareja1Nombre: string;
    pareja2Nombre: string;
    restrictions: string[];
  }> = [];

  for (const grupo of grupos) {
    const parejaIds = grupo.parejas.map((link) => {
      pairNames.set(
        link.parejaId,
        buildParejaNombre(link.pareja.jugador1, link.pareja.jugador2),
      );
      pairRestrictions.set(link.parejaId, link.pareja.restriccion);
      return link.parejaId;
    });

    if (parejaIds.length < 2) {
      continue;
    }

    const pairings = buildRoundRobinPairings(parejaIds);
    for (const [index, pairing] of pairings.entries()) {
      pairingsByGrupo.push({
        key: `${grupo.id}-${pairing.pareja1Id}-${pairing.pareja2Id}-${index}`,
        grupoId: grupo.id,
        grupoNombre: grupo.nombre,
        phase: "ZONA",
        llave: null,
        pareja1Id: pairing.pareja1Id,
        pareja2Id: pairing.pareja2Id,
        pareja1Letra: null,
        pareja2Letra: null,
        pareja1Nombre: pairNames.get(pairing.pareja1Id) ?? "Pareja 1",
        pareja2Nombre: pairNames.get(pairing.pareja2Id) ?? "Pareja 2",
        restrictions: [
          pairRestrictions.get(pairing.pareja1Id) ?? null,
          pairRestrictions.get(pairing.pareja2Id) ?? null,
        ].filter((item): item is string => Boolean(item)),
      });
    }
  }

  if (pairingsByGrupo.length === 0) {
    throw new Error("No hay partidos para generar con las zonas actuales");
  }

  const eliminationMatches = buildEliminationMatches(grupos);

  type ScheduledMatch = (typeof pairingsByGrupo)[number] & {
    phase: "ZONA" | "DF" | "OF" | "CF" | "SF" | "F";
    llave: string | null;
    pareja1Letra: string | null;
    pareja2Letra: string | null;
  };

  const slots: Array<{
    canchaId: number;
    day: TorneoPartidosDayConfig;
    dayIndex: number;
    startMin: number;
    endMin: number;
    scheduledAt: Date;
    match?: ScheduledMatch;
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
        (dayIndex === 1 || (dayIndex === 0 && payload.allowExtraFirstDay));

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

  const usageByPair = new Map<
    number,
    Array<{ dayKey: string; startMin: number; endMin: number }>
  >();
  const minGap = Math.ceil(durationMin * gapMultiplier);
  const orderedMatches = shuffleWithSeed(pairingsByGrupo, payload.shuffleSeed);
  const restrictedMatches = orderedMatches.filter(
    (match) => match.restrictions.length > 0,
  );
  const unrestrictedMatches = orderedMatches.filter(
    (match) => match.restrictions.length === 0,
  );
  const unassigned: TorneoPartidosUnassignedMatch[] = [];

  const hasPairConflict = (
    pairId: number | null,
    slot: (typeof slots)[number],
    restricted: boolean,
  ) => {
    if (pairId === null) return false;
    const played = usageByPair.get(pairId) ?? [];
    if (slot.dayIndex === 0 && played.some((item) => item.dayKey === slot.day.key)) {
      return true;
    }

    const gap = restricted ? minGap * 2 : minGap;
    return played.some(
      (item) =>
        item.dayKey === slot.day.key && slot.startMin < item.endMin + gap,
    );
  };

  const assignMatch = (match: (typeof pairingsByGrupo)[number]) => {
    const restricted = match.restrictions.length > 0;

    for (const slot of slots) {
      if (slot.match) {
        continue;
      }

      if (isRestrictedAt(match.restrictions, slot.day, slot.startMin)) {
        continue;
      }

      if (
        hasPairConflict(match.pareja1Id, slot, restricted) ||
        hasPairConflict(match.pareja2Id, slot, restricted)
      ) {
        continue;
      }

      slot.match = match;
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
      return true;
    }

    return false;
  };

  for (const match of [...restrictedMatches, ...unrestrictedMatches]) {
    if (!assignMatch(match)) {
      unassigned.push({
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
      });
    }
  }

  if (eliminationMatches.length > 0) {
    const phaseOrder: Array<"DF" | "OF" | "CF" | "SF" | "F"> = [
      "DF",
      "OF",
      "CF",
      "SF",
      "F",
    ];

    const eliminationByPhase: Record<
      string,
      typeof eliminationMatches
    > = {
      DF: [],
      OF: [],
      CF: [],
      SF: [],
      F: [],
    };

    for (const match of eliminationMatches) {
      eliminationByPhase[match.phase].push(match);
    }

    const lastGroupEnd = slots
      .filter((slot) => slot.match?.phase === "ZONA")
      .reduce((max, slot) => {
        const end = slot.dayIndex * 1440 + slot.endMin;
        return Math.max(max, end);
      }, 0);

    const lastPhaseEnd: Record<string, number> = {
      DF: 0,
      OF: 0,
      CF: 0,
      SF: 0,
      F: 0,
    };

    const phaseGap = minGap;

    for (const phase of phaseOrder) {
      const requiredStart =
        phase === "DF" ? lastGroupEnd + phaseGap : lastPhaseEnd[phaseOrder[phaseOrder.indexOf(phase) - 1]] + phaseGap;
      for (const match of eliminationByPhase[phase]) {
        let assigned = false;
        for (const slot of slots) {
          if (slot.match) continue;

          const absStart = slot.dayIndex * 1440 + slot.startMin;
          if (absStart < requiredStart) continue;

          if (isRestrictedAt(match.restrictions, slot.day, slot.startMin)) continue;

          const conflict = [match.pareja1Id, match.pareja2Id].some(
            (pairId) => pairId !== null && hasPairConflict(pairId, slot, false),
          );
          if (conflict) continue;

          slot.match = match;
          if (match.pareja1Id !== null) {
            const played = usageByPair.get(match.pareja1Id) ?? [];
            played.push({
              dayKey: slot.day.key,
              startMin: slot.startMin,
              endMin: slot.endMin,
            });
            usageByPair.set(match.pareja1Id, played);
          }
          if (match.pareja2Id !== null) {
            const played = usageByPair.get(match.pareja2Id) ?? [];
            played.push({
              dayKey: slot.day.key,
              startMin: slot.startMin,
              endMin: slot.endMin,
            });
            usageByPair.set(match.pareja2Id, played);
          }

          lastPhaseEnd[phase] = Math.max(
            lastPhaseEnd[phase],
            slot.dayIndex * 1440 + slot.endMin,
          );
          assigned = true;
          break;
        }

        if (!assigned) {
          unassigned.push({
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
          });
        }
      }
    }
  }

  const matches = slots
    .filter((slot) => slot.match)
    .map((slot) => {
      const match = slot.match!;
      return {
        key: match.key,
        torneoId,
        grupoId: match.grupoId,
        grupoNombre: match.grupoNombre,
        phase: match.phase,
        llave: match.llave,
        canchaId: slot.canchaId,
        canchaLabel: canchaLabels.get(slot.canchaId) ?? `Cancha ${slot.canchaId}`,
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
    unassigned,
    slotsDisponibles: slots.length,
    slotsOcupados: matches.length,
  };
}

export async function generateTorneoPartidosPreview(
  complejoId: number,
  eventoId: number,
  torneoId: number,
  payload: SaveTorneoPartidosPayload,
): Promise<TorneoPartidosPreview> {
  return buildTorneoPartidosPreview(complejoId, eventoId, torneoId, payload);
}

export async function saveTorneoPartidosSetup(
  complejoId: number,
  eventoId: number,
  torneoId: number,
  payload: SaveTorneoPartidosPayload,
) {
  const torneo = await ensureTorneoAccess(complejoId, eventoId, torneoId);
  const preview = await buildTorneoPartidosPreview(
    complejoId,
    eventoId,
    torneoId,
    payload,
  );

  if (preview.unassigned.length > 0) {
    throw new Error("Hay partidos sin horario. Revisa las canchas y los horarios");
  }

  await prisma.$transaction(async (tx) => {
    await tx.partido.deleteMany({
      where: {
        torneoId,
        deletedAt: null,
      },
    });

    for (const match of preview.matches) {
      await tx.partido.create({
        data: {
          torneoId,
          grupoId: match.grupoId,
          canchaId: match.canchaId,
          scheduledAt: new Date(match.scheduledAt),
          status: "SCHEDULED",
          pareja1Id: match.pareja1Id,
          pareja2Id: match.pareja2Id,
        },
      });
    }

    await tx.torneo.update({
      where: { id: torneo.id },
      data: {
        partidosGenerados: true,
      },
    });
  });

  return {
    success: true,
    partidosGenerados: preview.matches.length,
  };
}
