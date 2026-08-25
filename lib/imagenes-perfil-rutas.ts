import path from "path";

/**
 * Donde vive cada foto de perfil y con que URL se la pide.
 *
 * Esta separado de lib/imagenes-perfil.ts, que lleva `import "server-only"`,
 * porque los scripts de `scripts/` corren con tsx y ahi `server-only` no
 * resuelve (lo provee el compilador de Next, no un paquete de node). El
 * backfill necesita justamente estas dos cosas: la carpeta y el formato de la
 * URL. Aca no hay acceso a disco ni a la base, solo strings.
 */

/**
 * Raiz del almacenamiento. FUERA de `public/` a proposito: lo que esta en
 * `public/` lo sirve Next como estatico, y entonces una foto seria publica
 * desde que se sube, sin importar su estado de moderacion.
 *
 * En produccion conviene apuntar UPLOADS_DIR a una ruta fuera del directorio
 * del deploy, para que las fotos sobrevivan a un build limpio.
 */
export const RAIZ_UPLOADS =
  process.env.UPLOADS_DIR ?? path.join(process.cwd(), "var", "uploads");

export const VARIANTES = ["imagen", "avatar"] as const;
export type Variante = (typeof VARIANTES)[number];

export function esVariante(valor: string): valor is Variante {
  return (VARIANTES as readonly string[]).includes(valor);
}

export function directorioDeUsuario(userId: number) {
  return path.join(RAIZ_UPLOADS, "users", String(userId));
}

/**
 * Ruta absoluta de un archivo. `path.basename` es cinturon y tirantes: el
 * nombre siempre sale de la base y nunca de la URL, pero si alguna vez alguien
 * lo pasa desde otro lado, esto corta cualquier `../`.
 */
export function rutaDeArchivo(userId: number, archivo: string) {
  return path.join(directorioDeUsuario(userId), path.basename(archivo));
}

/**
 * La URL lleva el id de la fila y no el nombre del archivo. Como el id no se
 * reusa nunca, el contenido de una URL dada no cambia jamas: se puede cachear
 * para siempre y aprobar una foto nueva genera una URL nueva.
 */
export function urlDeImagen(imagenId: number, variante: Variante) {
  return `/api/imagenes/perfil/${imagenId}/${variante}`;
}

export function contentType(archivo: string) {
  return archivo.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
}
