"use server";

import type { Prisma } from "@/lib/generated/prisma/client";

import { prisma } from "@/lib/prisma";

export type PublicComplejoDetail = {
  id: number;
  name: string;
  slug: string;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  ciudad: string;
  provincia: string;
  pais: string;
  timezone: string;
  canchasCount: number;
  eventosCount: number;
  jugadoresCount: number;
};

export type PublicComplejoTorneo = {
  id: number;
  nombre: string;
  sexo: "MASCULINO" | "FEMENINO" | "MIXTO";
  categoriaRegla: "LIBRE" | "MAYOR_IGUAL" | "MENOR_IGUAL" | "IGUAL" | "SUMA";
  categoriaN: number | null;
  status: "PUBLISHED" | "IN_PROGRESS";
  capacidad: number;
  inscriptos: number;
  inicio: string | null;
};

export type PublicComplejoEvento = {
  id: number;
  nombre: string;
  descripcion: string | null;
  tipo: string;
  inicio: string;
  fin: string;
  isOpen: boolean;
  isFinished: boolean;
  torneos: PublicComplejoTorneo[];
};

export type PublicComplejoJugador = {
  id: number;
  nombre: string;
  categoria: string | null;
  observado: boolean;
};

export type PublicComplejoPartido = {
  id: number;
  torneoId: number;
  torneoNombre: string;
  canchaLabel: string;
  scheduledAt: string | null;
  status: "PENDING" | "SCHEDULED" | "IN_PROGRESS" | "FINISHED" | "WALKOVER";
  walkover: boolean;
  pareja1Nombre: string;
  pareja2Nombre: string;
  resultado: string | null;
};

export type PublicComplejoCalendario = {
  proximos: PublicComplejoPartido[];
  ultimos: PublicComplejoPartido[];
};

export type PublicComplejoRankingRow = {
  jugadorId: number;
  nombre: string;
  categoria: string | null;
  puntos: number;
  torneos: number;
};

export type PublicComplejoRecategorizacion = {
  id: number;
  fecha: string;
  jugadorNombre: string;
  nivelPrevio: string;
  nivelNuevo: string;
};

const PROXIMOS_LIMIT = 30;
const ULTIMOS_LIMIT = 20;
const RANKING_LIMIT = 50;
const RECATEGORIZACIONES_LIMIT = 50;

// Mismo criterio de visibilidad publica que listPublicTorneos: el complejo debe
// estar activo, el evento visible y el torneo publicado.
const COMPLEJO_PUBLICO_WHERE: Prisma.ComplejoWhereInput = {
  deletedAt: null,
  isActive: true,
};

