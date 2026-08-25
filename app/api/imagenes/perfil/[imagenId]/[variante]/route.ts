import { NextResponse } from "next/server";
import { readFile } from "fs/promises";

import { esSuperadmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import {
  contentType,
  esVariante,
  rutaDeArchivo,
  type Variante,
} from "@/lib/imagenes-perfil-rutas";

export const runtime = "nodejs";

/**
 * Sirve una foto de perfil.
 *
 * Es el unico camino a los archivos, que estan fuera de `public/`, y por eso
 * es donde se aplica la moderacion:
 *
 *   - APROBADA: publica. La URL lleva el id de la fila, que no se reusa nunca,
 *     asi que el contenido de una URL dada no cambia jamas y se puede cachear
 *     para siempre. Aprobar una foto nueva genera una URL nueva.
 *   - PENDIENTE o RECHAZADA: solo su dueño y el superadmin.
 *
 * Para el resto se responde 404 y no 403: un 403 confirmaria que la imagen
 * existe, que es justo lo que no queremos filtrar de una foto sin aprobar.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ imagenId: string; variante: string }> },
) {
  const { imagenId, variante } = await params;

  if (!esVariante(variante)) {
    return new NextResponse(null, { status: 404 });
  }

  const id = Number(imagenId);
  if (!Number.isInteger(id) || id <= 0) {
    return new NextResponse(null, { status: 404 });
  }

  const imagen = await prisma.imagenPerfil.findUnique({
    where: { id },
    select: {
      userId: true,
      estado: true,
      archivoImagen: true,
      archivoAvatar: true,
    },
  });

  if (!imagen) {
    return new NextResponse(null, { status: 404 });
  }

  const aprobada = imagen.estado === "APROBADA";

  if (!aprobada) {
    const session = await getSession();
    const esDueno = session?.userId === imagen.userId;

    if (!esDueno && !(await esSuperadmin())) {
      return new NextResponse(null, { status: 404 });
    }
  }

  const archivo = elegirArchivo(imagen, variante);

  let bytes: Buffer;
  try {
    bytes = await readFile(rutaDeArchivo(imagen.userId, archivo));
  } catch {
    // La fila existe pero el archivo no. Pasa si se limpio el disco a mano;
    // desde afuera es indistinguible de que no exista.
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentType(archivo),
      "Content-Length": String(bytes.length),
      "Cache-Control": aprobada
        ? "public, max-age=31536000, immutable"
        : "private, no-store",
    },
  });
}

function elegirArchivo(
  imagen: { archivoImagen: string; archivoAvatar: string },
  variante: Variante,
) {
  return variante === "avatar" ? imagen.archivoAvatar : imagen.archivoImagen;
}
