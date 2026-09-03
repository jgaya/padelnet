"use server";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { createSession, getSession } from "@/lib/session";
import { perfilCompleto } from "@/lib/google-cuenta";
import { normalizarProvincia } from "@/lib/ubicaciones";
import { fechaNacimientoEnRango } from "@/lib/fecha-nacimiento";

export type CompletarPerfilInput = {
  dni: string;
  birthDate: string;
  categoria: string;
  genero: "M" | "F" | "X";
  provincia?: string;
  localidad?: string;
};

export type CompletarPerfilResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Carga los datos propios del sitio despues de entrar con Google.
 *
 * Reemite la sesion al final y eso no es cosmetico: el JWT guarda `categoria` y
 * `genero`, y el resumen de elegibilidad de torneos los lee de ahi y no de la
 * base. Sin reemitir, el usuario completa el perfil y el sitio lo sigue viendo
 * incompleto hasta que expire la sesion.
 */
export async function completarPerfil(
  input: CompletarPerfilInput,
): Promise<CompletarPerfilResult> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Tenes que iniciar sesion" };
  }

  const dni = input.dni?.trim();
  const categoria = input.categoria?.trim();
  const provincia = normalizarProvincia(input.provincia);
  const localidad = input.localidad?.trim() || null;

  if (!dni) {
    return { success: false, error: "El DNI es obligatorio" };
  }

  if (!categoria) {
    return { success: false, error: "La categoria es obligatoria" };
  }

  if (input.genero !== "M" && input.genero !== "F") {
    return { success: false, error: "Elegi una opcion de genero" };
  }

  const birthDateValue = input.birthDate?.trim() ?? "";
  if (!fechaNacimientoEnRango(birthDateValue)) {
    return { success: false, error: "Fecha de nacimiento invalida" };
  }
  const birthDate = new Date(birthDateValue);

  try {
    const user = await prisma.user.update({
      where: { id: session.userId },
      data: {
        dni,
        birthDate,
        categoria,
        genero: input.genero,
        provincia,
        localidad,
      },
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
        birthDate: true,
        platformRole: true,
      },
    });

    const membershipAdmin = await prisma.complejoMembership.findFirst({
      where: {
        userId: user.id,
        isActive: true,
        role: "ADMIN",
        complejo: { deletedAt: null, isActive: true },
      },
      select: { id: true },
    });

    await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      lastname: user.lastname,
      categoria: user.categoria ?? "",
      genero: user.genero,
      image: user.avatarUrl ?? user.imageUrl ?? "",
      dni: user.dni ?? undefined,
      platformRole: user.platformRole,
      esAdminDeComplejo: Boolean(membershipAdmin),
    });

    return { success: true };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "Ya existe un usuario con ese DNI" };
    }

    console.error("[perfil] completarPerfil", error);
    return { success: false, error: "No se pudo guardar el perfil" };
  }
}

/** Si al usuario logueado le falta cargar datos. Null si no hay sesion. */
export async function faltaCompletarPerfil(): Promise<boolean | null> {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { dni: true, birthDate: true, categoria: true, genero: true },
  });

  if (!user) return null;

  return !perfilCompleto(user);
}
