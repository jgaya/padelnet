"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureComplejoManagerAccess } from "@/lib/complejo-access";
import { getCanchaAccessScope } from "@/lib/canchas-auth";
import { getSession } from "@/lib/session";
import type { TournamentStatus } from "@/types/db";
import {
  notifyTorneoActualizado,
  notifyTorneoIniciado,
  notifyTorneoPublicado,
} from "@/actions/notificaciones-eventos";
import {
  aplicarRankingTorneo,
  writeTorneoPuntajes,
} from "@/actions/torneos-ranking";
import type { PuntajesPorPosicion } from "@/lib/ranking-puntajes";
import type { ListOpts } from "@/types/ui";

export type TorneoListItem = {
  id: number;
  eventoId: number;
  nombre: string;
  sexo: "MASCULINO" | "FEMENINO" | "MIXTO";
  categoriaRegla: "LIBRE" | "MAYOR_IGUAL" | "MENOR_IGUAL" | "IGUAL" | "SUMA";
  categoriaN: number | null;
  categoriaCode: string;
  comentario: string | null;
  imagenUrl: string | null;
  valorInsc: string | null;
  jugxZona: number;
  capacidad: number;
  status: TournamentStatus;
  publicado: boolean;
  zonaCerrada: boolean;
  inicio: string | null;
  fin: string | null;
  complejoId?: number;
  complejoName?: string;
  eventoName?: string;
};

export type TorneoPayload = {
  nombre: string;
  sexo: "MASCULINO" | "FEMENINO" | "MIXTO";
  categoriaRegla: "LIBRE" | "MAYOR_IGUAL" | "MENOR_IGUAL" | "IGUAL" | "SUMA";
  categoriaN?: number | null;
  comentario?: string | null;
  imagenUrl?: string | null;
  valorInsc?: string | null;
  jugxZona?: number;
  capacidad: number;
  status?: TournamentStatus;
  publicado?: boolean;
  zonaCerrada?: boolean;
  inicio?: string | null;
  fin?: string | null;
  /** Puntos por posicion final; sin esto se usan los valores por defecto. */
  puntajes?: PuntajesPorPosicion | null;
};

const ORDERABLE_FIELDS = new Set([
  "id",
  "nombre",
  "sexo",
  "categoriaRegla",
  "categoriaN",
  "capacidad",
  "status",
  "publicado",
  "zonaCerrada",
  "jugxZona",
  "inicio",
  "fin",
  "createdAt",
]);

function normalizeNullable(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeJugxZona(value?: number | null): number {
  const parsed = Number(value ?? 3);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("Jugadores por zona debe ser un entero positivo");
  }

  return parsed;
}

function parseDateTimeNullable(value?: string | null): Date | null {
  const cleaned = value?.trim();
  if (!cleaned) {
    return null;
  }

  const parsed = new Date(cleaned);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Fecha/hora invalida");
  }

  return parsed;
}

function normalizeCategoriaN(
  categoriaRegla: TorneoPayload["categoriaRegla"],
  categoriaN: number | null,
): number | null {
  if (categoriaRegla === "LIBRE") {
    return null;
  }

  if (categoriaN === null || !Number.isInteger(categoriaN) || categoriaN <= 0) {
    throw new Error("Debe indicar un valor N entero positivo");
  }

  return categoriaN;
}

function buildCategoriaCode(
  categoriaRegla: TorneoPayload["categoriaRegla"],
  categoriaN: number | null,
) {
  switch (categoriaRegla) {
    case "MAYOR_IGUAL":
      return `>=${categoriaN}`;
    case "MENOR_IGUAL":
      return `<=${categoriaN}`;
    case "IGUAL":
      return `=${categoriaN}`;
    case "SUMA":
      return `SUMA${categoriaN}`;
    case "LIBRE":
    default:
      return "LIBRE";
  }
}

function mapPrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      throw new Error("Ya existe un torneo con ese nombre dentro del evento");
    }

    if (error.code === "P2025") {
      throw new Error("Torneo no encontrado");
    }
  }

  throw error instanceof Error ? error : new Error("Operacion invalida");
}

async function assertSuperadmin() {
  const session = await getSession();
  if (!session || session.platformRole !== "SUPERADMIN") {
    throw new Error("No autorizado");
  }
}