const TORNEO_PUBLICO_WHERE: Prisma.TorneoWhereInput = {
  deletedAt: null,
  publicado: true,
  status: { in: ["PUBLISHED", "IN_PROGRESS"] },
  evento: {
    deletedAt: null,
    isVisible: true,
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

function buildCanchaLabel(
  cancha: { numero: number; name: string | null } | null | undefined,
) {
  if (!cancha) return "Sin cancha";
  return `Cancha ${cancha.numero}${cancha.name ? ` - ${cancha.name}` : ""}`;
}

function buildResultado(
  sets: { numero: number; gamesPareja1: number; gamesPareja2: number }[],
) {
  if (sets.length === 0) return null;

  return sets
    .slice()
    .sort((a, b) => a.numero - b.numero)
    .map((set) => `${set.gamesPareja1}-${set.gamesPareja2}`)
    .join(" / ");
}

export async function getPublicComplejo(
  complejoId: number,
): Promise<PublicComplejoDetail | null> {
  if (!Number.isInteger(complejoId) || complejoId <= 0) {
    return null;
  }

  const complejo = await prisma.complejo.findFirst({
    where: { ...COMPLEJO_PUBLICO_WHERE, id: complejoId },
    select: {
      id: true,
      name: true,
      slug: true,
      email: true,
      telefono: true,
      direccion: true,
      ciudad: true,
      provincia: true,
      pais: true,
      timezone: true,
      _count: {
        select: {
          canchas: true,
          eventos: true,
          perfilesJugadores: true,
        },
      },
    },
  });

  if (!complejo) {
    return null;
  }

  return {
    id: complejo.id,
    name: complejo.name,
    slug: complejo.slug,
    email: complejo.email,
    telefono: complejo.telefono,
    direccion: complejo.direccion,
    ciudad: complejo.ciudad,
    provincia: complejo.provincia,
    pais: complejo.pais,
    timezone: complejo.timezone,
    canchasCount: complejo._count.canchas,
    eventosCount: complejo._count.eventos,
    jugadoresCount: complejo._count.perfilesJugadores,
  };
}

export async function listPublicComplejoEventos(
  complejoId: number,
): Promise<PublicComplejoEvento[]> {
  const eventos = await prisma.evento.findMany({
    where: {
      complejoId,
      deletedAt: null,
      isVisible: true,
      complejo: COMPLEJO_PUBLICO_WHERE,
    },
    orderBy: [{ inicio: "desc" }],
    select: {
      id: true,
      nombre: true,
      descripcion: true,
      tipo: true,
      inicio: true,
      fin: true,
      isOpen: true,
      isFinished: true,
      torneos: {
        where: {
          deletedAt: null,
          publicado: true,
          status: { in: ["PUBLISHED", "IN_PROGRESS"] },
        },
        orderBy: [{ inicio: "asc" }, { id: "asc" }],
        select: {
          id: true,
          nombre: true,
          sexo: true,
          categoriaRegla: true,
          categoriaN: true,
          status: true,
          capacidad: true,
          inicio: true,
          _count: {
            select: {
              parejas: { where: { deletedAt: null, suplente: false } },
            },
          },
        },
      },
    },
  });

  return eventos.map((evento) => ({
    id: evento.id,
    nombre: evento.nombre,
    descripcion: evento.descripcion,
    tipo: evento.tipo,
    inicio: evento.inicio.toISOString(),
    fin: evento.fin.toISOString(),
    isOpen: evento.isOpen,
    isFinished: evento.isFinished,
    torneos: evento.torneos.map((torneo) => ({
      id: torneo.id,
      nombre: torneo.nombre,
      sexo: torneo.sexo,
      categoriaRegla: torneo.categoriaRegla,
      categoriaN: torneo.categoriaN,
      status: torneo.status as PublicComplejoTorneo["status"],
      capacidad: torneo.capacidad,
      inscriptos: torneo._count.parejas,
      inicio: torneo.inicio ? torneo.inicio.toISOString() : null,
    })),
  }));
}

export async function listPublicComplejoJugadores(
  complejoId: number,
): Promise<PublicComplejoJugador[]> {
  const perfiles = await prisma.perfilJugadorComplejo.findMany({
    where: {
      complejoId,
      isBlocked: false,
      complejo: COMPLEJO_PUBLICO_WHERE,
      user: { deletedAt: null, isActive: true },
    },
    orderBy: [{ user: { lastname: "asc" } }, { user: { name: "asc" } }],
    select: {
      id: true,
      categoria: true,
      observado: true,
      // Solo nombre y apellido: la vista es publica, no exponemos email,
      // telefono, dni ni fecha de nacimiento.
      user: { select: { name: true, lastname: true } },
    },
  });

  return perfiles.map((perfil) => ({
    id: perfil.id,
    nombre: `${perfil.user.name} ${perfil.user.lastname}`,
    categoria: perfil.categoria,
    observado: perfil.observado,
  }));
}

export async function getPublicComplejoCalendario(
  complejoId: number,
): Promise<PublicComplejoCalendario> {
  const now = new Date();

  const partidoSelect = {
    id: true,
    scheduledAt: true,
    status: true,
    walkover: true,
    cancha: { select: { numero: true, name: true } },
    torneo: { select: { id: true, nombre: true } },
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
    sets: {
      select: { numero: true, gamesPareja1: true, gamesPareja2: true },
    },
  } satisfies Prisma.PartidoSelect;

  const baseWhere: Prisma.PartidoWhereInput = {
    deletedAt: null,
    torneo: {
      ...TORNEO_PUBLICO_WHERE,
      evento: {
        ...(TORNEO_PUBLICO_WHERE.evento as Prisma.EventoWhereInput),
        complejoId,
        complejo: COMPLEJO_PUBLICO_WHERE,
      },
    },
  };

  const [proximos, ultimos] = await Promise.all([
    prisma.partido.findMany({
      where: {
        ...baseWhere,
        scheduledAt: { gte: now },
        status: { not: "CANCELLED" },
      },
      orderBy: [{ scheduledAt: "asc" }, { id: "asc" }],
      take: PROXIMOS_LIMIT,
      select: partidoSelect,
    }),
    // Todo lo que ya paso, sin importar si el resultado se cargo o no: hay
    // partidos viejos que siguen en SCHEDULED y igual son parte del historial.
    // Se excluyen los placeholders de llave que nunca tuvieron parejas: en el
    // pasado solo aportarian filas "A definir vs A definir".
    prisma.partido.findMany({
      where: {
        ...baseWhere,
        scheduledAt: { lt: now },
        status: { not: "CANCELLED" },
        pareja1Id: { not: null },
        pareja2Id: { not: null },
      },
      orderBy: [{ scheduledAt: "desc" }, { id: "desc" }],
      take: ULTIMOS_LIMIT,
      select: partidoSelect,
    }),
  ]);

  const toItem = (
    partido: (typeof proximos)[number],
  ): PublicComplejoPartido => ({
    id: partido.id,
    torneoId: partido.torneo.id,
    torneoNombre: partido.torneo.nombre,
    canchaLabel: buildCanchaLabel(partido.cancha),
    scheduledAt: partido.scheduledAt ? partido.scheduledAt.toISOString() : null,
    status: partido.status as PublicComplejoPartido["status"],
    walkover: partido.walkover,
    pareja1Nombre: buildParejaNombre(
      partido.pareja1?.jugador1,
      partido.pareja1?.jugador2,
    ),
    pareja2Nombre: buildParejaNombre(
      partido.pareja2?.jugador1,
      partido.pareja2?.jugador2,
    ),
    resultado: buildResultado(partido.sets),
  });

  return {
    proximos: proximos.map(toItem),
    ultimos: ultimos.map(toItem),
  };
}

export async function getPublicComplejoRanking(
  complejoId: number,
): Promise<PublicComplejoRankingRow[]> {
  const rankings = await prisma.ranking.findMany({
    where: {
      deletedAt: null,
      torneo: {
        ...TORNEO_PUBLICO_WHERE,
        // Los puntos se cargan recien al pasar el torneo a FINISHED, que es
        // justo el estado que TORNEO_PUBLICO_WHERE deja afuera. Sin este
        // override la tabla de ranking siempre sale vacia.
        status: { in: ["PUBLISHED", "IN_PROGRESS", "FINISHED"] },
        evento: {
          ...(TORNEO_PUBLICO_WHERE.evento as Prisma.EventoWhereInput),
          complejoId,
          complejo: COMPLEJO_PUBLICO_WHERE,
        },
      },
    },
    select: {
      jugadorId: true,
      torneoId: true,
      valor: true,
      jugador: { select: { name: true, lastname: true } },
    },
  });

  if (rankings.length === 0) {
    return [];
  }

  const perfiles = await prisma.perfilJugadorComplejo.findMany({
    where: {
      complejoId,
      userId: { in: Array.from(new Set(rankings.map((r) => r.jugadorId))) },
    },
    select: { userId: true, categoria: true },
  });
  const categoriaByUser = new Map(
    perfiles.map((perfil) => [perfil.userId, perfil.categoria]),
  );

  const acumulado = new Map<
    number,
    { nombre: string; puntos: number; torneos: Set<number> }
  >();

  for (const ranking of rankings) {
    const current = acumulado.get(ranking.jugadorId) ?? {
      nombre: `${ranking.jugador.name} ${ranking.jugador.lastname}`,
      puntos: 0,
      torneos: new Set<number>(),
    };

    current.puntos += Number(ranking.valor);
    current.torneos.add(ranking.torneoId);
    acumulado.set(ranking.jugadorId, current);
  }

  return Array.from(acumulado.entries())
    .map(([jugadorId, data]) => ({
      jugadorId,
      nombre: data.nombre,
      categoria: categoriaByUser.get(jugadorId) ?? null,
      puntos: Math.round(data.puntos * 100) / 100,
      torneos: data.torneos.size,
    }))
    .sort((a, b) => b.puntos - a.puntos || a.nombre.localeCompare(b.nombre))
    .slice(0, RANKING_LIMIT);
}

export async function listPublicComplejoRecategorizaciones(
  complejoId: number,
): Promise<PublicComplejoRecategorizacion[]> {
  const items = await prisma.recategorizacion.findMany({
    where: { complejoId, complejo: COMPLEJO_PUBLICO_WHERE },
    orderBy: [{ fecha: "desc" }, { id: "desc" }],
    take: RECATEGORIZACIONES_LIMIT,
    select: {
      id: true,
      fecha: true,
      nivelPrevio: true,
      nivelNuevo: true,
      jugador: { select: { name: true, lastname: true } },
    },
  });

  return items.map((item) => ({
    id: item.id,
    fecha: item.fecha.toISOString(),
    jugadorNombre: `${item.jugador.name} ${item.jugador.lastname}`,
    nivelPrevio: item.nivelPrevio,
    nivelNuevo: item.nivelNuevo,
  }));
}
