"use server";

import {
  Prisma,
  type Genero,
  type ImagenPerfilEstado,
} from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { createSession, getSession } from "@/lib/session";
import { normalizarProvincia } from "@/lib/ubicaciones";
import { fechaNacimientoEnRango } from "@/lib/fecha-nacimiento";
import { urlDeImagen } from "@/lib/imagenes-perfil-rutas";

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
  // Sin imageUrl ni avatarUrl a proposito: la foto no se guarda por aca. La
  // sube /api/perfil/avatar, queda PENDIENTE, y `User.avatarUrl` lo escribe
  // solo `aprobarImagen` en actions/imagenes-perfil.ts. Si volvieran a este
  // payload, cualquiera podria publicarse la foto que quiera saltandose la
  // moderacion.
};

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
  /** URL de la foto APROBADA vigente, o "" si todavia no tiene ninguna. */
  imageUrl: string;
  avatarUrl: string;
  /** Estado de la ultima foto que subio, para el cartel de /perfil. */
  imagen: EstadoImagenPerfil | null;
};

export type EstadoImagenPerfil = {
  estado: ImagenPerfilEstado;
  motivoRechazo: string | null;
  /** Sirve para previsualizar la pendiente, que solo ve su dueño. */
  urlAvatar: string;
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
      // La ultima que subio, sin importar el estado: es la que hay que
      // reportarle. Si es PENDIENTE ve "en revision", si es RECHAZADA ve el
      // motivo, y si es APROBADA no hace falta cartel.
      imagenesPerfil: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, estado: true, motivoRechazo: true },
      },
    },
  });

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  const ultima = user.imagenesPerfil[0];

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
    imagen: ultima
      ? {
          estado: ultima.estado,
          motivoRechazo: ultima.motivoRechazo,
          urlAvatar: urlDeImagen(ultima.id, "avatar"),
        }
      : null,
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
