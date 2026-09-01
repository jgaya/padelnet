import type { LogroDelJugador } from "@/actions/logros";

import MedallaLogro from "./MedallaLogro";

/**
 * Grilla de logros.
 *
 * Los obtenidos primero: es lo que la persona quiere ver, y deja los pendientes
 * abajo como objetivo.
 */
export default function PanelLogros({
  logros,
  titulo = "Mis logros",
  soloObtenidos = false,
}: {
  logros: LogroDelJugador[];
  titulo?: string;
  soloObtenidos?: boolean;
}) {
  if (!logros.length) {
    return (
      <div className="rounded-2xl border border-dashed border-content/20 bg-surface-soft px-5 py-8 text-center text-sm text-content/70">
        {soloObtenidos
          ? "Todavia no consiguio ningun logro."
          : "Todavia no hay logros para conseguir. Volve cuando juegues tu primer partido."}
      </div>
    );
  }

  const ordenados = [...logros].sort((a, b) => {
    if (a.obtenido !== b.obtenido) return a.obtenido ? -1 : 1;
    return 0;
  });

  const obtenidos = logros.filter((logro) => logro.obtenido).length;

  return (
    <section className="rounded-2xl border border-content/10 bg-surface p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-content">{titulo}</h2>
        {!soloObtenidos ? (
          <span className="text-sm text-content/60">
            {obtenidos} de {logros.length}
          </span>
        ) : null}
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {ordenados.map((logro) => (
          <li key={logro.id}>
            <MedallaLogro
              titulo={logro.titulo}
              descripcion={logro.descripcion}
              icono={logro.icono}
              rareza={logro.rareza}
              obtenido={logro.obtenido}
              progreso={logro.progreso}
              progresoObjetivo={logro.progresoObjetivo}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
