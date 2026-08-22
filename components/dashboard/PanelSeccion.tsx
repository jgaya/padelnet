import type { ReactNode } from "react";

type PanelSeccionProps = {
  titulo: string;
  /** A la derecha del titulo: un total, un selector, lo que haga falta. */
  extra?: ReactNode;
  /** Si esta vacio se muestra este texto en lugar del contenido. */
  vacio?: boolean;
  textoVacio?: string;
  children: ReactNode;
};

/**
 * El marco de cada tarjeta del dashboard.
 *
 * Centraliza el estado vacio: un grafico sin datos tiene que decir que no hay
 * datos, no dibujar unos ejes pelados que parecen un error de carga.
 */
export default function PanelSeccion({
  titulo,
  extra,
  vacio = false,
  textoVacio = "Todavia no hay datos para mostrar.",
  children,
}: PanelSeccionProps) {
  return (
    <section className="rounded-2xl border border-deep-black/10 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-deep-black/10 px-4 py-3">
        <h2 className="text-base font-semibold text-deep-black">{titulo}</h2>
        {extra}
      </div>
      <div className="px-4 py-4">
        {vacio ? (
          <p className="py-6 text-center text-sm text-deep-black/60">
            {textoVacio}
          </p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
