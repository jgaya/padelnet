"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@/lib/generated/prisma/client";
import { assertSuperadmin } from "@/lib/authz";
import { enTransaccion, prisma } from "@/lib/prisma";
import type { ComplejoRole, PlatformRole } from "@/lib/roles";
import { normalizarProvincia } from "@/lib/ubicaciones";
import { fechaNacimientoEnRango } from "@/lib/fecha-nacimiento";
import type { ListOpts } from "@/types/ui";

export type UsuarioListItem = {
  id: number;
  name: string;
  lastname: string;
  email: string;
  telefono: string | null;
  dni: string | null;
  genero: "M" | "F" | "X";
  categoria: string | null;
  platformRole: PlatformRole;
  isActive: boolean;
};

export type UsuarioPayload = {
  name: string;
  lastname: string;
  email: string;
  password?: string | null;
  telefono?: string | null;
  dni?: string | null;
  genero?: "M" | "F" | "X";
  categoria?: string | null;
  provincia?: string | null;
  localidad?: string | null;
  platformRole?: PlatformRole;
  complejoId?: number | null;
  complejoRole?: ComplejoRole | null;
  esPropietario?: boolean;
  isActive?: boolean;
  birthDate?: string | null;
};

export type UsuarioEditItem = UsuarioListItem & {
  // Solo se leen al editar: el listado no los muestra y no vale la pena sumarlos
  // a su query.
  provincia: string | null;
  localidad: string | null;
  complejoId: number | null;
  complejoRole: ComplejoRole | null;
  esPropietario: boolean;
};

export type ComplejoOption = {
  id: number;
  name: string;
};

const ORDERABLE_FIELDS = new Set([
  "id",
  "name",
  "lastname",
  "email",
  "platformRole",
  "createdAt",
]);

function normalizeNullable(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseBirthDate(value?: string | null): Date | null {
  const date = value?.trim();
  if (!date) return null;

  const parsed = new Date(date);
  if (!fechaNacimientoEnRango(date) || Number.isNaN(parsed.getTime())) {
    throw new Error("Fecha de nacimiento invalida");
  }

  return parsed;
}

/**
 * Igual que parseBirthDate pero exigiendo el dato.
 *
 * La validacion de zod vive en el cliente y se puede saltear llamando a la
 * action directo, asi que la regla se repite del lado del servidor.
 */
function parseBirthDateRequerida(value?: string | null): Date {
  const parsed = parseBirthDate(value);
  if (!parsed) {
    throw new Error("La fecha de nacimiento es obligatoria");
  }

  return parsed;
}

function mapPrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const rawTarget = error.meta?.target as string[] | string | undefined;
      const fields = Array.isArray(rawTarget)
        ? rawTarget.join(", ")
        : typeof rawTarget === "string"
          ? rawTarget
          : "";
      if (fields?.includes("email")) {
        throw new Error("Ya existe un usuario con ese email");
      }
      if (fields?.includes("dni")) {
        throw new Error("Ya existe un usuario con ese DNI");
      }
      throw new Error("Datos duplicados. Verifique email y DNI");
    }

    if (error.code === "P2025") {
      throw new Error("Usuario no encontrado");
    }
  }

  throw error instanceof Error ? error : new Error("Operacion invalida");
}

/**
 * Asignacion del usuario a un complejo. Ya no depende del platformRole: ser
 * staff de un club es tener una fila en ComplejoMembership, y es independiente
 * de si en la plataforma es USER o SUPERADMIN.
 */
async function resolveAsignacionComplejo(data: UsuarioPayload) {
  if (!data.complejoId || !data.complejoRole) {
    return null;
  }

  const complejo = await prisma.complejo.findFirst({
    where: { id: data.complejoId, deletedAt: null, isActive: true },
    select: { id: true },
  });

  if (!complejo) {
    throw new Error("El complejo seleccionado no existe o esta inactivo");
  }

  return {
    complejoId: complejo.id,
    complejoRole: data.complejoRole,
    esPropietario: data.esPropietario ?? false,
  };
}

