"use server";

import { Prisma } from "@/lib/generated/prisma/client";
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
import { actualizarEstadisticasParejas } from "@/lib/torneo-estadisticas";
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
  formato: "ZONAS" | "ELIMINACION_DIRECTA";
  siembra: "RANKING" | "INSCRIPCION";
  comentario: string | null;
  imagenUrl: string | null;
  valorInsc: string | null;
  jugxZona: number;
  capacidad: number;
  status: TournamentStatus;
  publicado: boolean;
  zonaCerrada: boolean;
  inscripcionesCerradas: boolean;
  zonaGenerada: boolean;
  partidosGenerados: boolean;
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
  /** Con zonas (default) o directo a la llave. Ver lib/torneo-llave-directa.ts. */
  formato?: "ZONAS" | "ELIMINACION_DIRECTA";
  /** Solo aplica en ELIMINACION_DIRECTA. */
  siembra?: "RANKING" | "INSCRIPCION";
  status?: TournamentStatus;
  publicado?: boolean;
  zonaCerrada?: boolean;
  inscripcionesCerradas?: boolean;
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
        inscripcionesCerradas: true,
        zonaGenerada: true,
        partidosGenerados: true,
        formato: true,
        siembra: true,
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
        formato: item.formato,
        siembra: item.siembra,
        status: item.status,
        publicado: item.publicado,
        zonaCerrada: item.zonaCerrada,
        inscripcionesCerradas: item.inscripcionesCerradas,
        zonaGenerada: item.zonaGenerada,
        partidosGenerados: item.partidosGenerados,
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
        inscripcionesCerradas: true,
        zonaGenerada: true,
        partidosGenerados: true,
        formato: true,
        siembra: true,
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
        inscripcionesCerradas: true,
        zonaGenerada: true,
        partidosGenerados: true,
        formato: true,
        siembra: true,
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
  formato: "ZONAS" | "ELIMINACION_DIRECTA";
  siembra: "RANKING" | "INSCRIPCION";
  status: TournamentStatus;
  publicado: boolean;
  zonaCerrada: boolean;
  inscripcionesCerradas: boolean;
  zonaGenerada: boolean;
  partidosGenerados: boolean;
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
    formato: item.formato,
    siembra: item.siembra,
    categoriaCode: item.categoriaCode,
    comentario: item.comentario,
    imagenUrl: item.imagenUrl,
    valorInsc: item.valorInsc,
    jugxZona: item.jugxZona,
    capacidad: item.capacidad,
    status: item.status,
    publicado: item.publicado,
    zonaCerrada: item.zonaCerrada,
    inscripcionesCerradas: item.inscripcionesCerradas,
    zonaGenerada: item.zonaGenerada,
    partidosGenerados: item.partidosGenerados,
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
        inscripcionesCerradas: true,
        zonaGenerada: true,
        partidosGenerados: true,
        formato: true,
        siembra: true,
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
        inscripcionesCerradas: data.inscripcionesCerradas ?? false,
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
        inscripcionesCerradas: data.inscripcionesCerradas ?? false,
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

    // Al finalizar el torneo se cargan los puntos de ranking y se recalculan las
    // estadisticas de las parejas. Las dos cosas se rehacen cada vez que pasa a
    // FINISHED, asi corregir un resultado y volver a finalizar deja los numeros
    // correctos.
    if (statusNuevo === "FINISHED") {
      await aplicarRankingTorneo(torneoId);
      await actualizarEstadisticasParejas(torneoId);
    }

    return actualizado;
  } catch (error) {
    mapPrismaError(error);
  }
}

export type TorneoAccionResult =
  | { success: true; message: string }
  | { success: false; error: string };

export async function toggleInscripcionesCerradasTorneo(
  complejoId: number,
  eventoId: number,
  torneoId: number,
): Promise<TorneoAccionResult> {
  try {
    await ensureEventoAccess(complejoId, eventoId);

    const torneo = await prisma.torneo.findFirst({
      where: { id: torneoId, eventoId, deletedAt: null },
      select: { inscripcionesCerradas: true },
    });

    if (!torneo) {
      return { success: false, error: "Torneo no encontrado" };
    }

    const inscripcionesCerradas = !torneo.inscripcionesCerradas;
    await prisma.torneo.update({
      where: { id: torneoId },
      data: { inscripcionesCerradas },
    });

    return {
      success: true,
      message: inscripcionesCerradas
        ? "Inscripciones cerradas"
        : "Inscripciones abiertas",
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo cambiar el estado de las inscripciones del torneo",
    };
  }
}

