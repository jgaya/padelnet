import type { TorneoGrupoCard } from "@/lib/torneo-vista-publica";

function formatDateTime(value: string | null) {
  if (!value) return "Horario pendiente";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Horario pendiente";

  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function matchStatusLabel(status: TorneoGrupoCard["matches"][number]["status"]) {
  switch (status) {
    case "SCHEDULED":
      return "Programado";
    case "IN_PROGRESS":
      return "En juego";
    case "FINISHED":
      return "Finalizado";
    case "WALKOVER":
      return "Walkover";
    case "CANCELLED":
      return "Cancelado";
    case "PENDING":
    default:
      return "Pendiente";
  }
}

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

          <div className="border-t border-content/10 px-4 py-3">
            <h3 className="mb-3 text-sm font-semibold text-content">
              Partidos del grupo
            </h3>
            {grupo.matches.length === 0 ? (
              <p className="mb-0 rounded-xl bg-surface-soft px-3 py-4 text-center text-sm text-content/70">
                No hay partidos para este grupo.
              </p>
            ) : (
              <ul className="mb-0 grid gap-2 sm:grid-cols-2">
                {grupo.matches.map((match) => (
                  <li
                    key={match.id}
                    className="rounded-xl border border-content/10 bg-surface-soft/50 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full bg-surface-soft px-2 py-1 text-xs font-medium text-content/70">
                        {matchStatusLabel(match.status)}
                      </span>
                      <span className="text-xs text-content/65">
                        {formatDateTime(match.scheduledAt)}
                      </span>
                    </div>
                    <p className="mb-1 mt-2 text-sm">
                      <span
                        className={
                          (match.status === "FINISHED" ||
                            match.status === "WALKOVER") &&
                          match.ganadorId !== null
                            ? match.ganadorId === match.pareja1Id
                              ? "font-bold text-padel-green"
                              : "font-medium text-content"
                            : "font-medium text-content"
                        }
                      >
                        {match.pareja1}
                      </span>
                      <span className="text-content/70"> vs </span>
                      <span
                        className={
                          (match.status === "FINISHED" ||
                            match.status === "WALKOVER") &&
                          match.ganadorId !== null
                            ? match.ganadorId === match.pareja2Id
                              ? "font-bold text-padel-green"
                              : "font-medium text-content"
                            : "font-medium text-content"
                        }
                      >
                        {match.pareja2}
                      </span>
                    </p>
                    <p className="mb-0 text-xs text-content/65">
                      Resultado: {match.score} · Cancha: {match.cancha ?? "-"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
