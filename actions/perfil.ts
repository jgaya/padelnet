"use server";

import { Prisma, type Genero } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { createSession, getSession } from "@/lib/session";
import { normalizarProvincia } from "@/lib/ubicaciones";

export type PerfilPayload = {
  name: string;
  lastname: string;
  email: string;
  telefono?: string | null;
  dni?: string | null;
  genero?: "M" | "F" | "X";
  provincia?: string | null;
  localidad?: string | null;
  birthDate?: string | null;
  imageUrl?: string | null;
  avatarUrl?: string | null;
};

function normalizeNullable(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseBirthDate(value?: string | null): Date | null {
  const date = value?.trim();
  if (!date) return null;

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Fecha de nacimiento invalida");
  }

  return parsed;
}

function formatDateInput(value: Date | null): string {
  if (!value) return "";
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  }

  throw error instanceof Error ? error : new Error("Operacion invalida");
}

export type PerfilData = {
  id: number;
  name: string;
  lastname: string;
  email: string;
  telefono: string;
  dni: string;
  genero: Genero;
  provincia: string;
  localidad: string;
  birthDate: string;
  imageUrl: string;
  avatarUrl: string;
};

export async function getMyProfile(): Promise<PerfilData> {
  const session = await getSession();
  if (!session) {
    throw new Error("No autenticado");
  }

  const user = await prisma.user.findFirst({
    where: { id: session.userId, deletedAt: null, isActive: true },
    select: {
      id: true,
      name: true,
      lastname: true,
      email: true,
      telefono: true,
      dni: true,
      genero: true,
      provincia: true,
      localidad: true,
      birthDate: true,
      avatarUrl: true,
      imageUrl: true,
    },
  });

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  return {
    id: user.id,
    name: user.name,
    lastname: user.lastname,
    email: user.email,
    telefono: user.telefono ?? "",
    dni: user.dni ?? "",
    genero: user.genero,
    provincia: user.provincia ?? "",
    localidad: user.localidad ?? "",
    birthDate: formatDateInput(user.birthDate),
    imageUrl: user.imageUrl ?? "",
    avatarUrl: user.avatarUrl ?? "",
  };
}

export async function updateMyProfile(data: PerfilPayload) {
  const session = await getSession();
  if (!session) {
    throw new Error("No autenticado");
  }

  const name = data.name?.trim();
  const lastname = data.lastname?.trim();
  const email = data.email?.trim().toLowerCase();

  if (!name || !lastname || !email) {
    throw new Error("Faltan campos obligatorios");
  }

  const updateData: Prisma.UserUpdateInput = {
    name,
    lastname,
    email,
    telefono: normalizeNullable(data.telefono),
    dni: normalizeNullable(data.dni),
    genero: data.genero ?? "X",
    provincia: normalizarProvincia(data.provincia),
    localidad: normalizeNullable(data.localidad),
    birthDate: parseBirthDate(data.birthDate),
    imageUrl: normalizeNullable(data.imageUrl),
    avatarUrl: normalizeNullable(data.avatarUrl),
  };

  try {
    const user = await prisma.user.update({
      where: { id: session.userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        lastname: true,
        genero: true,
        categoria: true,
        avatarUrl: true,
        imageUrl: true,
        dni: true,
      },
    });

    // Se reemite la sesion con los datos nuevos del perfil. Los permisos no se
    // tocan aca: se conservan tal cual estaban.
    await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      lastname: user.lastname,
      categoria: user.categoria ?? session.categoria ?? "",
      genero: user.genero,
      image: user.avatarUrl ?? user.imageUrl ?? "",
      dni: user.dni ?? undefined,
      platformRole: session.platformRole,
      esAdminDeComplejo: session.esAdminDeComplejo,
    });

    return { success: true };
  } catch (error) {
    mapPrismaError(error);
  }
}