/**
 * Alterna la publicación del torneo.
 *
 * Publicar mueve DRAFT -> PUBLISHED y despublicar hace PUBLISHED -> DRAFT.
 * Mueve `status` y `publicado` juntos porque son las dos condiciones que pide
 * `inscripcionesAbiertas`; con una sola el torneo queda publicado a medias y
 * nadie se puede anotar.
 */
export async function publicarTorneo(
  complejoId: number,
  eventoId: number,
  torneoId: number,
): Promise<TorneoAccionResult> {
  try {
    await ensureEventoAccess(complejoId, eventoId);

    const torneo = await prisma.torneo.findFirst({
      where: { id: torneoId, eventoId, deletedAt: null },
      select: { id: true, status: true, publicado: true },
    });

    if (!torneo) {
      return { success: false, error: "Torneo no encontrado" };
    }

    if (torneo.publicado || torneo.status === "PUBLISHED") {
      await prisma.torneo.update({
        where: { id: torneoId },
        data: { status: "DRAFT", publicado: false },
      });

      return { success: true, message: "Torneo despublicado" };
    }

    if (torneo.status !== "DRAFT") {
      return {
        success: false,
        error: "Solo se puede publicar un torneo que este en borrador",
      };
    }

    await prisma.torneo.update({
      where: { id: torneoId },
      data: { status: "PUBLISHED", publicado: true },
    });

    // Si ya venia con publicado en true el aviso salio antes: no se repite.
    if (!torneo.publicado) {
      await notifyTorneoPublicado(torneoId);
    }

    return { success: true, message: "Torneo publicado" };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo publicar el torneo",
    };
  }
}

/**
 * Termina el torneo: IN_PROGRESS -> FINISHED, y carga los puntos de ranking.
 *
 * A IN_PROGRESS se llega solo al cerrar zonas y armar la llave, asi que este
 * boton aparece recien cuando el torneo esta realmente en juego.
 *
 * Tambien acepta un torneo ya FINISHED y en ese caso solo recalcula el
 * ranking. Hace falta para dos cosas: reintentar si el calculo fallo (el
 * estado ya quedo cambiado y sin esto no habria segunda chance) y rehacer los
 * puntos despues de corregir un resultado. `aplicarRankingTorneo` borra y
 * reescribe, asi que repetirlo no duplica nada.
 */
