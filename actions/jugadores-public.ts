"use server";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { esLlaveFinal } from "@/lib/ranking-puntajes";
import { computeMatchSetStats } from "@/lib/torneo-posiciones";

export type JugadorPublico = {
  id: number;
  nombre: string;
  apellido: string;
  categoria: string | null;
  genero: "M" | "F" | "X";
  provincia: string | null;
  localidad: string | null;
  avatarUrl: string | null;
};

export type JugadorPublicoStats = {
  partidosGanados: number;
  partidosPerdidos: number;
  setGanados: number;
  setPerdidos: number;
  gameGanados: number;
  gamePerdidos: number;
};

export type JugadorPublicoPartido = {
  partidoId: number;
  /** Nombre de la fase ("Cuartos 3") o de la zona ("Zona A"). */
  instancia: string;
  rivalNombre: string;
  /** Sets ya vistos desde el lado del jugador, por ejemplo ["6-4", "7-5"]. */
  sets: string[];
  gano: boolean;
  walkover: boolean;
  fecha: string | null;
};

export type JugadorPublicoTorneo = {
  torneoId: number;
  torneoNombre: string;
  categoriaCode: string;
  eventoNombre: string;
  eventoTipo: "FINDE" | "SEMANAL";
  complejoNombre: string;
  inicio: string | null;
  finalizado: boolean;
  parejaId: number;
  companeroNombre: string;
  companeroId: number;
  esCampeon: boolean;
  stats: JugadorPublicoStats;
  partidos: JugadorPublicoPartido[];
};

export type JugadorPublicoResumen = JugadorPublicoStats & {
  partidosJugados: number;
  torneos: number;
  campeonatos: number;
};

export type JugadorPublicoPerfil = {
  jugador: JugadorPublico;
  resumen: JugadorPublicoResumen;
  torneos: JugadorPublicoTorneo[];
};

export type ComparativaPorTipo = {
  torneos: number;
  titulos: number;
};

export type ComparativaJugador = {
  jugador: JugadorPublico;
  resumen: JugadorPublicoResumen;
  /** Torneos y titulos separados por tipo de evento. */
  porTipo: Record<"FINDE" | "SEMANAL", ComparativaPorTipo>;
  /** Partidos ganados sobre jugados, 0-100. null si todavia no jugo ninguno. */
  porcentajeVictorias: number | null;
};

export type CruceEntreJugadores = {
  partidoId: number;
  torneoId: number;
  torneoNombre: string;
  /** Nombre de la fase ("Cuartos 3") o de la zona ("Zona A"). */
  instancia: string;
  fecha: string | null;
  /** Sets vistos desde el lado del jugador A, por ejemplo ["6-4", "7-5"]. */
  sets: string[];
  ganoA: boolean;
  walkover: boolean;
};

export type HeadToHeadJugadores = {
  ganadosA: number;
  ganadosB: number;
  cruces: CruceEntreJugadores[];
};

/**
 * Mismo criterio de visibilidad que usa actions/torneos-public.ts: el torneo tiene
 * que estar publicado, dentro de un evento visible de un complejo activo. A
 * diferencia de las otras vistas publicas aca si entran los FINISHED, que son
 * justamente los que tienen estadisticas.
 */
const TORNEO_VISIBLE_WHERE: Prisma.TorneoWhereInput = {
  deletedAt: null,
  publicado: true,
  status: { in: ["PUBLISHED", "IN_PROGRESS", "FINISHED"] },
  evento: {
    deletedAt: null,
    isVisible: true,
    complejo: { deletedAt: null, isActive: true },
  },
};

const SELECT_JUGADOR = {
  id: true,
  name: true,
  lastname: true,
} satisfies Prisma.UserSelect;

function nombreJugador(
  user: { name: string; lastname: string } | null | undefined,
) {
  if (!user) return "A definir";
  return `${user.name} ${user.lastname}`.trim() || "A definir";
}