export async function listComplejosForUsuarios(): Promise<ComplejoOption[]> {
  // Gestion de usuarios: solo superadmin. Sin esto la action queda expuesta como
  // endpoint POST y se puede crear un superadmin desde afuera.
  await assertSuperadmin();

  const complejos = await prisma.complejo.findMany({
    where: { deletedAt: null, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return complejos as ComplejoOption[];
}

export async function listUsuarios(opts: ListOpts = {}) {
  // Gestion de usuarios: solo superadmin. Sin esto la action queda expuesta como
  // endpoint POST y se puede crear un superadmin desde afuera.
  await assertSuperadmin();

  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.max(1, opts.pageSize ?? 10);
  const skip = (page - 1) * pageSize;
  const orderDir = opts.orderDir === "desc" ? "desc" : "asc";
  const orderBy = ORDERABLE_FIELDS.has(opts.orderBy ?? "")
    ? (opts.orderBy as
        | "id"
        | "name"
        | "lastname"
        | "email"
        | "platformRole"
        | "createdAt")
    : "id";
  const searchBy = opts.searchBy?.trim() ?? "";

  const whereClause = {
    deletedAt: null as Date | null,
    ...(searchBy
      ? {
          OR: [
            { name: { contains: searchBy } },
            { lastname: { contains: searchBy } },
            { email: { contains: searchBy } },
            { dni: { contains: searchBy } },
            { telefono: { contains: searchBy } },
            { categoria: { contains: searchBy } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where: whereClause,
      skip,
      take: pageSize,
      orderBy: { [orderBy]: orderDir },
      select: {
        id: true,
        name: true,
        lastname: true,
        email: true,
        telefono: true,
        dni: true,
        genero: true,
        categoria: true,
        platformRole: true,
        isActive: true,
      },
    }),
    prisma.user.count({ where: whereClause }),
  ]);

  return { items: items as UsuarioListItem[], total };
}

export async function createUsuario(data: UsuarioPayload) {
  // Gestion de usuarios: solo superadmin. Sin esto la action queda expuesta como
  // endpoint POST y se puede crear un superadmin desde afuera.
  await assertSuperadmin();

  const name = data.name?.trim();
  const lastname = data.lastname?.trim();
  const email = data.email?.trim().toLowerCase();
  const password = data.password?.trim();
  const platformRole = data.platformRole ?? "USER";
  const dni = data.dni?.trim();

  if (!name || !lastname || !email || !password) {
    throw new Error("Faltan campos obligatorios");
  }

  if (!dni) {
    throw new Error("El DNI es obligatorio");
  }

  const birthDate = parseBirthDateRequerida(data.birthDate);

  const passwordHash = await bcrypt.hash(password, 10);
  const asignacion = await resolveAsignacionComplejo({
    ...data,
    platformRole,
  });

  try {
    return await enTransaccion(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          lastname,
          email,
          passwordHash,
          telefono: normalizeNullable(data.telefono),
          dni,
          genero: data.genero ?? "X",
          categoria: normalizeNullable(data.categoria),
          provincia: normalizarProvincia(data.provincia),
          localidad: normalizeNullable(data.localidad),
          platformRole,
          isActive: data.isActive ?? true,
          birthDate,
        },
        select: { id: true },
      });

      if (asignacion) {
        await tx.complejoMembership.create({
          data: {
            userId: user.id,
            complejoId: asignacion.complejoId,
            role: asignacion.complejoRole,
            esPropietario: asignacion.esPropietario,
            isActive: true,
          },
        });
      }

      return user;
    });
  } catch (error) {
    mapPrismaError(error);
  }
}

export async function assignUsuarioAdminToComplejo(
  userId: number,
  complejoId: number,
) {
  // Gestion de usuarios: solo superadmin. Sin esto la action queda expuesta como
  // endpoint POST y se puede crear un superadmin desde afuera.
  await assertSuperadmin();

  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true },
  });

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  const complejo = await prisma.complejo.findFirst({
    where: { id: complejoId, deletedAt: null, isActive: true },
    select: { id: true },
  });

  if (!complejo) {
    throw new Error("Complejo no encontrado o inactivo");
  }

  await prisma.complejoMembership.upsert({
    where: {
      complejoId_userId: {
        userId,
        complejoId,
      },
    },
    update: {
      role: "ADMIN",
      isActive: true,
    },
    create: {
      userId,
      complejoId,
      role: "ADMIN",
      isActive: true,
    },
  });

  return { success: true };
}

