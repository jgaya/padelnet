import "server-only";

import { cache } from "react";
import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

/**
 * Resolucion del parametro de las URLs publicas de un complejo.
 *
 * La URL canonica es el slug (/complejos/complejo-demo-padelnet), pero antes
 * era el id (/complejos/3) y esos links siguen dando vueltas en favoritos y en
 * lo que la gente compartio, asi que tambien se aceptan y se redirigen.
 *
 * Las actions publicas siguen recibiendo el id: aca se traduce una sola vez y
 * el resto del arbol no se entera.
 */

/**
 * Envuelto en `cache` de React para que el layout y la pagina del mismo render
 * no consulten dos veces, igual que lib/breadcrumbs-gestion.ts.
 */
export const resolveComplejoPublico = cache(
  async (param: string): Promise<{ id: number; slug: string } | null> => {
    const valor = param?.trim();
    if (!valor) return null;

    // Mismo criterio de visibilidad que COMPLEJO_PUBLICO_WHERE en
    // actions/complejos-public.ts: un complejo dado de baja no tiene pagina.
    const where = /^\d+$/.test(valor) ? { id: Number(valor) } : { slug: valor };

    return prisma.complejo.findFirst({
      where: { ...where, deletedAt: null, isActive: true },
      select: { id: true, slug: true },
    });
  },
);

/**
 * Resuelve el parametro para una pantalla publica del complejo: corta con 404
 * si no existe y manda a la URL canonica si entraron por id.
 *
 * `seccion` es el tramo que sigue al slug ("eventos", "ranking", ...), y lo
 * pasa cada pagina porque el redirect tiene que conservarlo. Ojo: esto no puede
 * vivir en el layout, que se renderiza en paralelo con la pagina y no conoce la
 * seccion; desde ahi el redirect se comeria el resto de la URL.
 */
export async function requireComplejoPublico(
  param: string,
  seccion?: string,
): Promise<number> {
  const complejo = await resolveComplejoPublico(param);

  if (!complejo) {
    notFound();
  }

  if (param !== complejo.slug) {
    redirect(`/complejos/${complejo.slug}${seccion ? `/${seccion}` : ""}`);
  }

  return complejo.id;
}