async function ensureEventoAccess(complejoId: number, eventoId: number) {
  await ensureComplejoManagerAccess(complejoId);

  const evento = await prisma.evento.findFirst({
    where: {
      id: eventoId,
      complejoId,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!evento) {
    throw new Error("Evento no encontrado");
  }
}

export async function listTorneos(opts: ListOpts = {}) {
  await assertSuperadmin();

  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.max(1, opts.pageSize ?? 10);
  const skip = (page - 1) * pageSize;
  const orderDir = opts.orderDir === "desc" ? "desc" : "asc";
  const orderByRaw = opts.orderBy ?? "id";
  const orderBy = ORDERABLE_FIELDS.has(orderByRaw) ? orderByRaw : "id";
  const searchBy = opts.searchBy?.trim() ?? "";
  const maybeInt = Number(searchBy);
  const numericSearch = Number.isInteger(maybeInt) ? maybeInt : null;
  const normalizedSearch = searchBy.toUpperCase();
  const searchStatus = [
    "DRAFT",
    "PUBLISHED",
    "IN_PROGRESS",
    "FINISHED",
    "ARCHIVED",
  ].includes(normalizedSearch)
    ? (normalizedSearch as TorneoPayload["status"])
    : null;
  const searchSexo = ["MASCULINO", "FEMENINO", "MIXTO"].includes(
    normalizedSearch,
  )
    ? (normalizedSearch as TorneoPayload["sexo"])
    : null;
  const searchCategoriaRegla = [
    "LIBRE",
    "MAYOR_IGUAL",
    "MENOR_IGUAL",
    "IGUAL",
    "SUMA",
  ].includes(normalizedSearch)
    ? (normalizedSearch as TorneoPayload["categoriaRegla"])
    : null;

  const whereClause: Prisma.TorneoWhereInput = {
    deletedAt: null,
    ...(searchBy
      ? {
          OR: [
            { nombre: { contains: searchBy } },
            { comentario: { contains: searchBy } },
            { categoriaCode: { contains: searchBy } },
            ...(searchStatus ? [{ status: { equals: searchStatus } }] : []),
            ...(searchSexo ? [{ sexo: { equals: searchSexo } }] : []),
            ...(searchCategoriaRegla
              ? [{ categoriaRegla: { equals: searchCategoriaRegla } }]
              : []),
            ...(numericSearch
              ? [{ categoriaN: numericSearch }, { capacidad: numericSearch }]
              : []),
            { evento: { nombre: { contains: searchBy } } },
            { evento: { complejo: { name: { contains: searchBy } } } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.torneo.findMany({
      where: whereClause,
      skip,
      take: pageSize,
      orderBy: { [orderBy]: orderDir },
      select: {
        id: true,
        eventoId: true,
        nombre: true,
        sexo: true,
        categoriaRegla: true,
        categoriaN: true,
        categoriaCode: true,
        comentario: true,
        imagenUrl: true,
        valorInsc: true,
        jugxZona: true,
        capacidad: true,
        status: true,
        publicado: true,
        zonaCerrada: true,
        inicio: true,
        fin: true,
        evento: {
          select: {
            nombre: true,
            complejoId: true,
            complejo: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.torneo.count({ where: whereClause }),
  ]);

  return {
    items: items.map((item) =>
      toTorneoListItem({
        id: item.id,
        eventoId: item.eventoId,
        nombre: item.nombre,
        sexo: item.sexo,
        categoriaRegla: item.categoriaRegla,
        categoriaN: item.categoriaN,
        categoriaCode: item.categoriaCode,
        comentario: item.comentario,
        imagenUrl: item.imagenUrl,
        valorInsc: item.valorInsc,
        jugxZona: item.jugxZona,
        capacidad: item.capacidad,
        status: item.status,
        publicado: item.publicado,
        zonaCerrada: item.zonaCerrada,
        inicio: item.inicio,
        fin: item.fin,
        complejoId: item.evento?.complejoId ?? undefined,
        complejoName: item.evento?.complejo?.name ?? undefined,
        eventoName: item.evento?.nombre ?? undefined,
      }),
    ) as TorneoListItem[],
    total,
  };
}

export async function listTorneosForAdmin(opts: ListOpts = {}) {
  const scope = await getCanchaAccessScope();

  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.max(1, opts.pageSize ?? 10);
  const skip = (page - 1) * pageSize;
  const orderDir = opts.orderDir === "desc" ? "desc" : "asc";
  const orderByRaw = opts.orderBy ?? "id";
  const orderBy = ORDERABLE_FIELDS.has(orderByRaw) ? orderByRaw : "id";
  const searchBy = opts.searchBy?.trim() ?? "";
  const maybeInt = Number(searchBy);
  const numericSearch = Number.isInteger(maybeInt) ? maybeInt : null;
  const normalizedSearch = searchBy.toUpperCase();
  const searchStatus = [
    "DRAFT",
    "PUBLISHED",
    "IN_PROGRESS",
    "FINISHED",
    "ARCHIVED",
  ].includes(normalizedSearch)
    ? (normalizedSearch as TorneoPayload["status"])
    : null;
  const searchSexo = ["MASCULINO", "FEMENINO", "MIXTO"].includes(
    normalizedSearch,
  )
    ? (normalizedSearch as TorneoPayload["sexo"])
    : null;
  const searchCategoriaRegla = [
    "LIBRE",
    "MAYOR_IGUAL",
    "MENOR_IGUAL",
    "IGUAL",
    "SUMA",
  ].includes(normalizedSearch)
    ? (normalizedSearch as TorneoPayload["categoriaRegla"])
    : null;

  const whereClause: Prisma.TorneoWhereInput = {
    deletedAt: null,
    evento: {
      deletedAt: null,
      ...(scope.isSuperadmin
        ? {}
        : { complejoId: { in: scope.allowedComplejoIds } }),
    },
    ...(searchBy
      ? {
          OR: [
            { nombre: { contains: searchBy } },
            { comentario: { contains: searchBy } },
            { categoriaCode: { contains: searchBy } },
            ...(searchStatus ? [{ status: { equals: searchStatus } }] : []),
            ...(searchSexo ? [{ sexo: { equals: searchSexo } }] : []),
            ...(searchCategoriaRegla
              ? [{ categoriaRegla: { equals: searchCategoriaRegla } }]
              : []),
            ...(numericSearch
              ? [{ categoriaN: numericSearch }, { capacidad: numericSearch }]
              : []),
            { evento: { nombre: { contains: searchBy } } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.torneo.findMany({
      where: whereClause,
      skip,
      take: pageSize,
      orderBy: { [orderBy]: orderDir },
      select: {
        id: true,
        eventoId: true,
        nombre: true,
        sexo: true,
        categoriaRegla: true,
        categoriaN: true,
        categoriaCode: true,
        comentario: true,
        imagenUrl: true,
        valorInsc: true,
        jugxZona: true,
        capacidad: true,
        status: true,
        publicado: true,
        zonaCerrada: true,
        inicio: true,
        fin: true,
        evento: {
          select: {
            nombre: true,
            complejoId: true,
            complejo: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.torneo.count({ where: whereClause }),
  ]);

  return {
    items: items.map((item) =>
      toTorneoListItem({
        ...item,
        complejoId: item.evento?.complejoId ?? undefined,
        complejoName: item.evento?.complejo?.name ?? undefined,
        eventoName: item.evento?.nombre ?? undefined,
      }),
    ) as TorneoListItem[],
    total,
  };
}

export async function listTorneosByComplejo(
  complejoId: number,
  opts: ListOpts = {},
) {
  await assertSuperadmin();

  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.max(1, opts.pageSize ?? 10);
  const skip = (page - 1) * pageSize;
  const orderDir = opts.orderDir === "desc" ? "desc" : "asc";
  const orderByRaw = opts.orderBy ?? "id";
  const orderBy = ORDERABLE_FIELDS.has(orderByRaw) ? orderByRaw : "id";
  const searchBy = opts.searchBy?.trim() ?? "";
  const maybeInt = Number(searchBy);
  const numericSearch = Number.isInteger(maybeInt) ? maybeInt : null;
  const normalizedSearch = searchBy.toUpperCase();
  const searchStatus = [
    "DRAFT",
    "PUBLISHED",
    "IN_PROGRESS",
    "FINISHED",
    "ARCHIVED",
  ].includes(normalizedSearch)
    ? (normalizedSearch as TorneoPayload["status"])
    : null;
  const searchSexo = ["MASCULINO", "FEMENINO", "MIXTO"].includes(
    normalizedSearch,
  )
    ? (normalizedSearch as TorneoPayload["sexo"])
    : null;
  const searchCategoriaRegla = [
    "LIBRE",
    "MAYOR_IGUAL",
    "MENOR_IGUAL",
    "IGUAL",
    "SUMA",
  ].includes(normalizedSearch)
    ? (normalizedSearch as TorneoPayload["categoriaRegla"])
    : null;

  const whereClause: Prisma.TorneoWhereInput = {
    deletedAt: null,
    evento: {
      complejoId,
      deletedAt: null,
    },
    ...(searchBy
      ? {
          OR: [
            { nombre: { contains: searchBy } },
            { comentario: { contains: searchBy } },
            { categoriaCode: { contains: searchBy } },
            ...(searchStatus ? [{ status: { equals: searchStatus } }] : []),
            ...(searchSexo ? [{ sexo: { equals: searchSexo } }] : []),
            ...(searchCategoriaRegla
              ? [{ categoriaRegla: { equals: searchCategoriaRegla } }]
              : []),
            ...(numericSearch
              ? [{ categoriaN: numericSearch }, { capacidad: numericSearch }]
              : []),
            { evento: { nombre: { contains: searchBy } } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.torneo.findMany({
      where: whereClause,
      skip,
      take: pageSize,
      orderBy: { [orderBy]: orderDir },
      select: {
        id: true,
        eventoId: true,
        nombre: true,
        sexo: true,
        categoriaRegla: true,
        categoriaN: true,
        categoriaCode: true,
        comentario: true,
        imagenUrl: true,
        valorInsc: true,
        jugxZona: true,
        capacidad: true,
        status: true,
        publicado: true,
        zonaCerrada: true,
        inicio: true,
        fin: true,
        evento: {
          select: {
            nombre: true,
            complejoId: true,
            complejo: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.torneo.count({ where: whereClause }),
  ]);

  return {
    items: items.map((item) =>
      toTorneoListItem({
        ...item,
        complejoId: item.evento?.complejoId ?? undefined,
        complejoName: item.evento?.complejo?.name ?? undefined,
        eventoName: item.evento?.nombre ?? undefined,
      }),
    ) as TorneoListItem[],
    total,
  };
}

function toTorneoListItem(item: {
  id: number;
  eventoId: number;
  nombre: string;
  sexo: "MASCULINO" | "FEMENINO" | "MIXTO";
  categoriaRegla: "LIBRE" | "MAYOR_IGUAL" | "MENOR_IGUAL" | "IGUAL" | "SUMA";
  categoriaN: number | null;
  categoriaCode: string;
  comentario: string | null;
  imagenUrl: string | null;
  valorInsc: string | null;
  jugxZona: number;
  capacidad: number;
  status: TournamentStatus;
  publicado: boolean;
  zonaCerrada: boolean;
  inicio: Date | null;
  fin: Date | null;
  complejoId?: number;
  complejoName?: string;
  eventoName?: string;
}): TorneoListItem {
  return {
    id: item.id,
    eventoId: item.eventoId,
    nombre: item.nombre,
    sexo: item.sexo,
    categoriaRegla: item.categoriaRegla,
    categoriaN: item.categoriaN,
    categoriaCode: item.categoriaCode,
    comentario: item.comentario,
    imagenUrl: item.imagenUrl,
    valorInsc: item.valorInsc,
    jugxZona: item.jugxZona,
    capacidad: item.capacidad,
    status: item.status,
    publicado: item.publicado,
    zonaCerrada: item.zonaCerrada,
    inicio: item.inicio ? item.inicio.toISOString() : null,
    fin: item.fin ? item.fin.toISOString() : null,
    complejoId: item.complejoId,
    complejoName: item.complejoName,
    eventoName: item.eventoName,
  };
}

export async function listTorneosByEvento(
  complejoId: number,
  eventoId: number,
  opts: ListOpts = {},
) {
  await ensureEventoAccess(complejoId, eventoId);

  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.max(1, opts.pageSize ?? 10);
  const skip = (page - 1) * pageSize;
  const orderDir = opts.orderDir === "desc" ? "desc" : "asc";
  const orderByRaw = opts.orderBy ?? "id";
  const orderBy = ORDERABLE_FIELDS.has(orderByRaw) ? orderByRaw : "id";
  const searchBy = opts.searchBy?.trim() ?? "";
  const maybeInt = Number(searchBy);
  const numericSearch = Number.isInteger(maybeInt) ? maybeInt : null;
  const normalizedSearch = searchBy.toUpperCase();
  const searchStatus = [
    "DRAFT",
    "PUBLISHED",
    "IN_PROGRESS",
    "FINISHED",
    "ARCHIVED",
  ].includes(normalizedSearch)
    ? (normalizedSearch as TorneoPayload["status"])
    : null;
  const searchSexo = ["MASCULINO", "FEMENINO", "MIXTO"].includes(
    normalizedSearch,
  )
    ? (normalizedSearch as TorneoPayload["sexo"])
    : null;
  const searchCategoriaRegla = [
    "LIBRE",
    "MAYOR_IGUAL",
    "MENOR_IGUAL",
    "IGUAL",
    "SUMA",
  ].includes(normalizedSearch)
    ? (normalizedSearch as TorneoPayload["categoriaRegla"])
    : null;

  const whereClause: Prisma.TorneoWhereInput = {
    eventoId,
    deletedAt: null,
    ...(searchBy
      ? {
          OR: [
            { nombre: { contains: searchBy } },
            { comentario: { contains: searchBy } },
            { categoriaCode: { contains: searchBy } },
            ...(searchStatus ? [{ status: { equals: searchStatus } }] : []),
            ...(searchSexo ? [{ sexo: { equals: searchSexo } }] : []),
            ...(searchCategoriaRegla
              ? [{ categoriaRegla: { equals: searchCategoriaRegla } }]
              : []),
            ...(numericSearch
              ? [{ categoriaN: numericSearch }, { capacidad: numericSearch }]
              : []),
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.torneo.findMany({
      where: whereClause,
      skip,
      take: pageSize,
      orderBy: { [orderBy]: orderDir },
      select: {
        id: true,
        eventoId: true,
        nombre: true,
        sexo: true,
        categoriaRegla: true,
        categoriaN: true,
        categoriaCode: true,
        comentario: true,
        imagenUrl: true,
        valorInsc: true,
        jugxZona: true,
        capacidad: true,
        status: true,
        publicado: true,
        zonaCerrada: true,
        inicio: true,
        fin: true,
      },
    }),
    prisma.torneo.count({ where: whereClause }),
  ]);

  return {
    items: items.map((item) => toTorneoListItem(item)) as TorneoListItem[],
    total,
  };
}

export async function createTorneo(
  complejoId: number,
  eventoId: number,
  data: TorneoPayload,
) {
  await ensureEventoAccess(complejoId, eventoId);

  const nombre = data.nombre?.trim();
  if (!nombre) {
    throw new Error("El nombre del torneo es obligatorio");
  }

  if (!Number.isInteger(data.capacidad) || data.capacidad <= 0) {
    throw new Error("La capacidad debe ser un entero positivo");
  }

  const inicio = parseDateTimeNullable(data.inicio);
  const fin = parseDateTimeNullable(data.fin);
  if (inicio && fin && fin < inicio) {
    throw new Error("La fecha/hora de fin debe ser posterior al inicio");
  }

  const categoriaN = normalizeCategoriaN(
    data.categoriaRegla,
    data.categoriaN ?? null,
  );
  const categoriaCode = buildCategoriaCode(data.categoriaRegla, categoriaN);
  const jugxZona = normalizeJugxZona(data.jugxZona);

  try {
    const creado = await prisma.torneo.create({
      data: {
        eventoId,
        nombre,
        sexo: data.sexo,
        categoriaRegla: data.categoriaRegla,
        categoriaN,
        categoriaCode,
        comentario: normalizeNullable(data.comentario),
        imagenUrl: normalizeNullable(data.imagenUrl),
        valorInsc: normalizeNullable(data.valorInsc),
        jugxZona,
        capacidad: data.capacidad,
        status: data.status ?? "DRAFT",
        publicado: data.publicado ?? false,
        zonaCerrada: data.zonaCerrada ?? false,
        inicio,
        fin,
      },
      select: { id: true },
    });

    // Puntajes de ranking del torneo: se crean siempre, con los valores del
    // form o los del catalogo por defecto.
    await writeTorneoPuntajes(creado.id, data.puntajes ?? null);

    // Si nace publicado se avisa; si nace en borrador, el aviso sale cuando se
    // publique desde updateTorneo.
    if (data.publicado) {
      await notifyTorneoPublicado(creado.id);
    }

    return creado;
  } catch (error) {
    mapPrismaError(error);
  }
}

export async function updateTorneo(
  complejoId: number,
  eventoId: number,
  torneoId: number,
  data: TorneoPayload,
) {
  await ensureEventoAccess(complejoId, eventoId);

  const existing = await prisma.torneo.findFirst({
    where: {
      id: torneoId,
      eventoId,
      deletedAt: null,
    },
    // Se traen los campos que disparan notificaciones, para comparar el estado
    // previo contra el nuevo.
    select: {
      id: true,
      nombre: true,
      publicado: true,
      status: true,
      inicio: true,
      fin: true,
    },
  });

  if (!existing) {
    throw new Error("Torneo no encontrado");
  }

  const nombre = data.nombre?.trim();
  if (!nombre) {
    throw new Error("El nombre del torneo es obligatorio");
  }

  if (!Number.isInteger(data.capacidad) || data.capacidad <= 0) {
    throw new Error("La capacidad debe ser un entero positivo");
  }

  const inicio = parseDateTimeNullable(data.inicio);
  const fin = parseDateTimeNullable(data.fin);
  if (inicio && fin && fin < inicio) {
    throw new Error("La fecha/hora de fin debe ser posterior al inicio");
  }

  const categoriaN = normalizeCategoriaN(
    data.categoriaRegla,
    data.categoriaN ?? null,
  );
  const categoriaCode = buildCategoriaCode(data.categoriaRegla, categoriaN);
  const jugxZona = normalizeJugxZona(data.jugxZona);

  try {
    const actualizado = await prisma.torneo.update({
      where: { id: torneoId },
      data: {
        nombre,
        sexo: data.sexo,
        categoriaRegla: data.categoriaRegla,
        categoriaN,
        categoriaCode,
        comentario: normalizeNullable(data.comentario),
        imagenUrl: normalizeNullable(data.imagenUrl),
        valorInsc: normalizeNullable(data.valorInsc),
        jugxZona,
        capacidad: data.capacidad,
        status: data.status ?? "DRAFT",
        publicado: data.publicado ?? false,
        zonaCerrada: data.zonaCerrada ?? false,
        inicio,
        fin,
      },
      select: { id: true },
    });

    await writeTorneoPuntajes(torneoId, data.puntajes ?? null);

    const publicadoNuevo = data.publicado ?? false;
    const statusNuevo = data.status ?? "DRAFT";

    if (!existing.publicado && publicadoNuevo) {
      // Recien se hace publico: se avisa a los jugadores de la categoria.
      await notifyTorneoPublicado(torneoId);
    } else if (existing.publicado && publicadoNuevo) {
      // Ya era publico: solo se avisa a los inscriptos lo que cambio.
      const cambios: string[] = [];

      if (existing.nombre !== nombre) {
        cambios.push(`ahora se llama ${nombre}`);
      }
      if (existing.inicio?.getTime() !== inicio?.getTime()) {
        cambios.push("cambio la fecha de inicio");
      }
      if (existing.fin?.getTime() !== fin?.getTime()) {
        cambios.push("cambio la fecha de fin");
      }

      await notifyTorneoActualizado(torneoId, cambios);
    }

    if (existing.status !== "IN_PROGRESS" && statusNuevo === "IN_PROGRESS") {
      await notifyTorneoIniciado(torneoId);
    }

    // Al finalizar el torneo se cargan los puntos de ranking. Se recalcula cada
    // vez que pasa a FINISHED, asi corregir un resultado y volver a finalizar
    // deja los puntos correctos.
    if (statusNuevo === "FINISHED") {
      await aplicarRankingTorneo(torneoId);
    }

    return actualizado;
  } catch (error) {
    mapPrismaError(error);
  }
}

export async function deleteTorneo(
  complejoId: number,
  eventoId: number,
  torneoId: number,
) {
  await ensureEventoAccess(complejoId, eventoId);

  const existing = await prisma.torneo.findFirst({
    where: {
      id: torneoId,
      eventoId,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Torneo no encontrado");
  }

  await prisma.torneo.update({
    where: { id: torneoId },
    data: {
      deletedAt: new Date(),
      publicado: false,
      status: "ARCHIVED",
    },
  });

  return { success: true };
}

export async function getTorneoById(
  complejoId: number,
  eventoId: number,
  torneoId: number,
): Promise<TorneoListItem> {
  await ensureEventoAccess(complejoId, eventoId);

  const torneo = await prisma.torneo.findFirst({
    where: {
      id: torneoId,
      eventoId,
      deletedAt: null,
    },
    select: {
      id: true,
      eventoId: true,
      nombre: true,
      sexo: true,
      categoriaRegla: true,
      categoriaN: true,
      categoriaCode: true,
      comentario: true,
      imagenUrl: true,
      valorInsc: true,
      jugxZona: true,
      capacidad: true,
      status: true,
      publicado: true,
      zonaCerrada: true,
      inicio: true,
      fin: true,
    },
  });

  if (!torneo) {
    throw new Error("Torneo no encontrado");
  }

  return toTorneoListItem(torneo);
}
