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
  canchas: Array<{
    canchaId: number;
    selected: boolean;
    dayWindows: Array<{
      start: string;
      end: string;
    }>;
  }>;
};

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

function buildRoundRobinPairings(parejaIds: number[]) {
  if (parejaIds.length < 2) {
    return [];
  }

  const players = [...parejaIds];
  const rounds = players.length % 2 === 0 ? players.length - 1 : players.length;
  const pairings: Array<{ pareja1Id: number; pareja2Id: number }> = [];

  for (let round = 0; round < rounds; round += 1) {
    for (let index = 0; index < Math.floor(players.length / 2); index += 1) {
      const first = players[index];
      const second = players[players.length - 1 - index];

      if (first === second) {
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

export async function saveTorneoPartidosSetup(
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
        select: {
          parejaId: true,
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

  const validCanchaIds = new Set(validCanchas.map((cancha) => cancha.id));
  if (validCanchas.length !== canchaIds.length) {
    throw new Error("Hay canchas invalidas en la seleccion");
  }

  const pairingsByGrupo: Array<{
    grupoId: number;
    pareja1Id: number;
    pareja2Id: number;
  }> = [];

  for (const grupo of grupos) {
    const parejaIds = grupo.parejas.map((link) => link.parejaId);
    if (parejaIds.length < 2) {
      continue;
    }

    const pairings = buildRoundRobinPairings(parejaIds);
    for (const pairing of pairings) {
      pairingsByGrupo.push({
        grupoId: grupo.id,
        pareja1Id: pairing.pareja1Id,
        pareja2Id: pairing.pareja2Id,
      });
    }
  }

  if (pairingsByGrupo.length === 0) {
    throw new Error("No hay partidos para generar con las zonas actuales");
  }

  const slots: Array<{ canchaId: number; scheduledAt: Date }> = [];
  for (const config of selectedCanchas) {
    for (const [dayIndex, dayWindow] of config.dayWindows.entries()) {
      const dayDate = new Date(days[dayIndex].date);
      const startInfo = parseTime(dayWindow.start);
      const endInfo = parseTime(dayWindow.end);
      const startAt = new Date(dayDate);
      startAt.setHours(startInfo.hour, startInfo.minute, 0, 0);
      const endAt = new Date(dayDate);
      endAt.setHours(endInfo.hour, endInfo.minute, 0, 0);

      let cursor = new Date(startAt);
      while (cursor.getTime() + 60 * 60 * 1000 <= endAt.getTime()) {
        slots.push({
          canchaId: config.canchaId,
          scheduledAt: new Date(cursor),
        });
        cursor = new Date(cursor.getTime() + 60 * 60 * 1000);
      }
    }
  }

  slots.sort(
    (left, right) =>
      left.scheduledAt.getTime() - right.scheduledAt.getTime() ||
      left.canchaId - right.canchaId,
  );

  if (slots.length < pairingsByGrupo.length) {
    throw new Error("No hay suficientes horarios para generar todos los partidos");
  }

  await prisma.$transaction(async (tx) => {
    await tx.partido.deleteMany({
      where: {
        torneoId,
        deletedAt: null,
      },
    });

    for (const [index, pairing] of pairingsByGrupo.entries()) {
      const slot = slots[index];
      if (!slot) {
        throw new Error("No hay suficientes horarios para generar todos los partidos");
      }

      await tx.partido.create({
        data: {
          torneoId,
          grupoId: pairing.grupoId,
          canchaId: slot.canchaId,
          scheduledAt: slot.scheduledAt,
          pareja1Id: pairing.pareja1Id,
          pareja2Id: pairing.pareja2Id,
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
    partidosGenerados: pairingsByGrupo.length,
  };
}
