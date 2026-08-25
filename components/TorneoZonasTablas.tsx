import type { TorneoGrupoCard } from "@/lib/torneo-vista-publica";

/**
 * Tablas de posiciones de las zonas, una card por zona.
 *
 * Salio de la pagina publica del torneo para poder mostrar lo mismo en la
 * pantalla de resultados del admin: la idea es que el admin revise exactamente
 * lo que va a ver el jugador, no una version parecida.
 */
export default function TorneoZonasTablas({
  grupos,
  emptyMessage,
}: {
  grupos: TorneoGrupoCard[];
  emptyMessage: string;
}) {
  if (grupos.length === 0) {
    return (
      <p className="rounded-2xl border border-content/10 bg-surface-soft px-4 py-6 text-center text-sm text-content/70">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {grupos.map((grupo) => (
        <article
          key={grupo.id}
          className="overflow-hidden rounded-2xl border border-content/10"
        >
          <div className="border-b border-content/10 bg-gradient-to-r from-padel-green/15 via-surface to-energy-orange/15 px-4 py-3">
            <h2 className="text-lg font-semibold text-content">
              {grupo.nombre}
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-surface-soft text-content/80">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Pareja</th>
                  <th className="px-3 py-2 text-right font-semibold">Pts</th>
                  <th className="px-3 py-2 text-right font-semibold">PG</th>
                  <th className="px-3 py-2 text-right font-semibold">PP</th>
                  <th className="px-3 py-2 text-right font-semibold">SG</th>
                  <th className="px-3 py-2 text-right font-semibold">SP</th>
                  <th className="px-3 py-2 text-right font-semibold">GG</th>
                  <th className="px-3 py-2 text-right font-semibold">GP</th>
                </tr>
              </thead>
              <tbody>
                {grupo.rows.map((row, index) => (
                  <tr
                    key={row.parejaId}
                    className={`transition hover:bg-padel-green/10 ${
                      index % 2 === 0 ? "bg-surface" : "bg-surface-soft/50"
                    }`}
                  >
                    <td className="px-3 py-2 font-medium text-content">
                      {row.parejaNombre}
                    </td>
                    <td className="px-3 py-2 text-right">{row.pts}</td>
                    <td className="px-3 py-2 text-right">{row.pg}</td>
                    <td className="px-3 py-2 text-right">{row.pp}</td>
                    <td className="px-3 py-2 text-right">{row.sg}</td>
                    <td className="px-3 py-2 text-right">{row.sp}</td>
                    <td className="px-3 py-2 text-right">{row.gg}</td>
                    <td className="px-3 py-2 text-right">{row.gp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      ))}
    </div>
  );
}
