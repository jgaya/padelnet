import Link from "next/link";

export type Miga = {
  label: string;
  /** Sin href, el tramo se muestra como texto: es la pagina actual. */
  href?: string;
};

/**
 * Migas de pan para la gestion, que tiene hasta 5 niveles
 * (complejo -> evento -> torneo -> seccion).
 *
 * En pantallas chicas no parte en varias lineas ni hace scroll horizontal: se
 * colapsan los tramos del medio y quedan el primero, unos puntos suspensivos y
 * los dos ultimos. El anteultimo es el que sirve para volver, asi que siempre se
 * ve. De `sm` en adelante se muestran todos.
 *
 * Es CSS puro: nada de medir anchos ni JavaScript.
 */
export default function Breadcrumbs({ migas }: { migas: Miga[] }) {
  if (migas.length === 0) return null;

  const ultimoIndex = migas.length - 1;
  // Con 3 tramos o menos entran todos aun en un telefono angosto.
  const colapsa = migas.length > 3;

  const separador = (
    <span aria-hidden="true" className="text-deep-black/30">
      /
    </span>
  );

  return (
    <nav aria-label="Ruta" className="mb-3 text-sm">
      <ol className="flex flex-nowrap items-center gap-1.5 overflow-hidden">
        {migas.map((miga, index) => {
          const ultima = index === ultimoIndex;
          // Del medio = ni el primero ni los dos ultimos.
          const delMedio = colapsa && index > 0 && index < ultimoIndex - 1;

          return (
            <li
              key={`${index}-${miga.label}`}
              className={
                delMedio
                  ? "hidden shrink-0 items-center gap-1.5 sm:flex"
                  : "flex min-w-0 shrink items-center gap-1.5"
              }
            >
              {index > 0 ? separador : null}
              {miga.href && !ultima ? (
                <Link
                  href={miga.href}
                  className="truncate text-deep-black/70 transition hover:text-padel-green"
                >
                  {miga.label}
                </Link>
              ) : (
                <span
                  aria-current={ultima ? "page" : undefined}
                  className="truncate font-semibold text-deep-black"
                >
                  {miga.label}
                </span>
              )}

              {/* Reemplaza a los tramos escondidos, solo en pantallas chicas. */}
              {colapsa && index === 0 ? (
                <span className="flex items-center gap-1.5 sm:hidden">
                  {separador}
                  <span aria-hidden="true" className="text-deep-black/40">
                    …
                  </span>
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
