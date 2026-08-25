import "server-only";

import path from "path";
import { mkdir, rm, writeFile } from "fs/promises";
import { randomUUID } from "crypto";

import {
  directorioDeUsuario,
  rutaDeArchivo,
} from "@/lib/imagenes-perfil-rutas";

/**
 * Escritura y borrado de las fotos de perfil.
 *
 * Los archivos viven fuera de `public/` (ver lib/imagenes-perfil-rutas.ts) y
 * los unicos bytes que salen a la red pasan por
 * app/api/imagenes/perfil/[imagenId]/[variante]/route.ts, que mira el estado
 * de la fila antes de entregarlos.
 */

export type ArchivoImagen = {
  buffer: Buffer;
  ext: "png" | "jpg";
};

/**
 * Firmas de archivo. El mime que viene en el data url lo escribe el cliente,
 * asi que no prueba nada: sin este chequeo alcanza con mandar
 * `data:image/png;base64,<lo que sea>` para dejar cualquier contenido en el
 * disco con extension .png.
 */
const FIRMAS: Record<"png" | "jpg", number[]> = {
  png: [0x89, 0x50, 0x4e, 0x47],
  jpg: [0xff, 0xd8, 0xff],
};

function firmaCoincide(buffer: Buffer, ext: "png" | "jpg") {
  const firma = FIRMAS[ext];
  if (buffer.length < firma.length) return false;
  return firma.every((byte, i) => buffer[i] === byte);
}

const MAX_BYTES = 5 * 1024 * 1024;

export function parsearDataUrl(dataUrl: string, label: string): ArchivoImagen {
  const match = /^data:(image\/(?:png|jpeg|jpg));base64,(.+)$/i.exec(dataUrl);
  if (!match) {
    throw new Error(`Formato de ${label} invalido`);
  }

  const mime = match[1].toLowerCase();
  const buffer = Buffer.from(match[2], "base64");
  const ext = mime === "image/png" ? "png" : "jpg";

  if (buffer.length === 0) {
    throw new Error(`${label} vacio`);
  }

  if (buffer.length > MAX_BYTES) {
    throw new Error(`${label} supera el maximo permitido`);
  }

  if (!firmaCoincide(buffer, ext)) {
    throw new Error(`${label} no es una imagen ${ext} valida`);
  }

  return { buffer, ext };
}

export async function guardarArchivos(
  userId: number,
  archivos: { imagen: ArchivoImagen; avatar: ArchivoImagen },
) {
  const dir = directorioDeUsuario(userId);
  await mkdir(dir, { recursive: true });

  // El mismo sufijo para los dos, asi se ve de un vistazo que son el par de la
  // misma subida.
  const sufijo = `${Date.now()}-${randomUUID()}`;
  const archivoImagen = `image-${sufijo}.${archivos.imagen.ext}`;
  const archivoAvatar = `avatar-${sufijo}.${archivos.avatar.ext}`;

  await writeFile(path.join(dir, archivoImagen), archivos.imagen.buffer);
  await writeFile(path.join(dir, archivoAvatar), archivos.avatar.buffer);

  return { archivoImagen, archivoAvatar };
}

/**
 * Borra archivos sin quejarse si ya no estan. Se llama al reemplazar una
 * imagen pendiente y al aprobar una nueva, donde un archivo faltante no es un
 * error: el resultado buscado es que no exista.
 */
export async function borrarArchivos(userId: number, archivos: string[]) {
  await Promise.all(
    archivos
      .filter(Boolean)
      .map((archivo) => rm(rutaDeArchivo(userId, archivo), { force: true })),
  );
}
