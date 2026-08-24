/**
 * Realinea `Complejo.slug` con el nombre del complejo.
 *
 * Ejecutar con: npm run backfill:slug
 *
 * El slug paso a ser la URL publica del club (/complejos/<slug>), pero en la
 * base hay slugs escritos a mano que no coinciden con el nombre: el seed
 * guardaba "complejo-demo" para "Complejo Demo PadelNet". Este script los
 * recalcula con la misma funcion que usa el alta real.
 *
 * Es idempotente: solo escribe las filas cuyo slug no coincide con el que les
 * corresponde.
 */

import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../lib/generated/prisma/client";
import { SLUGS_RESERVADOS, slugify } from "../lib/slug";

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error("Falta DATABASE_URL");
}

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(url) });

async function main() {
  const complejos = await prisma.complejo.findMany({
    orderBy: { id: "asc" },
    select: { id: true, name: true, slug: true },
  });

  // 1. Slug que le corresponde a cada uno. Las colisiones se resuelven con el
  //    mismo sufijo que generateUniqueSlug() en actions/complejos.ts, y gana el
  //    de id mas bajo.
  const deseados = new Map<number, string>();
  const usados = new Set<string>();

  for (const complejo of complejos) {
    const base = slugify(complejo.name);
    let candidato = base;
    let index = 2;

    while (SLUGS_RESERVADOS.has(candidato) || usados.has(candidato)) {
      candidato = `${base}-${index}`;
      index += 1;
    }

    usados.add(candidato);
    deseados.set(complejo.id, candidato);
  }

  const cambios = complejos.filter(
    (complejo) => deseados.get(complejo.id) !== complejo.slug,
  );

  if (cambios.length === 0) {
    console.log(`Listo: los ${complejos.length} complejos ya estan alineados`);
    return;
  }

  // 2. Se libera el slug viejo de todos los que cambian antes de asignar los
  //    nuevos. Sin este paso, darle a uno el slug que todavia tiene otro (que a
  //    su vez esta por soltarlo) choca contra el indice unico.
  await prisma.$transaction(async (tx) => {
    for (const complejo of cambios) {
      await tx.complejo.update({
        where: { id: complejo.id },
        data: { slug: `tmp-backfill-${complejo.id}` },
      });
    }

    for (const complejo of cambios) {
      await tx.complejo.update({
        where: { id: complejo.id },
        data: { slug: deseados.get(complejo.id) },
      });
    }
  });

  for (const complejo of cambios) {
    console.log(
      `Complejo ${complejo.id} (${complejo.name}): ${complejo.slug} -> ${deseados.get(complejo.id)}`,
    );
  }

  console.log(
    `Listo: ${cambios.length} de ${complejos.length} complejos actualizados`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
