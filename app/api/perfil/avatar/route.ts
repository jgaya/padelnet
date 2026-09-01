import { NextResponse } from "next/server";

import { enTransaccion, prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import {
  borrarArchivos,
  guardarArchivos,
  parsearDataUrl,
} from "@/lib/imagenes-perfil";
import { urlDeImagen } from "@/lib/imagenes-perfil-rutas";

export const runtime = "nodejs";

/**
 * Subida de la foto de perfil.
 *
 * Deja la imagen en estado PENDIENTE y **no toca `User.avatarUrl`**: hasta que
 * el superadmin la apruebe desde /superadmin/imagenes, la foto no se ve en
 * ningun lado salvo para su dueño. Si el usuario ya tenia una aprobada, esa se
 * sigue viendo mientras tanto.
 *
 * Las URLs que devuelve son de la ruta privada
 * (/api/imagenes/perfil/<id>/<variante>), que a quien no es el dueño ni
 * superadmin le responde 404.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 });
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 });
  }

  const { imageDataUrl, avatarDataUrl } = payload as {
    imageDataUrl?: unknown;
    avatarDataUrl?: unknown;
  };

  if (typeof imageDataUrl !== "string" || typeof avatarDataUrl !== "string") {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  let imagen;
  let avatar;
  try {
    imagen = parsearDataUrl(imageDataUrl, "imagen");
    avatar = parsearDataUrl(avatarDataUrl, "avatar");
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Datos invalidos" },
      { status: 400 },
    );
  }

  const userId = session.userId;

  // Una sola pendiente por usuario. Si no, diez intentos seguidos de encontrar
  // el recorte que le gusta son diez filas en la cola de moderacion.
  const anterior = await prisma.imagenPerfil.findFirst({
    where: { userId, estado: "PENDIENTE" },
    select: { id: true, archivoImagen: true, archivoAvatar: true },
  });

  const archivos = await guardarArchivos(userId, { imagen, avatar });

  const creada = await enTransaccion(async (tx) => {
    if (anterior) {
      await tx.imagenPerfil.delete({ where: { id: anterior.id } });
    }

    return tx.imagenPerfil.create({
      data: { userId, ...archivos },
      select: { id: true, estado: true },
    });
  });

  if (anterior) {
    // Despues de la transaccion: si falla, lo unico que queda es un archivo
    // suelto que ya no referencia nadie.
    await borrarArchivos(userId, [
      anterior.archivoImagen,
      anterior.archivoAvatar,
    ]);
  }

  return NextResponse.json({
    imagenId: creada.id,
    estado: creada.estado,
    imageUrl: urlDeImagen(creada.id, "imagen"),
    avatarUrl: urlDeImagen(creada.id, "avatar"),
  });
}