export async function updateUsuario(id: number, data: UsuarioPayload) {
  // Gestion de usuarios: solo superadmin. Sin esto la action queda expuesta como
  // endpoint POST y se puede crear un superadmin desde afuera.
  await assertSuperadmin();

  const name = data.name?.trim();
  const lastname = data.lastname?.trim();
  const email = data.email?.trim().toLowerCase();
  const platformRole = data.platformRole ?? "USER";
  const dni = data.dni?.trim();

  if (!name || !lastname || !email) {
    throw new Error("Faltan campos obligatorios");
  }

  if (!dni) {
    throw new Error("El DNI es obligatorio");
  }

  const birthDate = parseBirthDateRequerida(data.birthDate);

  const asignacion = await resolveAsignacionComplejo({
    ...data,
    platformRole,
  });

  const updateData: Prisma.UserUpdateInput = {
    name,
    lastname,
    email,
    telefono: normalizeNullable(data.telefono),
    dni,
    genero: data.genero ?? "X",
    categoria: normalizeNullable(data.categoria),
    provincia: normalizarProvincia(data.provincia),
    localidad: normalizeNullable(data.localidad),
    platformRole,
    isActive: data.isActive ?? true,
    birthDate,
  };

  if (data.password && data.password.trim().length > 0) {
    updateData.passwordHash = await bcrypt.hash(data.password.trim(), 10);
  }

  try {
    return await enTransaccion(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: updateData,
        select: { id: true },
      });

      if (asignacion) {
        await tx.complejoMembership.updateMany({
          where: { userId: id, isActive: true },
          data: { isActive: false },
        });

        await tx.complejoMembership.upsert({
          where: {
            complejoId_userId: {
              userId: id,
              complejoId: asignacion.complejoId,
            },
          },
          update: {
            role: asignacion.complejoRole,
            isActive: true,
          },
          create: {
            userId: id,
            complejoId: asignacion.complejoId,
            role: asignacion.complejoRole,
            esPropietario: asignacion.esPropietario,
            isActive: true,
          },
        });
      }

      return user;
    });
  } catch (error) {
    mapPrismaError(error);
  }
}

export async function deleteUsuario(id: number) {
  // Gestion de usuarios: solo superadmin. Sin esto la action queda expuesta como
  // endpoint POST y se puede crear un superadmin desde afuera.
  await assertSuperadmin();

  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  });

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  await prisma.user.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      isActive: false,
    },
  });

  return { success: true };
}

export async function getUsuarioById(id: number) {
  // Gestion de usuarios: solo superadmin. Sin esto la action queda expuesta como
  // endpoint POST y se puede crear un superadmin desde afuera.
  await assertSuperadmin();

  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      name: true,
      lastname: true,
      email: true,
      telefono: true,
      dni: true,
      genero: true,
      categoria: true,
      provincia: true,
      localidad: true,
      platformRole: true,
      isActive: true,
      memberships: {
        where: { isActive: true },
        orderBy: { id: "desc" },
        take: 1,
        select: {
          complejoId: true,
          role: true,
          esPropietario: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  const membership = user.memberships[0] ?? null;

  return {
    id: user.id,
    name: user.name,
    lastname: user.lastname,
    email: user.email,
    telefono: user.telefono,
    dni: user.dni,
    genero: user.genero,
    categoria: user.categoria,
    provincia: user.provincia,
    localidad: user.localidad,
    platformRole: user.platformRole,
    isActive: user.isActive,
    complejoId: membership?.complejoId ?? null,
    complejoRole: membership?.role ?? null,
    esPropietario: membership?.esPropietario ?? false,
  } as UsuarioEditItem;
}