function statsVacias(): JugadorPublicoStats {
  return {
    partidosGanados: 0,
    partidosPerdidos: 0,
    setGanados: 0,
    setPerdidos: 0,
    gameGanados: 0,
    gamePerdidos: 0,
  };
}

/**
 * Estadisticas de una pareja derivadas de sus partidos.
 *
 * Se usa para los torneos que todavia no terminaron: los contadores de Pareja se
 * escriben al finalizar, asi que hasta entonces estan en cero y mostrarlos seria
 * mentir. Usa la misma primitiva que lib/torneo-estadisticas.ts, que es la que
 * escribe esos contadores, asi que las dos ramas coinciden.
 */
function statsDerivadas(
  parejaId: number,
  partidos: Array<{
    pareja1Id: number | null;
    pareja2Id: number | null;
    ganadorId: number | null;
    sets: Array<{ gamesPareja1: number; gamesPareja2: number }>;
  }>,
): JugadorPublicoStats {
  const stats = statsVacias();

  for (const partido of partidos) {
    const esPareja1 = partido.pareja1Id === parejaId;
    const { setWinsP1, setWinsP2, gamesP1, gamesP2 } = computeMatchSetStats(
      partido.sets,
    );

    stats.setGanados += esPareja1 ? setWinsP1 : setWinsP2;
    stats.setPerdidos += esPareja1 ? setWinsP2 : setWinsP1;
    stats.gameGanados += esPareja1 ? gamesP1 : gamesP2;
    stats.gamePerdidos += esPareja1 ? gamesP2 : gamesP1;

    if (partido.ganadorId === parejaId) {
      stats.partidosGanados += 1;
    } else if (partido.ganadorId !== null) {
      stats.partidosPerdidos += 1;
    }
  }

  return stats;
}

