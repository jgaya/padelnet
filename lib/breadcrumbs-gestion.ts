import { cache } from "react";

import { prisma } from "@/lib/prisma";
import type { Miga } from "@/components/Breadcrumbs";

/**
 * Arma las migas del arbol de gestion resolviendo los nombres a partir de los
 * ids que la pagina ya tiene en `params`.
 *
 * Va por helper y no por layout porque los layouts anidados se apilan: uno por
 * nivel dibujaria una barra de migas por nivel. Cada pagina pide las suyas.
 *
 * Las consultas van envueltas en `cache` de React, asi que si dos partes del
 * mismo render piden el mismo complejo o torneo, la base se toca una sola vez.
 */

const getComplejoNombre = cache(async (complejoId: number) => {
  const complejo = await prisma.complejo.findUnique({
    where: { id: complejoId },
    select: { name: true },
  });

  return complejo?.name ?? "Complejo";
});

const getEventoNombre = cache(async (eventoId: number) => {
  const evento = await prisma.evento.findUnique({
    where: { id: eventoId },
    select: { nombre: true },
  });

  return evento?.nombre ?? "Evento";
});

const getTorneoNombre = cache(async (torneoId: number) => {
  const torneo = await prisma.torneo.findUnique({
    where: { id: torneoId },
    select: { nombre: true },
  });

  return torneo?.nombre ?? "Torneo";
});

export type MigasGestionArgs = {
  complejoId: number;
  eventoId?: number;
  torneoId?: number;
  /** Ultimo tramo, el de la pantalla actual: "Zonas", "Partidos", etc. */
  seccion?: string;
  /** Base del arbol. El superadmin navega por /superadmin/complejos. */
  base?: string;
};

export async function migasGestion({
  complejoId,
  eventoId,
  torneoId,
  seccion,
  base = "/admin/complejos",
}: MigasGestionArgs): Promise<Miga[]> {
  const migas: Miga[] = [{ label: "Complejos", href: base }];

  migas.push({
    label: await getComplejoNombre(complejoId),
    href: `${base}/${complejoId}/eventos`,
  });

  if (eventoId !== undefined) {
    migas.push({
      label: await getEventoNombre(eventoId),
      href: `${base}/${complejoId}/eventos/${eventoId}`,
    });
  }

  if (eventoId !== undefined && torneoId !== undefined) {
    migas.push({
      label: await getTorneoNombre(torneoId),
      href: `${base}/${complejoId}/eventos/${eventoId}/torneos/${torneoId}`,
    });
  }

  if (seccion) {
    migas.push({ label: seccion });
  }

  // La ultima nunca es un link: es la pagina en la que ya estamos.
  const ultima = migas[migas.length - 1];
  if (ultima) delete ultima.href;

  return migas;
}
