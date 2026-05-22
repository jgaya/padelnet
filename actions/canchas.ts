"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCanchaAccessScope } from "@/lib/canchas-auth";
import type { ListOpts } from "@/types/ui";

export type CanchaListItem = {
  id: number;
  complejoId: number;
  complejoName: string;
  name: string | null;
  numero: number;
  superficie: string | null;
  isIndoor: boolean;
  dobles: boolean;
  isActive: boolean;
};

export type CanchaPayload = {
  complejoId: number;
  name?: string | null;
  numero: number;
  superficie?: string | null;
  isIndoor?: boolean;
  dobles?: boolean;
  isActive?: boolean;
};

export type ComplejoOption = {
  id: number;
  name: string;
};

const ORDERABLE_FIELDS = new Set([
  "id",
  "complejo",
  "numero",
  "name",
  "superficie",
  "isIndoor",
  "dobles",
  "isActive",
]);

function normalizeNullable(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function mapPrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      throw new Error("Ya existe una cancha con ese numero en el complejo");
    }

    if (error.code === "P2025") {
      throw new Error("Cancha no encontrada");
    }
  }

  throw error instanceof Error ? error : new Error("Operacion invalida");
}

async function assertComplejoAllowed(complejoId: number) {
  const scope = await getCanchaAccessScope();

  if (!scope.isSuperadmin && !scope.allowedComplejoIds.includes(complejoId)) {
    throw new Error("No autorizado para operar sobre ese complejo");
  }

  const complejo = await prisma.complejo.findFirst({
    where: {
      id: complejoId,
      deletedAt: null,
      isActive: true,
    },
    select: { id: true },
  });

  if (!complejo) {
    throw new Error("El complejo seleccionado no existe o esta inactivo");
  }
}

export async function listComplejosForCanchas(): Promise<ComplejoOption[]> {
  const scope = await getCanchaAccessScope();

  const complejos = await prisma.complejo.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      ...(scope.isSuperadmin
        ? {}
        : { id: { in: scope.allowedComplejoIds } }),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
    },
  });

  return complejos as ComplejoOption[];
}

export async function listCanchas(opts: ListOpts = {}) {
  const scope = await getCanchaAccessScope();

  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.max(1, opts.pageSize ?? 10);
  const skip = (page - 1) * pageSize;
  const orderDir = opts.orderDir === "desc" ? "desc" : "asc";
  const orderByRaw = opts.orderBy ?? "id";
  const orderBy = ORDERABLE_FIELDS.has(orderByRaw) ? orderByRaw : "id";
  const searchBy = opts.searchBy?.trim() ?? "";

  const numericSearch = Number(searchBy);
  const hasNumericSearch = Number.isInteger(numericSearch);

  const whereClause: Prisma.CanchaWhereInput = {
    deletedAt: null,
    ...(scope.isSuperadmin
      ? {}
      : { complejoId: { in: scope.allowedComplejoIds } }),
    ...(searchBy
      ? {
          OR: [
            { name: { contains: searchBy } },
            { superficie: { contains: searchBy } },
            { complejo: { name: { contains: searchBy } } },
            ...(hasNumericSearch ? [{ numero: numericSearch }] : []),
          ],
        }
      : {}),
  };

  const orderByClause: Prisma.CanchaOrderByWithRelationInput =
    orderBy === "complejo"
      ? { complejo: { name: orderDir } }
      : ({ [orderBy]: orderDir } as Prisma.CanchaOrderByWithRelationInput);

  const [items, total] = await Promise.all([
    prisma.cancha.findMany({
      where: whereClause,
      skip,
      take: pageSize,
      orderBy: orderByClause,
      select: {
        id: true,
        complejoId: true,
        name: true,
        numero: true,
        superficie: true,
        isIndoor: true,
        dobles: true,
        isActive: true,
        complejo: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.cancha.count({ where: whereClause }),
  ]);

  return {
    items: items.map((item) => ({
      id: item.id,
      complejoId: item.complejoId,
      complejoName: item.complejo.name,
      name: item.name,
      numero: item.numero,
      superficie: item.superficie,
      isIndoor: item.isIndoor,
      dobles: item.dobles,
      isActive: item.isActive,
    })) as CanchaListItem[],
    total,
  };
}

export async function createCancha(data: CanchaPayload) {
  if (!data.complejoId || !data.numero) {
    throw new Error("Faltan campos obligatorios");
  }

  await assertComplejoAllowed(data.complejoId);

  try {
    return await prisma.cancha.create({
      data: {
        complejoId: data.complejoId,
        name: normalizeNullable(data.name),
        numero: data.numero,
        superficie: normalizeNullable(data.superficie),
        isIndoor: data.isIndoor ?? false,
        dobles: data.dobles ?? true,
        isActive: data.isActive ?? true,
      },
      select: { id: true },
    });
  } catch (error) {
    mapPrismaError(error);
  }
}

export async function updateCancha(id: number, data: CanchaPayload) {
  if (!data.complejoId || !data.numero) {
    throw new Error("Faltan campos obligatorios");
  }

  const scope = await getCanchaAccessScope();

  const existing = await prisma.cancha.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(scope.isSuperadmin
        ? {}
        : { complejoId: { in: scope.allowedComplejoIds } }),
    },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Cancha no encontrada");
  }

  await assertComplejoAllowed(data.complejoId);

  try {
    return await prisma.cancha.update({
      where: { id },
      data: {
        complejoId: data.complejoId,
        name: normalizeNullable(data.name),
        numero: data.numero,
        superficie: normalizeNullable(data.superficie),
        isIndoor: data.isIndoor ?? false,
        dobles: data.dobles ?? true,
        isActive: data.isActive ?? true,
      },
      select: { id: true },
    });
  } catch (error) {
    mapPrismaError(error);
  }
}

export async function deleteCancha(id: number) {
  const scope = await getCanchaAccessScope();

  const cancha = await prisma.cancha.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(scope.isSuperadmin
        ? {}
        : { complejoId: { in: scope.allowedComplejoIds } }),
    },
    select: { id: true },
  });

  if (!cancha) {
    throw new Error("Cancha no encontrada");
  }

  await prisma.cancha.delete({
    where: { id },
  });

  return { success: true };
}

export async function getCanchaById(id: number): Promise<CanchaListItem> {
  const scope = await getCanchaAccessScope();

  const cancha = await prisma.cancha.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(scope.isSuperadmin
        ? {}
        : { complejoId: { in: scope.allowedComplejoIds } }),
    },
    select: {
      id: true,
      complejoId: true,
      name: true,
      numero: true,
      superficie: true,
      isIndoor: true,
      dobles: true,
      isActive: true,
      complejo: {
        select: { name: true },
      },
    },
  });

  if (!cancha) {
    throw new Error("Cancha no encontrada");
  }

  return {
    id: cancha.id,
    complejoId: cancha.complejoId,
    complejoName: cancha.complejo.name,
    name: cancha.name,
    numero: cancha.numero,
    superficie: cancha.superficie,
    isIndoor: cancha.isIndoor,
    dobles: cancha.dobles,
    isActive: cancha.isActive,
  };
}
