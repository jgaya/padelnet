"use server";

/**
 * Recategorizaciones de un complejo.
 *
 * Una recategorizacion cambia la categoria del jugador *solo dentro del club*:
 * escribe `PerfilJugadorComplejo.categoria` y nunca toca `User.categoria`. La
 * inscripcion a torneos ya lee primero la del club y cae a la global si no hay
 * (ver actions/torneos-inscripcion.ts), asi que con esto el mismo jugador puede
 * ser 4 en un complejo y 6 en otro.
 *
 * La categoria vigente es siempre la de la recategorizacion de fecha mas
 * reciente: se recalcula despues de cada alta y de cada baja, de manera que
 * cargar una vieja por error no pisa la actual y borrar la ultima revierte a la
 * anterior.
 */

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureComplejoManagerAccess } from "@/lib/complejo-access";
import { CATEGORIA_OPTIONS } from "@/lib/categorias";
import { fechaParaDB } from "@/lib/turnos-horario";
import type { ListOpts } from "@/types/ui";

/**
 * Que paso con la categoria. Ojo que 1 es la categoria mas alta: bajar de
 * numero es ascender.
 */
export type RecategorizacionMovimiento =
  | "ASCENSO"
  | "DESCENSO"
  | "OBSERVADO"
  | "ALTA";

export type RecategorizacionListItem = {
  id: number;
  fecha: string;
  jugadorId: number;
  jugadorNombre: string;
  nivelPrevio: string | null;
  nivelNuevo: string;
  movimiento: RecategorizacionMovimiento;
  /** true si es la que define hoy la categoria del jugador en el club. */
  vigente: boolean;
  creadoPor: string | null;
};

export type RecategorizacionJugadorOption = {
  id: number;
  nombre: string;
  dni: string | null;
  /** Categoria que rige hoy en el club: la del perfil, o la global. */
  categoriaActual: string | null;
  /** true si la categoria sale del perfil del club y no de la global. */
  categoriaDelClub: boolean;
};

export type CreateRecategorizacionInput = {
  jugadorId: number;
  /** "YYYY-MM-DD": la columna es `@db.Date`. */
  fecha: string;
  nivelNuevo: string;
};

const ORDERABLE_FIELDS = new Set(["id", "fecha", "jugador", "nivelNuevo"]);

const JUGADORES_LIMIT = 20;

const CATEGORIA_VALUES = new Set(
  CATEGORIA_OPTIONS.map((option) => option.value),
);

/** Los jugadores son los usuarios comunes: ni admins de club ni superadmins. */
const JUGADOR_WHERE = {
  deletedAt: null,
  isActive: true,
  platformRole: "USER",
} as const;

function nombreCompleto(user: { name: string; lastname: string }) {
  return `${user.name} ${user.lastname}`;
}

function resolveMovimiento(
  nivelPrevio: string | null,
  nivelNuevo: string,
): RecategorizacionMovimiento {
  if (!nivelPrevio) return "ALTA";
  if (nivelPrevio === nivelNuevo) return "OBSERVADO";

  const previo = Number(nivelPrevio);
  const nuevo = Number(nivelNuevo);

  if (!Number.isFinite(previo) || !Number.isFinite(nuevo)) return "OBSERVADO";

  // 1 es la categoria mas alta, asi que bajar de numero es ascender.
  return nuevo < previo ? "ASCENSO" : "DESCENSO";
}

/**
 * Deja `PerfilJugadorComplejo` en linea con el historial: la categoria del club
 * es la de la recategorizacion mas reciente, o null si no queda ninguna.
 *
 * Con null el jugador vuelve a valer por su categoria global, que es lo que
 * corresponde: la recategorizacion nunca fue suya, fue del club.
 */
