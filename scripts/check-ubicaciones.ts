/**
 * Controla el dataset de provincias y localidades.
 *
 * `lib/ubicaciones.ts` y `public/data/localidades-ar.json` son data commiteada a
 * mano: si se desincronizan (un id que no existe, una provincia sin localidades,
 * nombres repetidos), el combo de localidad queda vacio y nadie se entera hasta
 * que un usuario intenta cargar su perfil.
 *
 *   npm run check:ubicaciones
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import {
  PROVINCIAS,
  normalizarTexto,
  type LocalidadesPorProvincia,
} from "../lib/ubicaciones";

const RAIZ = path.resolve(__dirname, "..");
const JSON_PATH = path.join(RAIZ, "public/data/localidades-ar.json");

/** 23 provincias + CABA. */
const PROVINCIAS_ESPERADAS = 24;

function main() {
  const fallas: string[] = [];

  let localidades: LocalidadesPorProvincia;
  try {
    localidades = JSON.parse(
      readFileSync(JSON_PATH, "utf-8"),
    ) as LocalidadesPorProvincia;
  } catch (error) {
    console.error(
      `check:ubicaciones FALLO - no se pudo leer ${JSON_PATH}:`,
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
    return;
  }

  if (PROVINCIAS.length !== PROVINCIAS_ESPERADAS) {
    fallas.push(
      `PROVINCIAS tiene ${PROVINCIAS.length} entradas y deberian ser ${PROVINCIAS_ESPERADAS}`,
    );
  }

  const ids = new Set<string>();
  const nombres = new Set<string>();

  for (const provincia of PROVINCIAS) {
    if (ids.has(provincia.id)) {
      fallas.push(`id de provincia repetido: ${provincia.id}`);
    }
    ids.add(provincia.id);

    const nombre = normalizarTexto(provincia.nombre);
    if (nombres.has(nombre)) {
      fallas.push(`nombre de provincia repetido: ${provincia.nombre}`);
    }
    nombres.add(nombre);

    const propias = localidades[provincia.id];
    if (!propias || propias.length === 0) {
      fallas.push(`${provincia.nombre} (${provincia.id}) no tiene localidades`);
      continue;
    }

    const vistas = new Set<string>();
    for (const localidad of propias) {
      const clave = normalizarTexto(localidad);
      if (!clave) {
        fallas.push(`${provincia.nombre} tiene una localidad vacia`);
        continue;
      }
      if (vistas.has(clave)) {
        fallas.push(`${provincia.nombre} repite la localidad "${localidad}"`);
      }
      vistas.add(clave);
    }
  }

  for (const id of Object.keys(localidades)) {
    if (!ids.has(id)) {
      fallas.push(`el JSON trae el id ${id}, que no esta en PROVINCIAS`);
    }
  }

  if (fallas.length > 0) {
    console.error(`check:ubicaciones FALLO - ${fallas.length} problema(s):\n`);
    for (const falla of fallas) {
      console.error(`  ${falla}`);
    }
    process.exitCode = 1;
    return;
  }

  const total = Object.values(localidades).reduce(
    (acc, lista) => acc + lista.length,
    0,
  );
  console.log(
    `check:ubicaciones OK - ${PROVINCIAS.length} provincias y ${total} localidades`,
  );
}

main();
