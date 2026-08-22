"use server";

import { prisma } from "@/lib/prisma";
import { ensureComplejoManagerAccess } from "@/lib/complejo-access";
import {
  notifyPartidosCambiados,
  notifyPartidosProgramados,
  notifyResultadoCargado,
  type PartidoCambio,
} from "@/actions/notificaciones-eventos";
import type { FaseLlave } from "@/lib/torneo-llave";
import {
  cerrarZonasYArmarLlaveDeTorneo,
  getEstadoAvance,
  propagarResultado,
} from "@/lib/torneo-avance";
import type {
  CerrarZonasResult,
  EstadoAvanceTorneo,
} from "@/lib/torneo-avance";
import {
  buildGrilla,
  normalizeGroupLetter,
  parseTime,
  type GrillaPareja,
  type GrillaZona,
} from "@/lib/torneo-grilla";

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

/** ZONA cubre tanto el round robin como los especiales de ganadores/perdedores. */
export type TorneoPartidosFase = "ZONA" | FaseLlave;

export type TorneoPartidosPreviewMatch = {
  key: string;
  torneoId: number;
  grupoId: number | null;
  grupoNombre: string | null;
  phase: TorneoPartidosFase;
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
  phase: TorneoPartidosFase;
  llave: string | null;
  pareja1Id: number | null;
  pareja2Id: number | null;
  pareja1Letra: string | null;
  pareja2Letra: string | null;
  pareja1Nombre: string;
  pareja2Nombre: string;
  restricted: boolean;
  /**
   * true cuando el partido no se puede agendar por definicion (cruce de la
   * primera ronda con Bye), en contraposicion a los que no encontraron slot.
   */
  conBye: boolean;
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
  /**
   * Partidos de zona que no entraron en la grilla. Es un fallo real de
   * scheduling y bloquea el guardado: hay que ampliar dias, canchas u horarios.
   */
  unassignedZona: TorneoPartidosUnassignedMatch[];
  /**
   * Partidos de llave sin horario. Se guardan igual, con scheduledAt y cancha en
   * null, para que el cuadro completo exista y se pueda agendar despues.
   */
  unassignedLlave: TorneoPartidosUnassignedMatch[];
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

  // Cargar un resultado desbloquea otros partidos: los especiales de la zona si
  // es de 4, o el partido siguiente de la llave. Sin esto el torneo no avanza.
  await propagarResultado(torneoId, partidoId);

  await notifyResultadoCargado(partidoId);

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

  const parejas = new Map<number, GrillaPareja>();
  const zonasGrilla: GrillaZona[] = grupos.map((grupo, index) => ({
    grupoId: grupo.id,
    nombre: grupo.nombre,
    letra: normalizeGroupLetter(grupo.nombre, index),
    parejaIdPorSiembra: grupo.parejas.map((link) => {
      parejas.set(link.parejaId, {
        nombre: buildParejaNombre(link.pareja.jugador1, link.pareja.jugador2),
        restriccion: link.pareja.restriccion,
      });
      return link.parejaId;
    }),
  }));

  const grilla = buildGrilla({
    zonas: zonasGrilla,
    parejas,
    days,
    canchas: selectedCanchas.map((config) => ({
      canchaId: config.canchaId,
      label: canchaLabels.get(config.canchaId) ?? `Cancha ${config.canchaId}`,
      dayWindows: config.dayWindows,
    })),
    durationMin,
    gapMultiplier,
    shuffleSeed: payload.shuffleSeed,
    allowExtraFirstDay: payload.allowExtraFirstDay,
  });

  return {
    ...grilla,
    matches: grilla.matches.map((match) => ({ ...match, torneoId })),
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

  // Solo las zonas bloquean: un partido de zona sin horario es un fallo real de
  // grilla. Los de llave que no entraron se guardan sin agendar.
  if (preview.unassignedZona.length > 0) {
    throw new Error(
      "Hay partidos de zona sin horario. Revisa las canchas y los horarios",
    );
  }

  // Foto de la grilla previa para detectar que partidos cambiaron de horario o
  // de cancha. Se lee antes de la transaccion, que borra y recrea todo.
  const previos = await prisma.partido.findMany({
    where: { torneoId, deletedAt: null },
    select: {
      pareja1Id: true,
      pareja2Id: true,
      scheduledAt: true,
      canchaId: true,
    },
  });

  const clavePareja = (p1: number | null, p2: number | null) =>
    [p1, p2].filter((id) => id !== null).sort((a, b) => Number(a) - Number(b)).join("-");

  // Los partidos de llave y los especiales de zona no tienen parejas todavia, asi
  // que comparten clave vacia: se excluyen para no compararlos entre si.
  const previosPorPareja = new Map(
    previos
      .filter(
        (partido) => partido.pareja1Id !== null && partido.pareja2Id !== null,
      )
      .map((partido) => [
        clavePareja(partido.pareja1Id, partido.pareja2Id),
        partido,
      ]),
  );

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
          // El calendario de turnos necesita el largo del partido para dibujar
          // el bloque y para detectar solapamientos con las reservas.
          duracionMin: payload.durationMin,
          status: "SCHEDULED",
          pareja1Id: match.pareja1Id,
          pareja2Id: match.pareja2Id,
          // Sin llave ni letras los partidos de la llave quedan indistinguibles:
          // la vista publica no puede armar el cuadro y el ranking no reparte
          // puntos de fase.
          llave: match.llave,
          pareja1Letra: match.pareja1Letra,
          pareja2Letra: match.pareja2Letra,
        },
      });
    }

    // El cuadro completo tiene que existir aunque no haya entrado en la grilla:
    // se crean los cruces restantes sin horario ni cancha para poder agendarlos
    // despues a mano.
    for (const match of preview.unassignedLlave) {
      await tx.partido.create({
        data: {
          torneoId,
          grupoId: match.grupoId,
          canchaId: null,
          scheduledAt: null,
          status: "PENDING",
          pareja1Id: match.pareja1Id,
          pareja2Id: match.pareja2Id,
          llave: match.llave,
          pareja1Letra: match.pareja1Letra,
          pareja2Letra: match.pareja2Letra,
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

  // Las notificaciones se disparan con la transaccion ya commiteada: un fallo
  // acá no puede revertir la grilla recien guardada.
  const cambios = await buildCambiosDeGrilla(torneoId, previosPorPareja, clavePareja);

  await notifyPartidosProgramados(torneoId);
  await notifyPartidosCambiados(torneoId, cambios);

  return {
    success: true,
    partidosGenerados: preview.matches.length + preview.unassignedLlave.length,
    partidosAgendados: preview.matches.length,
    partidosSinAgendar: preview.unassignedLlave.length,
  };
}

/**
 * Compara la grilla nueva contra la previa y arma el detalle de los partidos
 * que ya existian y cambiaron de horario o de cancha.
 */
async function buildCambiosDeGrilla(
  torneoId: number,
  previosPorPareja: Map<
    string,
    { scheduledAt: Date | null; canchaId: number | null }
  >,
  clavePareja: (p1: number | null, p2: number | null) => string,
): Promise<PartidoCambio[]> {
  if (previosPorPareja.size === 0) return [];

  const actuales = await prisma.partido.findMany({
    where: { torneoId, deletedAt: null },
    select: {
      id: true,
      scheduledAt: true,
      canchaId: true,
      pareja1Id: true,
      pareja2Id: true,
      pareja1: { select: { player1Id: true, player2Id: true } },
      pareja2: { select: { player1Id: true, player2Id: true } },
    },
  });

  const cambios: PartidoCambio[] = [];

  for (const partido of actuales) {
    const previo = previosPorPareja.get(
      clavePareja(partido.pareja1Id, partido.pareja2Id),
    );
    if (!previo) continue;

    const cambioHorario =
      previo.scheduledAt?.getTime() !== partido.scheduledAt?.getTime();
    const cambioCancha = previo.canchaId !== partido.canchaId;

    if (!cambioHorario && !cambioCancha) continue;

    const detalles: string[] = [];
    if (cambioHorario) detalles.push("cambio el horario");
    if (cambioCancha) detalles.push("cambio la cancha");

    const jugadores = [
      partido.pareja1?.player1Id,
      partido.pareja1?.player2Id,
      partido.pareja2?.player1Id,
      partido.pareja2?.player2Id,
    ].filter((id): id is number => typeof id === "number");

    if (jugadores.length === 0) continue;

    cambios.push({
      partidoId: partido.id,
      jugadores,
      detalle: detalles.join(" y "),
    });
  }

  return cambios;
}

// ---------------------------------------------------------------------------
// Avance del torneo. La logica vive en lib/torneo-avance.ts; aca solo se
// verifica el permiso y se delega.
// ---------------------------------------------------------------------------

/** Lo que necesita la UI para dibujar el panel de avance. */
export async function getEstadoAvanceTorneo(
  complejoId: number,
  eventoId: number,
  torneoId: number,
): Promise<EstadoAvanceTorneo | null> {
  await ensureTorneoAccess(complejoId, eventoId, torneoId);
  return getEstadoAvance(torneoId);
}

/**
 * Cierra la fase de zonas y arma la llave: resuelve las letras de la primera
 * ronda ("1A", "2B", "3A") a parejas reales, hace avanzar los Byes y deja el
 * torneo en juego.
 */
export async function cerrarZonasYArmarLlave(
  complejoId: number,
  eventoId: number,
  torneoId: number,
): Promise<CerrarZonasResult> {
  await ensureTorneoAccess(complejoId, eventoId, torneoId);
  return cerrarZonasYArmarLlaveDeTorneo(torneoId);
}