async function aplicarCategoriaVigente(
  tx: Prisma.TransactionClient,
  complejoId: number,
  jugadorId: number,
) {
  const ultima = await tx.recategorizacion.findFirst({
    where: { complejoId, jugadorId },
    orderBy: [{ fecha: "desc" }, { id: "desc" }],
    select: { nivelPrevio: true, nivelNuevo: true },
  });

  // Al borrar la ultima solo se limpia el perfil que ya exista: crear uno vacio
  // sumaria al jugador a la lista publica de jugadores del club sin motivo.
  if (!ultima) {
    await tx.perfilJugadorComplejo.updateMany({
      where: { complejoId, userId: jugadorId },
      data: { categoria: null, observado: false },
    });
    return;
  }

  // Mismo criterio que el organizador: si la recategorizacion deja al jugador
  // en la categoria que ya tenia, es que quedo en observacion.
  const categoria = ultima.nivelNuevo;
  const observado = ultima.nivelNuevo === ultima.nivelPrevio;

  await tx.perfilJugadorComplejo.upsert({
    where: { complejoId_userId: { complejoId, userId: jugadorId } },
    create: { complejoId, userId: jugadorId, categoria, observado },
    update: { categoria, observado },
  });
}

export async function listRecategorizaciones(
  complejoId: number,
  opts: ListOpts = {},
): Promise<{ items: RecategorizacionListItem[]; total: number }> {
  await ensureComplejoManagerAccess(complejoId);

  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.max(1, opts.pageSize ?? 10);
  const skip = (page - 1) * pageSize;
  const orderDir = opts.orderDir === "asc" ? "asc" : "desc";
  const orderByRaw = opts.orderBy ?? "fecha";
  const orderBy = ORDERABLE_FIELDS.has(orderByRaw) ? orderByRaw : "fecha";
  const searchBy = opts.searchBy?.trim() ?? "";

  const where: Prisma.RecategorizacionWhereInput = {
    complejoId,
    ...(searchBy
      ? {
          jugador: {
            OR: [
              { name: { contains: searchBy } },
              { lastname: { contains: searchBy } },
              { dni: { contains: searchBy } },
            ],
          },
        }
      : {}),
  };

  const orderClause: Prisma.RecategorizacionOrderByWithRelationInput[] =
    orderBy === "jugador"
      ? [{ jugador: { lastname: orderDir } }, { jugador: { name: orderDir } }]
      : orderBy === "fecha"
        ? [{ fecha: orderDir }, { id: orderDir }]
        : [
            {
              [orderBy]: orderDir,
            } as Prisma.RecategorizacionOrderByWithRelationInput,
          ];

  const [items, total] = await Promise.all([
    prisma.recategorizacion.findMany({
      where,
      orderBy: orderClause,
      skip,
      take: pageSize,
      select: {
        id: true,
        fecha: true,
        jugadorId: true,
        nivelPrevio: true,
        nivelNuevo: true,
        jugador: { select: { name: true, lastname: true } },
        createdBy: { select: { name: true, lastname: true } },
      },
    }),
    prisma.recategorizacion.count({ where }),
  ]);

  // La vigente de cada jugador se resuelve contra todo su historial en el club,
  // no contra la pagina: la mas nueva puede haber quedado en otra pagina.
  const vigentes = await prisma.recategorizacion.findMany({
    where: {
      complejoId,
      jugadorId: {
        in: Array.from(new Set(items.map((item) => item.jugadorId))),
      },
    },
    orderBy: [{ fecha: "desc" }, { id: "desc" }],
    select: { id: true, jugadorId: true },
  });

  const vigentePorJugador = new Map<number, number>();
  for (const item of vigentes) {
    if (!vigentePorJugador.has(item.jugadorId)) {
      vigentePorJugador.set(item.jugadorId, item.id);
    }
  }

  return {
    items: items.map((item) => ({
      id: item.id,
      fecha: item.fecha.toISOString(),
      jugadorId: item.jugadorId,
      jugadorNombre: nombreCompleto(item.jugador),
      nivelPrevio: item.nivelPrevio,
      nivelNuevo: item.nivelNuevo,
      movimiento: resolveMovimiento(item.nivelPrevio, item.nivelNuevo),
      vigente: vigentePorJugador.get(item.jugadorId) === item.id,
      creadoPor: item.createdBy ? nombreCompleto(item.createdBy) : null,
    })),
    total,
  };
}

