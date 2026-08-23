"use server";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureComplejoManagerAccess } from "@/lib/complejo-access";
import { getCanchaAccessScope } from "@/lib/canchas-auth";
import { getSession } from "@/lib/session";
import type { ListOpts } from "@/types/ui";

export type EventoListItem = {
  id: number;
  nombre: string;
  descripcion: string | null;
  posterUrl: string | null;
  tipo: "FINDE" | "SEMANAL";
  inicio: string;
  fin: string;
  isOpen: boolean;
  isVisible: boolean;
  isFinished: boolean;
  complejoId?: number;
  complejoName?: string;
};

export type EventoPayload = {
  nombre: string;
  descripcion?: string | null;
  posterUrl?: string | null;
  tipo: "FINDE" | "SEMANAL";
  inicio: string;
  fin: string;
  isOpen?: boolean;
  isVisible?: boolean;
  isFinished?: boolean;
};

const ORDERABLE_FIELDS = new Set([
  "id",
  "nombre",
  "tipo",
  "inicio",
  "fin",
  "isOpen",
  "isVisible",
  "isFinished",
  "createdAt",
]);

function normalizeNullable(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseDateTime(value: string, label: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Fecha/hora invalida para ${label}`);
  }
  return parsed;
}

function mapPrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      throw new Error("Evento no encontrado");
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

function toEventoListItem(item: {
  id: number;
  nombre: string;
  descripcion: string | null;
  posterUrl: string | null;
  tipo: "FINDE" | "SEMANAL";
  inicio: Date;
  fin: Date;
  isOpen: boolean;
  isVisible: boolean;
  isFinished: boolean;
  complejoId?: number;
  complejoName?: string;
}): EventoListItem {
  return {
    id: item.id,
    nombre: item.nombre,
    descripcion: item.descripcion,
    posterUrl: item.posterUrl,
    tipo: item.tipo,
    inicio: item.inicio.toISOString(),
    fin: item.fin.toISOString(),
    isOpen: item.isOpen,
    isVisible: item.isVisible,
    isFinished: item.isFinished,
    complejoId: item.complejoId,
    complejoName: item.complejoName,
  };
}

export async function listEventos(
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
  const maybeEventType = searchBy.toUpperCase();
  const searchEventType =
    maybeEventType === "FINDE" || maybeEventType === "SEMANAL"
      ? (maybeEventType as "FINDE" | "SEMANAL")
      : null;

  const whereClause: Prisma.EventoWhereInput = {
    deletedAt: null,
    ...(searchBy
      ? {
          OR: [
            { nombre: { contains: searchBy } },
            { descripcion: { contains: searchBy } },
            ...(searchEventType ? [{ tipo: { equals: searchEventType } }] : []),
            { complejo: { name: { contains: searchBy } } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.evento.findMany({
      where: whereClause,
      skip,
      take: pageSize,
      orderBy: { [orderBy]: orderDir },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        posterUrl: true,
        tipo: true,
        inicio: true,
        fin: true,
        isOpen: true,
        isVisible: true,
        isFinished: true,
        complejoId: true,
        complejo: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.evento.count({ where: whereClause }),
  ]);

  return {
    items: items.map((item) =>
      toEventoListItem({
        ...item,
        complejoName: item.complejo?.name ?? undefined,
      }),
    ) as EventoListItem[],
    total,
  };
}

export async function listEventosForAdmin(opts: ListOpts = {}) {
  const scope = await getCanchaAccessScope();

  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.max(1, opts.pageSize ?? 10);
  const skip = (page - 1) * pageSize;
  const orderDir = opts.orderDir === "desc" ? "desc" : "asc";
  const orderByRaw = opts.orderBy ?? "id";
  const orderBy = ORDERABLE_FIELDS.has(orderByRaw) ? orderByRaw : "id";
  const searchBy = opts.searchBy?.trim() ?? "";
  const maybeEventType = searchBy.toUpperCase();
  const searchEventType =
    maybeEventType === "FINDE" || maybeEventType === "SEMANAL"
      ? (maybeEventType as "FINDE" | "SEMANAL")
      : null;

  const whereClause: Prisma.EventoWhereInput = {
    deletedAt: null,
    ...(scope.isSuperadmin
      ? {}
      : { complejoId: { in: scope.allowedComplejoIds } }),
    ...(searchBy
      ? {
          OR: [
            { nombre: { contains: searchBy } },
            { descripcion: { contains: searchBy } },
            ...(searchEventType ? [{ tipo: { equals: searchEventType } }] : []),
            { complejo: { name: { contains: searchBy } } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.evento.findMany({
      where: whereClause,
      skip,
      take: pageSize,
      orderBy: { [orderBy]: orderDir },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        posterUrl: true,
        tipo: true,
        inicio: true,
        fin: true,
        isOpen: true,
        isVisible: true,
        isFinished: true,
        complejoId: true,
        complejo: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.evento.count({ where: whereClause }),
  ]);

  return {
    items: items.map((item) =>
      toEventoListItem({
        ...item,
        complejoName: item.complejo?.name ?? undefined,
      }),
    ) as EventoListItem[],
    total,
  };
}

export async function listEventosByComplejo(
  complejoId: number,
  opts: ListOpts = {},
) {
  await ensureComplejoManagerAccess(complejoId);

  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.max(1, opts.pageSize ?? 10);
  const skip = (page - 1) * pageSize;
  const orderDir = opts.orderDir === "desc" ? "desc" : "asc";
  const orderByRaw = opts.orderBy ?? "id";
  const orderBy = ORDERABLE_FIELDS.has(orderByRaw) ? orderByRaw : "id";
  const searchBy = opts.searchBy?.trim() ?? "";
  const maybeEventType = searchBy.toUpperCase();
  const searchEventType =
    maybeEventType === "FINDE" || maybeEventType === "SEMANAL"
      ? (maybeEventType as "FINDE" | "SEMANAL")
      : null;

  const whereClause: Prisma.EventoWhereInput = {
    complejoId,
    deletedAt: null,
    ...(searchBy
      ? {
          OR: [
            { nombre: { contains: searchBy } },
            { descripcion: { contains: searchBy } },
            ...(searchEventType ? [{ tipo: { equals: searchEventType } }] : []),
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.evento.findMany({
      where: whereClause,
      skip,
      take: pageSize,
      orderBy: { [orderBy]: orderDir },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        posterUrl: true,
        tipo: true,
        inicio: true,
        fin: true,
        isOpen: true,
        isVisible: true,
        isFinished: true,
      },
    }),
    prisma.evento.count({ where: whereClause }),
  ]);

  return {
    items: items.map((item) => toEventoListItem(item)) as EventoListItem[],
    total,
  };
}

export async function createEvento(complejoId: number, data: EventoPayload) {
  const access = await ensureComplejoManagerAccess(complejoId);

  const nombre = data.nombre?.trim();
  if (!nombre) {
    throw new Error("El nombre del evento es obligatorio");
  }

  const inicio = parseDateTime(data.inicio, "inicio");
  const fin = parseDateTime(data.fin, "fin");

  if (fin < inicio) {
    throw new Error("La fecha/hora de fin debe ser posterior al inicio");
  }

  try {
    return await prisma.evento.create({
      data: {
        complejoId,
        createdById: access.userId,
        nombre,
        descripcion: normalizeNullable(data.descripcion),
        posterUrl: normalizeNullable(data.posterUrl),
        tipo: data.tipo ?? "FINDE",
        inicio,
        fin,
        isOpen: data.isOpen ?? true,
        isVisible: data.isVisible ?? false,
        isFinished: data.isFinished ?? false,
      },
      select: { id: true },
    });
  } catch (error) {
    mapPrismaError(error);
  }
}

export async function updateEvento(
  complejoId: number,
  eventoId: number,
  data: EventoPayload,
) {
  await ensureComplejoManagerAccess(complejoId);

  const existing = await prisma.evento.findFirst({
    where: { id: eventoId, complejoId, deletedAt: null },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Evento no encontrado");
  }

  const nombre = data.nombre?.trim();
  if (!nombre) {
    throw new Error("El nombre del evento es obligatorio");
  }

  const inicio = parseDateTime(data.inicio, "inicio");
  const fin = parseDateTime(data.fin, "fin");

  if (fin < inicio) {
    throw new Error("La fecha/hora de fin debe ser posterior al inicio");
  }

  try {
    return await prisma.evento.update({
      where: { id: eventoId },
      data: {
        nombre,
        descripcion: normalizeNullable(data.descripcion),
        posterUrl: normalizeNullable(data.posterUrl),
        tipo: data.tipo ?? "FINDE",
        inicio,
        fin,
        isOpen: data.isOpen ?? true,
        isVisible: data.isVisible ?? false,
        isFinished: data.isFinished ?? false,
      },
      select: { id: true },
    });
  } catch (error) {
    mapPrismaError(error);
  }
}

export async function deleteEvento(complejoId: number, eventoId: number) {
  await ensureComplejoManagerAccess(complejoId);

  const existing = await prisma.evento.findFirst({
    where: { id: eventoId, complejoId, deletedAt: null },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Evento no encontrado");
  }

  await prisma.evento.update({
    where: { id: eventoId },
    data: {
      deletedAt: new Date(),
      isOpen: false,
      isVisible: false,
    },
  });

  return { success: true };
}

export async function getEventoById(
  complejoId: number,
  eventoId: number,
): Promise<EventoListItem> {
  await ensureComplejoManagerAccess(complejoId);

  const evento = await prisma.evento.findFirst({
    where: { id: eventoId, complejoId, deletedAt: null },
    select: {
      id: true,
      nombre: true,
      descripcion: true,
      posterUrl: true,
      tipo: true,
      inicio: true,
      fin: true,
      isOpen: true,
      isVisible: true,
      isFinished: true,
    },
  });

  if (!evento) {
    throw new Error("Evento no encontrado");
  }

  return toEventoListItem(evento);
}
