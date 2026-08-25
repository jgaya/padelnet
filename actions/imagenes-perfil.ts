"use server";

import { revalidatePath } from "next/cache";

import { assertSuperadmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { borrarArchivos } from "@/lib/imagenes-perfil";
import { urlDeImagen } from "@/lib/imagenes-perfil-rutas";
import type { ImagenPerfilEstado } from "@/lib/generated/prisma/client";
import type { ListOpts } from "@/types/ui";

/**
 * Moderacion de las fotos de perfil.
 *
 * `aprobarImagen` es el UNICO lugar de todo el codigo que escribe
 * `User.avatarUrl` e `User.imageUrl`. Esa es la invariante que sostiene todo
 * lo demas: si una URL esta en esos campos, la foto paso por aca. Por eso las
 * pantallas que pintan avatares no verifican nada.
 */

export type ImagenPerfilItem = {
  id: number;
  estado: ImagenPerfilEstado;
  urlImagen: string;
  urlAvatar: string;
  motivoRechazo: string | null;
  createdAt: Date;
  moderadaAt: Date | null;
  moderadaPor: string | null;
  usuario: {
    id: number;
    nombre: string;
    email: string;
  };
};

const ESTADOS: ImagenPerfilEstado[] = ["PENDIENTE", "APROBADA", "RECHAZADA"];

function normalizarEstado(valor?: string): ImagenPerfilEstado {
  return ESTADOS.includes(valor as ImagenPerfilEstado)
    ? (valor as ImagenPerfilEstado)
    : "PENDIENTE";
}

export async function listarImagenesPerfil(
  opts: ListOpts & { estado?: string } = {},
) {
  await assertSuperadmin();

  const estado = normalizarEstado(opts.estado);
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.max(1, opts.pageSize ?? 12);
  const searchBy = opts.searchBy?.trim() ?? "";

  const where = {
    estado,
    ...(searchBy
      ? {
          user: {
            OR: [
              { name: { contains: searchBy } },
              { lastname: { contains: searchBy } },
              { email: { contains: searchBy } },
            ],
          },
        }
      : {}),
  };

  const [filas, total] = await Promise.all([
    prisma.imagenPerfil.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      // Las pendientes mas viejas primero: es una cola, no un muro.
      orderBy: { createdAt: estado === "PENDIENTE" ? "asc" : "desc" },
      select: {
        id: true,
        estado: true,
        motivoRechazo: true,
        createdAt: true,
        moderadaAt: true,
        user: { select: { id: true, name: true, lastname: true, email: true } },
        moderadaPor: { select: { name: true, lastname: true } },
      },
    }),
    prisma.imagenPerfil.count({ where }),
  ]);

  const items: ImagenPerfilItem[] = filas.map((fila) => ({
    id: fila.id,
    estado: fila.estado,
    urlImagen: urlDeImagen(fila.id, "imagen"),
    urlAvatar: urlDeImagen(fila.id, "avatar"),
    motivoRechazo: fila.motivoRechazo,
    createdAt: fila.createdAt,
    moderadaAt: fila.moderadaAt,
    moderadaPor: fila.moderadaPor
      ? `${fila.moderadaPor.name} ${fila.moderadaPor.lastname}`.trim()
      : null,
    usuario: {
      id: fila.user.id,
      nombre: `${fila.user.name} ${fila.user.lastname}`.trim(),
      email: fila.user.email,
    },
  }));

  return { items, total, page, pageSize, estado };
}

export async function contarImagenesPendientes() {
  await assertSuperadmin();
  return prisma.imagenPerfil.count({ where: { estado: "PENDIENTE" } });
}

export async function aprobarImagen(imagenId: number) {
  const session = await assertSuperadmin();

  const imagen = await prisma.imagenPerfil.findUnique({
    where: { id: imagenId },
    select: { id: true, userId: true, estado: true },
  });

  if (!imagen) {
    return { success: false as const, error: "La imagen no existe" };
  }

  if (imagen.estado === "APROBADA") {
    return { success: false as const, error: "Ya estaba aprobada" };
  }

  // Todo lo anterior de ese usuario queda obsoleto al aprobar: la aprobada que
  // se reemplaza, las rechazadas viejas y cualquier pendiente que hubiera
  // quedado. Se van los archivos (que es lo que ocupa disco) y tambien las
  // filas, para no dejar registros apuntando a archivos que ya no existen.
  const obsoletas = await prisma.imagenPerfil.findMany({
    where: { userId: imagen.userId, id: { not: imagen.id } },
    select: { id: true, archivoImagen: true, archivoAvatar: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.imagenPerfil.update({
      where: { id: imagen.id },
      data: {
        estado: "APROBADA",
        moderadaPorId: session.userId,
        moderadaAt: new Date(),
        motivoRechazo: null,
      },
    });

    await tx.user.update({
      where: { id: imagen.userId },
      data: {
        avatarUrl: urlDeImagen(imagen.id, "avatar"),
        imageUrl: urlDeImagen(imagen.id, "imagen"),
      },
    });

    if (obsoletas.length) {
      await tx.imagenPerfil.deleteMany({
        where: { id: { in: obsoletas.map((fila) => fila.id) } },
      });
    }
  });

  // Los archivos, despues de la transaccion: si esto falla, lo unico que queda
  // es disco ocupado por archivos que ya no referencia nadie, y no una fila
  // apuntando a algo que se borro.
  if (obsoletas.length) {
    await borrarArchivos(
      imagen.userId,
      obsoletas.flatMap((fila) => [fila.archivoImagen, fila.archivoAvatar]),
    );
  }

  revalidatePath("/superadmin/imagenes");
  return { success: true as const };
}

export async function rechazarImagen(imagenId: number, motivo?: string) {
  const session = await assertSuperadmin();

  const imagen = await prisma.imagenPerfil.findUnique({
    where: { id: imagenId },
    select: { id: true, estado: true },
  });

  if (!imagen) {
    return { success: false as const, error: "La imagen no existe" };
  }

  // A proposito NO se toca `User.avatarUrl`: si el usuario ya tenia una foto
  // aprobada, se sigue viendo esa. Rechazar la nueva no lo deja sin avatar.
  await prisma.imagenPerfil.update({
    where: { id: imagen.id },
    data: {
      estado: "RECHAZADA",
      moderadaPorId: session.userId,
      moderadaAt: new Date(),
      motivoRechazo: motivo?.trim() ? motivo.trim().slice(0, 300) : null,
    },
  });

  revalidatePath("/superadmin/imagenes");
  return { success: true as const };
}