/**
 * Jugadores que el admin puede recategorizar. Se busca sobre todos los usuarios
 * de la plataforma, no solo los que ya tienen perfil en el club: el perfil se
 * crea justamente al cargar la primera recategorizacion.
 */
export async function searchJugadoresParaRecategorizar(
  complejoId: number,
  term: string,
): Promise<RecategorizacionJugadorOption[]> {
  await ensureComplejoManagerAccess(complejoId);

  const search = term.trim();
  if (search.length < 2) return [];

  const jugadores = await prisma.user.findMany({
    where: {
      ...JUGADOR_WHERE,
      OR: [
        { name: { contains: search } },
        { lastname: { contains: search } },
        { dni: { contains: search } },
        { email: { contains: search } },
      ],
    },
    orderBy: [{ lastname: "asc" }, { name: "asc" }],
    take: JUGADORES_LIMIT,
    select: {
      id: true,
      name: true,
      lastname: true,
      dni: true,
      categoria: true,
      perfilesComplejo: {
        where: { complejoId },
        select: { categoria: true },
        take: 1,
      },
    },
  });

  return jugadores.map((jugador) => {
    const categoriaClub = jugador.perfilesComplejo[0]?.categoria ?? null;

    return {
      id: jugador.id,
      nombre: nombreCompleto(jugador),
      dni: jugador.dni,
      categoriaActual: categoriaClub ?? jugador.categoria,
      categoriaDelClub: Boolean(categoriaClub),
    };
  });
}

export async function createRecategorizacion(
  complejoId: number,
  input: CreateRecategorizacionInput,
) {
  const acceso = await ensureComplejoManagerAccess(complejoId);

  const jugadorId = Number(input.jugadorId);
  if (!Number.isInteger(jugadorId) || jugadorId <= 0) {
    throw new Error("Selecciona un jugador");
  }

  const nivelNuevo = String(input.nivelNuevo ?? "").trim();
  if (!CATEGORIA_VALUES.has(nivelNuevo)) {
    throw new Error("La categoria nueva no es valida");
  }

  const fechaKey = String(input.fecha ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaKey)) {
    throw new Error("La fecha no es valida");
  }

  const fecha = fechaParaDB(fechaKey);
  if (Number.isNaN(fecha.getTime())) {
    throw new Error("La fecha no es valida");
  }

  const jugador = await prisma.user.findFirst({
    where: { id: jugadorId, ...JUGADOR_WHERE },
    select: {
      id: true,
      categoria: true,
      perfilesComplejo: {
        where: { complejoId },
        select: { categoria: true },
        take: 1,
      },
    },
  });

  if (!jugador) {
    throw new Error("El jugador seleccionado no es valido");
  }

  // El nivel previo lo decide el server: el cliente solo elige a quien y a que
  // categoria, asi la foto del "antes" no se puede falsear desde el formulario.
  const nivelPrevio =
    jugador.perfilesComplejo[0]?.categoria ?? jugador.categoria ?? null;

  await prisma.$transaction(async (tx) => {
    await tx.recategorizacion.create({
      data: {
        complejoId,
        jugadorId,
        createdById: acceso.userId,
        fecha,
        nivelPrevio,
        nivelNuevo,
      },
    });

    await aplicarCategoriaVigente(tx, complejoId, jugadorId);
  });

  return {
    success: true,
    nivelPrevio,
    movimiento: resolveMovimiento(nivelPrevio, nivelNuevo),
  };
}

export async function deleteRecategorizacion(complejoId: number, id: number) {
  await ensureComplejoManagerAccess(complejoId);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Recategorizacion no encontrada");
  }

  const recategorizacion = await prisma.recategorizacion.findFirst({
    where: { id, complejoId },
    select: { id: true, jugadorId: true },
  });

  if (!recategorizacion) {
    throw new Error("Recategorizacion no encontrada");
  }

  await prisma.$transaction(async (tx) => {
    await tx.recategorizacion.delete({ where: { id: recategorizacion.id } });
    await aplicarCategoriaVigente(tx, complejoId, recategorizacion.jugadorId);
  });

  return { success: true };
}
