"use server";

import type { Prisma } from "@/lib/generated/prisma/client";

import { prisma } from "@/lib/prisma";

export type HomeStats = {
  partidosProgramados: number;
  torneosAbiertos: number;
  jugadoresRegistrados: number;
  clubesActivos: number;
};

export type HomePartidoItem = {
  id: number;
  torneoId: number;
  torneoNombre: string;
  complejoNombre: string;
  canchaLabel: string;
  scheduledAt: string | null;
  status: "PENDING" | "SCHEDULED" | "IN_PROGRESS";
  pareja1Nombre: string;
  pareja2Nombre: string;
};

export type HomeTorneoItem = {
  id: number;
  nombre: string;
  sexo: "MASCULINO" | "FEMENINO" | "MIXTO";
  categoriaRegla: "LIBRE" | "MAYOR_IGUAL" | "MENOR_IGUAL" | "IGUAL" | "SUMA";
  categoriaN: number | null;
  status: "PUBLISHED" | "IN_PROGRESS";
  inicio: string | null;
  complejoNombre: string;
  complejoCiudad: string;
  complejoProvincia: string;
};

export type HomeTorneoInscriptoItem = {
  id: number;
  nombre: string;
  inicio: string | null;
  status: "DRAFT" | "PUBLISHED" | "IN_PROGRESS" | "FINISHED";
  complejoNombre: string;
};

export type HomeSummary = {
  stats: HomeStats;
  proximosPartidos: HomePartidoItem[];
  proximosTorneos: HomeTorneoItem[];
  torneosInscripto: HomeTorneoInscriptoItem[];
};

const PROXIMOS_PARTIDOS_LIMIT = 5;
const PROXIMOS_TORNEOS_LIMIT = 3;

// Un torneo/partido solo es publico si el torneo esta publicado, el evento es
// visible y el complejo sigue activo.
const TORNEO_PUBLICO_WHERE: Prisma.TorneoWhereInput = {
  deletedAt: null,
  publicado: true,
  status: { in: ["PUBLISHED", "IN_PROGRESS"] },
  evento: {
    deletedAt: null,
    isVisible: true,
    complejo: {
      deletedAt: null,
      isActive: true,
    },
  },
};

function buildParejaNombre(
  jugador1: { name: string; lastname: string } | null | undefined,
  jugador2: { name: string; lastname: string } | null | undefined,
) {
  const p1 = jugador1 ? `${jugador1.name} ${jugador1.lastname}` : "A definir";
  const p2 = jugador2 ? `${jugador2.name} ${jugador2.lastname}` : "A definir";
  return `${p1} / ${p2}`;
}

