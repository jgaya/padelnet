"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import type { Cancha, Complejo } from "@/types/db";
import type { ListOpts } from "@/types/ui";

export type ComplejoPayload = {
  name: string;
  email?: string | null;
  direccion?: string | null;
  provincia: string;
  ciudad: string;
  telefono?: string | null;
  pais?: string;
  timezone?: string;
};

type ComplejoListItem = Complejo & { canchas: Cancha[] };

export type PublicComplejoItem = {
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
};

const ORDERABLE_FIELDS = new Set(["id", "name", "ciudad", "provincia", "createdAt"]);

async function assertSuperadmin() {
  const session = await getSession();
  if (!session || session.type !== "superadmin") {
    throw new Error("No autorizado");
  }
}

function normalizeNullable(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function slugify(value: string): string {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return normalized || "complejo";
}

async function generateUniqueSlug(name: string, excludeId?: number): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  let index = 2;

  while (true) {
    const found = await prisma.complejo.findFirst({
      where: {
        slug: candidate,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (!found) {
      return candidate;
    }

    candidate = `${base}-${index}`;
    index += 1;
  }
}

export async function listComplejos(opts: ListOpts = {}) {
  await assertSuperadmin();

  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.max(1, opts.pageSize ?? 10);
  const skip = (page - 1) * pageSize;
  const orderDir = opts.orderDir === "desc" ? "desc" : "asc";
  const orderBy = ORDERABLE_FIELDS.has(opts.orderBy ?? "") ? (opts.orderBy as "id" | "name" | "ciudad" | "provincia" | "createdAt") : "id";
  const searchBy = opts.searchBy?.trim() ?? "";

  const whereClause = searchBy
    ? {
        OR: [
          { name: { contains: searchBy } },
          { ciudad: { contains: searchBy } },
          { provincia: { contains: searchBy } },
          { email: { contains: searchBy } },
        ],
      }
    : {};

  const [itemsRaw, total] = await Promise.all([
    prisma.complejo.findMany({
      where: whereClause,
      skip,
      take: pageSize,
      orderBy: { [orderBy]: orderDir },
      include: { canchas: true },
    }),
    prisma.complejo.count({ where: whereClause }),
  ]);

  const items = itemsRaw as ComplejoListItem[];
  return { items, total };
}

export async function listPublicComplejos(): Promise<PublicComplejoItem[]> {
  const complejos = await prisma.complejo.findMany({
    where: {
      deletedAt: null,
      isActive: true,
    },
    orderBy: [{ provincia: "asc" }, { ciudad: "asc" }, { name: "asc" }],
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
        },
      },
    },
  });

  return complejos.map((complejo) => ({
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
  }));
}

export async function createComplejo(data: ComplejoPayload) {
  await assertSuperadmin();

  const name = data.name?.trim();
  const provincia = data.provincia?.trim();
  const ciudad = data.ciudad?.trim();

  if (!name || !provincia || !ciudad) {
    throw new Error("Faltan campos obligatorios");
  }

  const slug = await generateUniqueSlug(name);

  return prisma.complejo.create({
    data: {
      name,
      slug,
      email: normalizeNullable(data.email),
      direccion: normalizeNullable(data.direccion),
      provincia,
      ciudad,
      telefono: normalizeNullable(data.telefono),
      pais: data.pais?.trim() || "AR",
      timezone: data.timezone?.trim() || "America/Argentina/Buenos_Aires",
    },
  });
}

export async function updateComplejo(id: number, data: ComplejoPayload) {
  await assertSuperadmin();

  const name = data.name?.trim();
  const provincia = data.provincia?.trim();
  const ciudad = data.ciudad?.trim();

  if (!name || !provincia || !ciudad) {
    throw new Error("Faltan campos obligatorios");
  }

  const existing = await prisma.complejo.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true },
  });

  if (!existing) {
    throw new Error("Complejo no encontrado");
  }

  const slug =
    existing.name.trim() === name
      ? existing.slug
      : await generateUniqueSlug(name, id);

  return prisma.complejo.update({
    where: { id },
    data: {
      name,
      slug,
      email: normalizeNullable(data.email),
      direccion: normalizeNullable(data.direccion),
      provincia,
      ciudad,
      telefono: normalizeNullable(data.telefono),
      pais: data.pais?.trim() || "AR",
      timezone: data.timezone?.trim() || "America/Argentina/Buenos_Aires",
    },
  });
}

export async function deleteComplejo(id: number) {
  await assertSuperadmin();

  const complejo = await prisma.complejo.findUnique({
    where: { id },
    include: { canchas: true },
  });

  if (!complejo) {
    throw new Error("Complejo no encontrado");
  }

  if (complejo.canchas.length > 0) {
    throw new Error(
      "No se puede eliminar el complejo porque tiene canchas asociadas",
    );
  }

  await prisma.complejo.delete({ where: { id } });
  return { success: true };
}

export async function getComplejoById(id: number) {
  await assertSuperadmin();

  const complejo = await prisma.complejo.findUnique({ where: { id } });
  if (!complejo) {
    throw new Error("Complejo no encontrado");
  }
  return complejo as Complejo;
}
