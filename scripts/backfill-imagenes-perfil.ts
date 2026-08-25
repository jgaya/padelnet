/**
 * Migra las fotos de perfil que estaban en `public/uploads` al almacenamiento
 * privado y las da por aprobadas.
 *
 * Ejecutar con: npm run backfill:imagenes
 *
 * Antes de la moderacion, las fotos se escribian en `public/uploads/users/<id>/`
 * y `User.avatarUrl` guardaba esa ruta. Como Next sirve `public/` como
 * estatico, esas imagenes eran publicas desde que se subian. Ahora viven en
 * `var/uploads/` y solo salen por /api/imagenes/perfil/<id>/<variante>, que
 * mira el estado de moderacion.
 *
 * Las que ya estaban se dan por APROBADAS (con `moderadaPorId` en null: nadie
 * las reviso, se heredaron), asi que nadie pierde su foto con el cambio.
 *
 * Ademas limpia las URLs remotas. Quien entro con Google tenia en `imageUrl` la
 * foto de su cuenta de Google (https://lh3.googleusercontent.com/...), que se
 * publicaba sin que nadie la revisara. Ya no se copia al entrar
 * (actions/auth-google.ts) y aca se borran las que habian quedado: esos
 * usuarios pasan a ver sus iniciales hasta que suban una foto y se la aprueben.
 *
 * Es idempotente: saltea a quien ya apunta a /api/imagenes/perfil/.
 */

import "dotenv/config";
import path from "path";
import { mkdir, rename, access } from "fs/promises";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../lib/generated/prisma/client";
import {
  directorioDeUsuario,
  urlDeImagen,
} from "../lib/imagenes-perfil-rutas";

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error("Falta DATABASE_URL");
}

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(url) });

const PREFIJO_VIEJO = "/uploads/";
const PUBLIC_DIR = path.join(process.cwd(), "public");

async function existe(ruta: string) {
  try {
    await access(ruta);
    return true;
  } catch {
    return false;
  }
}

/** Ultimo segmento de una ruta tipo /uploads/users/7/avatar-123.png */
function nombreDeArchivo(urlVieja: string) {
  return path.basename(urlVieja);
}

async function main() {
  const usuarios = await prisma.user.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      avatarUrl: true,
      imageUrl: true,
      createdAt: true,
    },
  });

  let migrados = 0;
  let salteados = 0;
  let sinArchivo = 0;
  let remotasBorradas = 0;

  for (const usuario of usuarios) {
    const { avatarUrl, imageUrl } = usuario;

    // Fotos remotas (Google). Nunca pasaron por moderacion y `avatarUrl` /
    // `imageUrl` ahora significan "foto aprobada", asi que se limpian.
    const remotas = [avatarUrl, imageUrl].some((valor) =>
      valor?.startsWith("http"),
    );

    if (remotas) {
      await prisma.user.update({
        where: { id: usuario.id },
        data: {
          avatarUrl: avatarUrl?.startsWith("http") ? null : avatarUrl,
          imageUrl: imageUrl?.startsWith("http") ? null : imageUrl,
        },
      });
      remotasBorradas++;
      console.log(`usuario ${usuario.id}: foto remota borrada`);
      continue;
    }

    // Solo las rutas locales viejas. Las remotas (Google) y las que ya estan
    // migradas no se tocan.
    const avatarLocal = avatarUrl?.startsWith(PREFIJO_VIEJO) ? avatarUrl : null;
    const imagenLocal = imageUrl?.startsWith(PREFIJO_VIEJO) ? imageUrl : null;

    if (!avatarLocal && !imagenLocal) {
      salteados++;
      continue;
    }

    // El modelo guarda el par: si falta uno de los dos, se usa el otro para
    // las dos variantes. Es lo que ya pasaba en pantalla, donde el fallback
    // era `avatarUrl || imageUrl`.
    const urlAvatar = avatarLocal ?? imagenLocal!;
    const urlImagen = imagenLocal ?? avatarLocal!;

    const archivoAvatar = nombreDeArchivo(urlAvatar);
    const archivoImagen = nombreDeArchivo(urlImagen);

    const origenAvatar = path.join(PUBLIC_DIR, urlAvatar);
    const origenImagen = path.join(PUBLIC_DIR, urlImagen);

    if (!(await existe(origenAvatar)) || !(await existe(origenImagen))) {
      console.warn(
        `usuario ${usuario.id}: falta el archivo en disco, se deja como esta (${urlAvatar})`,
      );
      sinArchivo++;
      continue;
    }

    const destinoDir = directorioDeUsuario(usuario.id);
    await mkdir(destinoDir, { recursive: true });

    await rename(origenAvatar, path.join(destinoDir, archivoAvatar));
    if (archivoImagen !== archivoAvatar) {
      await rename(origenImagen, path.join(destinoDir, archivoImagen));
    }

    // La fila y las URLs del usuario se escriben juntas: si el proceso muere
    // en el medio, no queda un usuario apuntando a una imagen que no existe.
    await prisma.$transaction(async (tx) => {
      const imagen = await tx.imagenPerfil.create({
        data: {
          userId: usuario.id,
          archivoImagen,
          archivoAvatar,
          estado: "APROBADA",
          moderadaAt: usuario.createdAt,
        },
        select: { id: true },
      });

      await tx.user.update({
        where: { id: usuario.id },
        data: {
          avatarUrl: urlDeImagen(imagen.id, "avatar"),
          imageUrl: urlDeImagen(imagen.id, "imagen"),
        },
      });
    });

    migrados++;
    console.log(`usuario ${usuario.id}: migrado`);
  }

  console.log(
    `\nbackfill:imagenes OK - ${migrados} migradas, ${remotasBorradas} remotas borradas, ${salteados} sin foto local, ${sinArchivo} con el archivo faltante`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