export async function getPerfilPublicoJugador(
  jugadorId: number,
): Promise<JugadorPublicoPerfil | null> {
  if (!Number.isInteger(jugadorId) || jugadorId <= 0) {
    return null;
  }

  // Solo campos publicos: el DNI, el mail, el telefono y la fecha de nacimiento
  // no se seleccionan para que no puedan llegar al cliente por accidente.
  const user = await prisma.user.findFirst({
    where: { id: jugadorId, deletedAt: null, isActive: true },
    select: {
      id: true,
      name: true,
      lastname: true,
      categoria: true,
      genero: true,
      provincia: true,
      localidad: true,
      avatarUrl: true,
      imageUrl: true,
    },
  });

  if (!user) {
    return null;
  }

  const parejas = await prisma.pareja.findMany({
    where: {
      deletedAt: null,
      OR: [{ player1Id: jugadorId }, { player2Id: jugadorId }],
      torneo: TORNEO_VISIBLE_WHERE,
    },
    select: {
      id: true,
      player1Id: true,
      partidoGanados: true,
      partidoPerdidos: true,
      setGanados: true,
      setPerdidos: true,
      gameGanados: true,
      gamePerdidos: true,
      jugador1: { select: SELECT_JUGADOR },
      jugador2: { select: SELECT_JUGADOR },
      torneo: {
        select: {
          id: true,
          nombre: true,
          categoriaCode: true,
          status: true,
          inicio: true,
          evento: {
            select: {
              nombre: true,
              tipo: true,
              complejo: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  const jugador: JugadorPublico = {
    id: user.id,
    nombre: user.name,
    apellido: user.lastname,
    categoria: user.categoria,
    genero: user.genero,
    provincia: user.provincia,
    localidad: user.localidad,
    avatarUrl: user.avatarUrl || user.imageUrl || null,
  };

  if (parejas.length === 0) {
    return {
      jugador,
      resumen: {
        ...statsVacias(),
        partidosJugados: 0,
        torneos: 0,
        campeonatos: 0,
      },
      torneos: [],
    };
  }

  const parejaIds = parejas.map((pareja) => pareja.id);
  const parejaIdsSet = new Set(parejaIds);

  // Una sola query para los partidos de todas las parejas del jugador.
  const partidos = await prisma.partido.findMany({
    where: {
      deletedAt: null,
      status: { in: ["FINISHED", "WALKOVER"] },
      OR: [{ pareja1Id: { in: parejaIds } }, { pareja2Id: { in: parejaIds } }],
    },
    orderBy: [{ scheduledAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      llave: true,
      scheduledAt: true,
      walkover: true,
      ganadorId: true,
      pareja1Id: true,
      pareja2Id: true,
      grupo: { select: { nombre: true } },
      pareja1: {
        select: {
          jugador1: { select: SELECT_JUGADOR },
          jugador2: { select: SELECT_JUGADOR },
        },
      },
      pareja2: {
        select: {
          jugador1: { select: SELECT_JUGADOR },
          jugador2: { select: SELECT_JUGADOR },
        },
      },
      sets: {
        orderBy: { numero: "asc" },
        select: { gamesPareja1: true, gamesPareja2: true },
      },
    },
  });

  const partidosPorPareja = new Map<number, typeof partidos>();
  for (const partido of partidos) {
    for (const parejaId of [partido.pareja1Id, partido.pareja2Id]) {
      if (parejaId === null || !parejaIdsSet.has(parejaId)) continue;

      const acc = partidosPorPareja.get(parejaId) ?? [];
      acc.push(partido);
      partidosPorPareja.set(parejaId, acc);
    }
  }

  const torneos: JugadorPublicoTorneo[] = parejas.map((pareja) => {
    const propios = partidosPorPareja.get(pareja.id) ?? [];
    const finalizado = pareja.torneo.status === "FINISHED";

    const guardadas: JugadorPublicoStats = {
      partidosGanados: pareja.partidoGanados,
      partidosPerdidos: pareja.partidoPerdidos,
      setGanados: pareja.setGanados,
      setPerdidos: pareja.setPerdidos,
      gameGanados: pareja.gameGanados,
      gamePerdidos: pareja.gamePerdidos,
    };
    const tieneGuardadas = Object.values(guardadas).some((valor) => valor > 0);

    // Torneo terminado: se leen los contadores que dejo el cierre. Si estan todos
    // en cero se derivan igual, porque son de un torneo que se finalizo antes de
    // que existiera ese calculo: mostrar 0-0 al lado de una lista de partidos
    // jugados parece un error de la pagina. Torneo en juego: siempre derivados,
    // que es lo unico que hay hasta que se finalice.
    const stats: JugadorPublicoStats =
      finalizado && tieneGuardadas
        ? guardadas
        : statsDerivadas(pareja.id, propios);

    const companero =
      pareja.player1Id === jugadorId ? pareja.jugador2 : pareja.jugador1;

    const esCampeon = propios.some(
      (partido) =>
        esLlaveFinal(partido.llave) && partido.ganadorId === pareja.id,
    );

    return {
      torneoId: pareja.torneo.id,
      torneoNombre: pareja.torneo.nombre,
      categoriaCode: pareja.torneo.categoriaCode,
      eventoNombre: pareja.torneo.evento.nombre,
      eventoTipo: pareja.torneo.evento.tipo,
      complejoNombre: pareja.torneo.evento.complejo.name,
      inicio: pareja.torneo.inicio?.toISOString() ?? null,
      finalizado,
      parejaId: pareja.id,
      companeroNombre: nombreJugador(companero),
      companeroId: companero?.id ?? 0,
      esCampeon,
      stats,
      partidos: propios.map((partido) => {
        const esPareja1 = partido.pareja1Id === pareja.id;
        const rival = esPareja1 ? partido.pareja2 : partido.pareja1;

        return {
          partidoId: partido.id,
          instancia: partido.llave ?? partido.grupo?.nombre ?? "Zona",
          rivalNombre: rival
            ? `${nombreJugador(rival.jugador1)} / ${nombreJugador(rival.jugador2)}`
            : "A definir",
          sets: partido.sets
            // El form de resultados viejo guardaba siempre tres sets, con el
            // tercero en 0-0 cuando no se jugaba. Mostrarlo haria ver un set
            // que no existio.
            .filter((set) => set.gamesPareja1 > 0 || set.gamesPareja2 > 0)
            // Los games vienen relativos a pareja1/pareja2 del partido: si el
            // jugador es la 2, hay que invertirlos para que se lean a su favor.
            .map((set) =>
              esPareja1
                ? `${set.gamesPareja1}-${set.gamesPareja2}`
                : `${set.gamesPareja2}-${set.gamesPareja1}`,
            ),
          gano: partido.ganadorId === pareja.id,
          walkover: partido.walkover,
          fecha: partido.scheduledAt?.toISOString() ?? null,
        };
      }),
    };
  });

  // Mas nuevos primero: el ultimo torneo jugado es el que interesa ver arriba.
  torneos.sort((a, b) => (b.inicio ?? "").localeCompare(a.inicio ?? ""));

  const resumen = torneos.reduce<JugadorPublicoResumen>(
    (acc, torneo) => ({
      partidosGanados: acc.partidosGanados + torneo.stats.partidosGanados,
      partidosPerdidos: acc.partidosPerdidos + torneo.stats.partidosPerdidos,
      setGanados: acc.setGanados + torneo.stats.setGanados,
      setPerdidos: acc.setPerdidos + torneo.stats.setPerdidos,
      gameGanados: acc.gameGanados + torneo.stats.gameGanados,
      gamePerdidos: acc.gamePerdidos + torneo.stats.gamePerdidos,
      partidosJugados:
        acc.partidosJugados +
        torneo.stats.partidosGanados +
        torneo.stats.partidosPerdidos,
      torneos: acc.torneos + 1,
      campeonatos: acc.campeonatos + (torneo.esCampeon ? 1 : 0),
    }),
    { ...statsVacias(), partidosJugados: 0, torneos: 0, campeonatos: 0 },
  );

  return { jugador, resumen, torneos };
}

// ---------------------------------------------------------------------------
// Comparativa entre dos jugadores
// ---------------------------------------------------------------------------

/**
 * Busca jugadores por nombre o apellido, para el selector de la comparativa.
 *
 * Solo campos publicos, igual que el perfil: el buscador es abierto y no puede
 * ser una via para listar mails o documentos.
 */
export async function buscarJugadoresPublicos(
  termino: string,
): Promise<JugadorPublico[]> {
  const texto = termino.trim();

  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      ...(texto
        ? {
            OR: [
              { name: { contains: texto } },
              { lastname: { contains: texto } },
            ],
          }
        : {}),
    },
    orderBy: [{ lastname: "asc" }, { name: "asc" }],
    take: 25,
    select: {
      id: true,
      name: true,
      lastname: true,
      categoria: true,
      genero: true,
      provincia: true,
      localidad: true,
      avatarUrl: true,
      imageUrl: true,
    },
  });

  return users.map((user) => ({
    id: user.id,
    nombre: user.name,
    apellido: user.lastname,
    categoria: user.categoria,
    genero: user.genero,
    provincia: user.provincia,
    localidad: user.localidad,
    avatarUrl: user.avatarUrl || user.imageUrl || null,
  }));
}

/**
 * Un lado de la comparativa.
 *
 * Se apoya en `getPerfilPublicoJugador` en vez de armar queries propias: asi los
 * numeros del versus son, por construccion, los mismos que muestra la pantalla
 * de estadisticas. Si divergieran, el jugador veria un total en su perfil y otro
 * al compararse.
 */
export async function getComparativaJugador(
  jugadorId: number,
): Promise<ComparativaJugador | null> {
  const perfil = await getPerfilPublicoJugador(jugadorId);
  if (!perfil) return null;

  const porTipo: Record<"FINDE" | "SEMANAL", ComparativaPorTipo> = {
    FINDE: { torneos: 0, titulos: 0 },
    SEMANAL: { torneos: 0, titulos: 0 },
  };

  for (const torneo of perfil.torneos) {
    const fila = porTipo[torneo.eventoTipo];
    fila.torneos += 1;
    if (torneo.esCampeon) fila.titulos += 1;
  }

  const { partidosJugados, partidosGanados } = perfil.resumen;

  return {
    jugador: perfil.jugador,
    resumen: perfil.resumen,
    porTipo,
    porcentajeVictorias:
      partidosJugados > 0
        ? Math.round((partidosGanados / partidosJugados) * 100)
        : null,
  };
}

/** Filtro de "esta pareja incluye a este jugador". */
function parejaConJugador(jugadorId: number): Prisma.ParejaWhereInput {
  return {
    deletedAt: null,
    OR: [{ player1Id: jugadorId }, { player2Id: jugadorId }],
  };
}

/**
 * Los partidos en los que estos dos jugadores se enfrentaron.
 *
 * Enfrentaron, no compartieron: el filtro pide uno en cada pareja, asi que los
 * torneos donde jugaron juntos no cuentan como cruce.
 */
export async function getHeadToHeadJugadores(
  jugadorAId: number,
  jugadorBId: number,
): Promise<HeadToHeadJugadores> {
  const vacio: HeadToHeadJugadores = { ganadosA: 0, ganadosB: 0, cruces: [] };

  if (
    !Number.isInteger(jugadorAId) ||
    !Number.isInteger(jugadorBId) ||
    jugadorAId <= 0 ||
    jugadorBId <= 0 ||
    jugadorAId === jugadorBId
  ) {
    return vacio;
  }

  const partidos = await prisma.partido.findMany({
    where: {
      deletedAt: null,
      status: { in: ["FINISHED", "WALKOVER"] },
      torneo: TORNEO_VISIBLE_WHERE,
      OR: [
        {
          pareja1: parejaConJugador(jugadorAId),
          pareja2: parejaConJugador(jugadorBId),
        },
        {
          pareja1: parejaConJugador(jugadorBId),
          pareja2: parejaConJugador(jugadorAId),
        },
      ],
    },
    orderBy: [{ scheduledAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      llave: true,
      scheduledAt: true,
      walkover: true,
      ganadorId: true,
      pareja1Id: true,
      pareja2Id: true,
      grupo: { select: { nombre: true } },
      torneo: { select: { id: true, nombre: true } },
      pareja1: { select: { player1Id: true, player2Id: true } },
      sets: {
        orderBy: { numero: "asc" },
        select: { gamesPareja1: true, gamesPareja2: true },
      },
    },
  });

  let ganadosA = 0;
  let ganadosB = 0;

  const cruces = partidos.map((partido) => {
    const aEsPareja1 =
      partido.pareja1?.player1Id === jugadorAId ||
      partido.pareja1?.player2Id === jugadorAId;

    const parejaDeA = aEsPareja1 ? partido.pareja1Id : partido.pareja2Id;
    const ganoA = partido.ganadorId !== null && partido.ganadorId === parejaDeA;

    if (partido.ganadorId !== null) {
      if (ganoA) ganadosA += 1;
      else ganadosB += 1;
    }

    return {
      partidoId: partido.id,
      torneoId: partido.torneo.id,
      torneoNombre: partido.torneo.nombre,
      instancia: partido.llave ?? partido.grupo?.nombre ?? "Zona",
      fecha: partido.scheduledAt?.toISOString() ?? null,
      sets: partido.sets
        // El form viejo guardaba siempre tres sets, con el tercero en 0-0
        // cuando no se jugaba. Mismo filtro que usa el perfil.
        .filter((set) => set.gamesPareja1 > 0 || set.gamesPareja2 > 0)
        .map((set) =>
          aEsPareja1
            ? `${set.gamesPareja1}-${set.gamesPareja2}`
            : `${set.gamesPareja2}-${set.gamesPareja1}`,
        ),
      ganoA,
      walkover: partido.walkover,
    };
  });

  return { ganadosA, ganadosB, cruces };
}
