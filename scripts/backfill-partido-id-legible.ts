/**
 * Completa `Partido.idLegible` en los partidos creados antes de que existiera
 * el campo.
 *
 * Ejecutar con: npm run backfill:id-legible
 *
 * La grilla nueva escribe el id al crear cada partido, pero los torneos ya
 * generados quedan con el campo en null y no aparecen en el buscador de la
 * pantalla de resultados. El script es idempotente: solo toca las filas con
 * `idLegible` nulo o vacio.
 */

import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../lib/generated/prisma/client";
import { buildPartidoIdLegible } from "../lib/partido-id-legible";

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error("Falta DATABASE_URL");
}

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(url) });

async function main() {
  const torneos = await prisma.torneo.findMany({
    where: {
      partidos: {
        some: {
          deletedAt: null,
          OR: [{ idLegible: null }, { idLegible: "" }],
        },
      },
    },
    select: {
      id: true,
      nombre: true,
      categoriaCode: true,
      evento: { select: { nombre: true } },
    },
  });

  let actualizados = 0;

  for (const torneo of torneos) {
    // Se recorren todos los partidos del torneo, no solo los que faltan: el
    // contador por zona tiene que numerar igual que la generacion original.
    const partidos = await prisma.partido.findMany({
      where: { torneoId: torneo.id, deletedAt: null },
      orderBy: [{ scheduledAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        idLegible: true,
        llave: true,
        grupo: { select: { nombre: true } },
      },
    });

    const numeroPorZona = new Map<string, number>();

    for (const partido of partidos) {
      const grupoNombre = partido.grupo?.nombre ?? null;
      const clave = grupoNombre ?? "SIN_ZONA";
      const numero = (numeroPorZona.get(clave) ?? 0) + 1;
      numeroPorZona.set(clave, numero);

      if (partido.idLegible) continue;

      await prisma.partido.update({
        where: { id: partido.id },
        data: {
          idLegible: buildPartidoIdLegible({
            eventoNombre: torneo.evento.nombre,
            categoria: torneo.categoriaCode,
            grupoNombre,
            llave: partido.llave,
            numero,
          }),
        },
      });

      actualizados += 1;
    }

    console.log(`Torneo ${torneo.id} (${torneo.nombre}): ${partidos.length} partidos revisados`);
  }

  console.log(`Listo: ${actualizados} partidos actualizados`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