export async function finalizarTorneo(
  complejoId: number,
  eventoId: number,
  torneoId: number,
): Promise<TorneoAccionResult> {
  try {
    await ensureEventoAccess(complejoId, eventoId);

    const torneo = await prisma.torneo.findFirst({
      where: { id: torneoId, eventoId, deletedAt: null },
      select: { id: true, status: true },
    });

    if (!torneo) {
      return { success: false, error: "Torneo no encontrado" };
    }

    if (torneo.status !== "IN_PROGRESS" && torneo.status !== "FINISHED") {
      return {
        success: false,
        error: "Solo se puede terminar un torneo que se este jugando",
      };
    }

    const yaEstaba = torneo.status === "FINISHED";

    if (!yaEstaba) {
      await prisma.torneo.update({
        where: { id: torneoId },
        data: { status: "FINISHED" },
      });
    }

    const ranking = await aplicarRankingTorneo(torneoId);

    if (!ranking.success) {
      return {
        success: false,
        error: `El torneo quedo terminado pero fallo el ranking: ${
          ranking.message ?? "error desconocido"
        }. Volve a intentarlo con "Recalcular ranking".`,
      };
    }

    // Las estadisticas no vuelven atras el cierre del torneo: si fallan se avisa
    // y se arreglan volviendo a finalizar, igual que el ranking.
    const estadisticas = await actualizarEstadisticasParejas(torneoId);
    const detalleEstadisticas = estadisticas.success
      ? ` Estadisticas actualizadas en ${estadisticas.parejasActualizadas} parejas.`
      : ` No se pudieron actualizar las estadisticas de las parejas: ${
          estadisticas.message ?? "error desconocido"
        }.`;

    return {
      success: true,
      message:
        (yaEstaba
          ? `Ranking recalculado: ${ranking.rankingsCreados} puntajes.`
          : `Torneo terminado. Se cargaron ${ranking.rankingsCreados} puntajes de ranking.`) +
        detalleEstadisticas,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo terminar el torneo",
    };
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
      inscripcionesCerradas: true,
      zonaGenerada: true,
      partidosGenerados: true,
      formato: true,
      siembra: true,
      inicio: true,
      fin: true,
    },
  });

  if (!torneo) {
    throw new Error("Torneo no encontrado");
  }

  return toTorneoListItem(torneo);
}
/*
export async function getJugadoresFiscalizadosPorEvento(eventoId: number) {
  try {
    const torneosEvento = await prisma.torneo.findMany({
      where: { eventoId: Number(eventoId) },
      select: {
        id: true,
        nombre: true,
        categoria: true,
      },
    });

    const partidos = await prisma.partido.findMany({
      where: { torneo: { eventoId: Number(eventoId) } },
      select: {
        id: true,
        horario: true,
        torneoId: true,
        torneo: {
          select: {
            nombre: true,
            categoria: true,
          },
        },
      },
    });

    const partidosIds = partidos.map((p) => p.id);
    const partidosById = Object.fromEntries(partidos.map((p) => [p.id, p]));

    const fiscalizaciones = await prisma.fiscalizacion.findMany({
      where: { partidoId: { in: partidosIds } },
      select: {
        id: true,
        partidoId: true,
        fiscalId: true,
        jugador1Id: true,
        jugador2Id: true,
        jugador3Id: true,
        jugador4Id: true,
        jugador1Estado: true,
        jugador2Estado: true,
        jugador3Estado: true,
        jugador4Estado: true,
        jugador1Comentario: true,
        jugador2Comentario: true,
        jugador3Comentario: true,
        jugador4Comentario: true,
        observaciones: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const filas = fiscalizaciones.flatMap((f) => {
      const partido = partidosById[f.partidoId];

      return [
        {
          fiscalizacionId: f.id,
          partidoId: f.partidoId,
          fiscalId: f.fiscalId,
          jugadorId: f.jugador1Id,
          estado: f.jugador1Estado,
          comentario: f.jugador1Comentario,
          observaciones: f.observaciones,
          createdAt: f.createdAt,
          horario: partido?.horario ?? null,
          torneoId: partido?.torneoId ?? null,
          torneoNombre: partido?.torneo?.nombre ?? null,
          torneoCategoria: partido?.torneo?.categoria ?? null,
        },
        {
          fiscalizacionId: f.id,
          partidoId: f.partidoId,
          fiscalId: f.fiscalId,
          jugadorId: f.jugador2Id,
          estado: f.jugador2Estado,
          comentario: f.jugador2Comentario,
          observaciones: f.observaciones,
          createdAt: f.createdAt,
          horario: partido?.horario ?? null,
          torneoId: partido?.torneoId ?? null,
          torneoNombre: partido?.torneo?.nombre ?? null,
          torneoCategoria: partido?.torneo?.categoria ?? null,
        },
        {
          fiscalizacionId: f.id,
          partidoId: f.partidoId,
          fiscalId: f.fiscalId,
          jugadorId: f.jugador3Id,
          estado: f.jugador3Estado,
          comentario: f.jugador3Comentario,
          observaciones: f.observaciones,
          createdAt: f.createdAt,
          horario: partido?.horario ?? null,
          torneoId: partido?.torneoId ?? null,
          torneoNombre: partido?.torneo?.nombre ?? null,
          torneoCategoria: partido?.torneo?.categoria ?? null,
        },
        {
          fiscalizacionId: f.id,
          partidoId: f.partidoId,
          fiscalId: f.fiscalId,
          jugadorId: f.jugador4Id,
          estado: f.jugador4Estado,
          comentario: f.jugador4Comentario,
          observaciones: f.observaciones,
          createdAt: f.createdAt,
          horario: partido?.horario ?? null,
          torneoId: partido?.torneoId ?? null,
          torneoNombre: partido?.torneo?.nombre ?? null,
          torneoCategoria: partido?.torneo?.categoria ?? null,
        },
      ];
    });

    const filasFiltradas = filas.filter((fila) => fila.estado !== "OK");

    const jugadoresIds = Array.from(
      new Set(filasFiltradas.map((f) => f.jugadorId)),
    );

    const users =
      jugadoresIds.length > 0
        ? await prisma.user.findMany({
            where: {
              id: { in: jugadoresIds },
            },
            select: {
              id: true,
              name: true,
              lastname: true,
              dni: true,
              image: true,
              telefono: true,
              observado: true,
              categoria: true,
              avatar: true,
            },
          })
        : [];

    const usersById = Object.fromEntries(users.map((u) => [u.id, u]));

    const torneosMap = new Map<
      string,
      {
        torneoId: number | null;
        torneoNombre: string;
        torneoCategoria: string | null;
        jugadoresMap: Map<
          number,
          {
            jugadorId: number;
            jugador: (typeof users)[number] | null;
            estados: string[];
            comentario: string | null;
          }
        >;
      }
    >();

    for (const torneo of torneosEvento) {
      const torneoKey = `${torneo.id}-${torneo.nombre}`;
      torneosMap.set(torneoKey, {
        torneoId: torneo.id,
        torneoNombre: torneo.nombre,
        torneoCategoria: torneo.categoria,
        jugadoresMap: new Map(),
      });
    }

    for (const fila of filasFiltradas) {
      const torneoId = fila.torneoId ?? null;
      const torneoNombre = fila.torneoNombre ?? "Sin torneo";
      const torneoCategoria = fila.torneoCategoria ?? null;
      const torneoKey = `${torneoId ?? "sin-torneo"}-${torneoNombre}`;

      if (!torneosMap.has(torneoKey)) {
        torneosMap.set(torneoKey, {
          torneoId,
          torneoNombre,
          torneoCategoria,
          jugadoresMap: new Map(),
        });
      }

      const torneoItem = torneosMap.get(torneoKey);
      if (!torneoItem) continue;

      if (!torneoItem.jugadoresMap.has(fila.jugadorId)) {
        torneoItem.jugadoresMap.set(fila.jugadorId, {
          jugadorId: fila.jugadorId,
          jugador: usersById[fila.jugadorId] || null,
          estados: [],
          comentario: null,
        });
      }

      const itemJugador = torneoItem.jugadoresMap.get(fila.jugadorId);
      if (itemJugador && !itemJugador.estados.includes(fila.estado)) {
        itemJugador.estados.push(fila.estado);
      }

      if (
        itemJugador &&
        fila.estado === "PARA_EXCLUIR" &&
        fila.comentario &&
        !itemJugador.comentario
      ) {
        itemJugador.comentario = fila.comentario;
      }
    }
 
    const torneoIds = torneosEvento.map((torneo) => torneo.id);
     
    const finales =
      torneoIds.length > 0
        ? await prisma.partido.findMany({
            where: {
              torneoId: { in: torneoIds },
              llave: "1-1",
            },
            select: {
              id: true,
              torneoId: true,
              horario: true,
              ganadorId: true,
              torneo: {
                select: {
                  nombre: true,
                  categoria: true,
                },
              },
              pareja1: {
                select: {
                  id: true,
                  jugador1: true,
                  jugador2: true,
                },
              },
              pareja2: {
                select: {
                  id: true,
                  jugador1: true,
                  jugador2: true,
                },
              },
            },
          })
        : []; 
    const finalesByTorneo = new Map<
      number,
      Array<{
        id: number;
        horario: string | null;
        ganadorId: number | null;
        torneoNombre: string;
        torneoCategoria: string | null;
        pareja1: {
          id: number;
          jugador1: string | null;
          jugador2: string | null;
          esGanadora: boolean;
        } | null;
        pareja2: {
          id: number;
          jugador1: string | null;
          jugador2: string | null;
          esGanadora: boolean;
        } | null;
      }>
    >();

    for (const final of finales) {
      if (!finalesByTorneo.has(final.torneoId)) {
        finalesByTorneo.set(final.torneoId, []);
      }

      finalesByTorneo.get(final.torneoId)?.push({
        id: final.id,
        horario: final.horario,
        ganadorId: final.ganadorId,
        torneoNombre: final.torneo?.nombre || "",
        torneoCategoria: final.torneo?.categoria ?? null,
        pareja1: final.pareja1
          ? {
              id: final.pareja1.id,
              jugador1: final.pareja1.jugador1,
              jugador2: final.pareja1.jugador2,
              esGanadora: final.ganadorId === final.pareja1.id,
            }
          : null,
        pareja2: final.pareja2
          ? {
              id: final.pareja2.id,
              jugador1: final.pareja2.jugador1,
              jugador2: final.pareja2.jugador2,
              esGanadora: final.ganadorId === final.pareja2.id,
            }
          : null,
      });
    }

    const items = Array.from(torneosMap.values()).map((torneo) => ({
      torneoId: torneo.torneoId,
      torneoNombre: torneo.torneoNombre,
      torneoCategoria: torneo.torneoCategoria,
      jugadores: Array.from(torneo.jugadoresMap.values()),
      partidosFinales:
        torneo.torneoId !== null
          ? finalesByTorneo.get(torneo.torneoId) || []
          : [],
    }));

    return {
      success: true,
      items,
      users,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || String(error),
    };
  }
}*/