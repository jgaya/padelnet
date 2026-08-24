/**
 * Slugs para las URLs publicas.
 *
 * Vivia como funcion privada de actions/complejos.ts, que al ser "use server"
 * no puede exportar funciones sincronas. Se movio aca para que la use tambien
 * el backfill de scripts/backfill-complejo-slug.ts y el seed: si cada uno arma
 * el slug a su manera, la misma pantalla queda con dos URLs distintas segun por
 * donde se cargo el dato.
 */

/** "Complejo Demo PadelNet" -> "complejo-demo-padelnet". */
export function slugify(value: string): string {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return normalized || "complejo";
}

/**
 * Segmentos que ya existen como ruta estatica bajo /complejos y por lo tanto no
 * puede tomar ningun slug: la ruta estatica gana y el complejo quedaria
 * inalcanzable. Un club llamado "New" cae justo en este caso.
 */
export const SLUGS_RESERVADOS = new Set(["new"]);
