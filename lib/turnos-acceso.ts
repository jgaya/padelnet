import "server-only";
import { cache } from "react";

import { getEnabledComplejosForFeature } from "@/actions/complejo-features";
import { getAlcanceComplejos } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import type { ComplejoConTurnos } from "@/lib/turnos-menu";

/**
 * Complejos del usuario actual que tienen la funcionalidad TURNOS prendida.
 *
 * Lo usan el menu superior y la pantalla selectora `/admin/turnos`, para que
 * los dos coincidan en que complejos ofrecer.
 *
 * Va envuelto en `cache` de React porque el header se renderiza en cada
 * navegacion: si la pagina tambien lo pide, la base se toca una sola vez.
 */
export const getComplejosConTurnos = cache(
  async (): Promise<ComplejoConTurnos[]> => {
    const alcance = await getAlcanceComplejos();
    if (!alcance) return [];

    const complejos = await prisma.complejo.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        // El superadmin ve todos; el admin, solo los que administra.
        ...(alcance.tipo === "todos" ? {} : { id: { in: alcance.complejoIds } }),
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    if (complejos.length === 0) return [];

    const habilitados = await getEnabledComplejosForFeature(
      "TURNOS",
      complejos.map((complejo) => complejo.id),
    );

    return complejos.filter((complejo) => habilitados.has(complejo.id));
  },
);