export async function getHomeSummary(userId?: number): Promise<HomeSummary> {
  const now = new Date();

  const partidoProgramadoWhere: Prisma.PartidoWhereInput = {
    deletedAt: null,
    scheduledAt: { gte: now },
    status: { in: ["PENDING", "SCHEDULED", "IN_PROGRESS"] },
    torneo: TORNEO_PUBLICO_WHERE,
  };

  const [
    partidosProgramados,
    torneosAbiertos,
    jugadoresRegistrados,
    clubesActivos,
    partidos,
    torneos,
    inscripciones,
  ] = await Promise.all([
    prisma.partido.count({ where: partidoProgramadoWhere }),
    prisma.torneo.count({ where: TORNEO_PUBLICO_WHERE }),
    prisma.user.count({ where: { deletedAt: null, isActive: true } }),
    prisma.complejo.count({ where: { deletedAt: null, isActive: true } }),
    prisma.partido.findMany({
      where: partidoProgramadoWhere,
      orderBy: [{ scheduledAt: "asc" }, { id: "asc" }],
      take: PROXIMOS_PARTIDOS_LIMIT,
      select: {
        id: true,
        scheduledAt: true,
        status: true,
        cancha: { select: { numero: true, name: true } },
        torneo: {
          select: {
            id: true,
            nombre: true,
            evento: { select: { complejo: { select: { name: true } } } },
          },
        },
        pareja1: {
          select: {
            jugador1: { select: { name: true, lastname: true } },
            jugador2: { select: { name: true, lastname: true } },
          },
        },
        pareja2: {
          select: {
            jugador1: { select: { name: true, lastname: true } },
            jugador2: { select: { name: true, lastname: true } },
          },
        },
      },
    }),
    prisma.torneo.findMany({
      where: TORNEO_PUBLICO_WHERE,
      // MySQL no soporta "nulls last" en Prisma, asi que los torneos sin fecha
      // se ordenan al final en memoria mas abajo.
      orderBy: [{ inicio: "asc" }, { id: "desc" }],
      select: {
        id: true,
        nombre: true,
        sexo: true,
        categoriaRegla: true,
        categoriaN: true,
        status: true,
        inicio: true,
        evento: {
          select: {
            complejo: {
              select: { name: true, ciudad: true, provincia: true },
            },
          },
        },
      },
    }),
    userId
      ? prisma.pareja.findMany({
          where: {
            deletedAt: null,
            OR: [{ player1Id: userId }, { player2Id: userId }],
            torneo: {
              deletedAt: null,
              evento: { deletedAt: null, complejo: { deletedAt: null } },
            },
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          select: {
            torneo: {
              select: {
                id: true,
                nombre: true,
                inicio: true,
                status: true,
                evento: { select: { complejo: { select: { name: true } } } },
              },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  const proximosPartidos: HomePartidoItem[] = partidos.map((partido) => ({
    id: partido.id,
    torneoId: partido.torneo.id,
    torneoNombre: partido.torneo.nombre,
    complejoNombre: partido.torneo.evento.complejo.name,
    canchaLabel: partido.cancha
      ? `Cancha ${partido.cancha.numero}${partido.cancha.name ? ` - ${partido.cancha.name}` : ""}`
      : "Sin cancha",
    scheduledAt: partido.scheduledAt ? partido.scheduledAt.toISOString() : null,
    status: partido.status as HomePartidoItem["status"],
    pareja1Nombre: buildParejaNombre(
      partido.pareja1?.jugador1,
      partido.pareja1?.jugador2,
    ),
    pareja2Nombre: buildParejaNombre(
      partido.pareja2?.jugador1,
      partido.pareja2?.jugador2,
    ),
  }));

  const proximosTorneos: HomeTorneoItem[] = torneos
    .slice()
    .sort((a, b) => {
      if (a.inicio && b.inicio) return a.inicio.getTime() - b.inicio.getTime();
      if (a.inicio) return -1;
      if (b.inicio) return 1;
      return b.id - a.id;
    })
    .slice(0, PROXIMOS_TORNEOS_LIMIT)
    .map((torneo) => ({
      id: torneo.id,
      nombre: torneo.nombre,
      sexo: torneo.sexo,
      categoriaRegla: torneo.categoriaRegla,
      categoriaN: torneo.categoriaN,
      status: torneo.status as HomeTorneoItem["status"],
      inicio: torneo.inicio ? torneo.inicio.toISOString() : null,
      complejoNombre: torneo.evento.complejo.name,
      complejoCiudad: torneo.evento.complejo.ciudad,
      complejoProvincia: torneo.evento.complejo.provincia,
    }));

  const torneosInscripto: HomeTorneoInscriptoItem[] = [];
  for (const pareja of inscripciones) {
    if (torneosInscripto.some((torneo) => torneo.id === pareja.torneo.id)) {
      continue;
    }

    torneosInscripto.push({
      id: pareja.torneo.id,
      nombre: pareja.torneo.nombre,
      inicio: pareja.torneo.inicio
        ? pareja.torneo.inicio.toISOString()
        : null,
      status: pareja.torneo.status as HomeTorneoInscriptoItem["status"],
      complejoNombre: pareja.torneo.evento.complejo.name,
    });

    if (torneosInscripto.length === 8) break;
  }

  return {
    stats: {
      partidosProgramados,
      torneosAbiertos,
      jugadoresRegistrados,
      clubesActivos,
    },
    proximosPartidos,
    proximosTorneos,
    torneosInscripto,
  };
}
