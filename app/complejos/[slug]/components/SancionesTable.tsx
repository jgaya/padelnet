import LinkJugador from "@/components/jugador/LinkJugador";
import type { PublicComplejoSancion } from "@/actions/complejos-public";

/** Las fechas vienen de columnas `@db.Date`: en UTC o se corren un dia. */
function formatearFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Tarjetas y no tabla: el motivo es un parrafo y en una celda no se lee.
 */
export default function SancionesTable({
  items,
}: {
  items: PublicComplejoSancion[];
}) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((sancion) => (
        <li
          key={sancion.id}
          className={`rounded-2xl border p-4 ${
            sancion.vigenteHoy
              ? "border-danger/30 bg-danger/5"
              : "border-content/10 bg-surface"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <LinkJugador jugadorId={sancion.jugadorId}>
              {sancion.jugadorNombre}
            </LinkJugador>

            {sancion.anulada ? (
              <span className="rounded-full bg-surface-soft px-2 py-0.5 text-xs font-semibold text-content/50 line-through">
                Anulada
              </span>
            ) : sancion.vigenteHoy ? (
              <span className="rounded-full bg-danger/15 px-2 py-0.5 text-xs font-semibold text-danger">
                Vigente
              </span>
            ) : (
              <span className="rounded-full bg-surface-soft px-2 py-0.5 text-xs font-semibold text-content/60">
                Cumplida
              </span>
            )}
          </div>

          <p
            className={`mt-1 text-sm text-content/70 ${sancion.anulada ? "line-through" : ""}`}
          >
            Del {formatearFecha(sancion.desde)} al{" "}
            {formatearFecha(sancion.hasta)}
          </p>

          <p className="mt-3 whitespace-pre-line text-sm text-content/80">
            {sancion.motivo}
          </p>

          {sancion.anulada && sancion.motivoAnulacion ? (
            <p className="mt-2 text-xs text-content/60">
              Anulada: {sancion.motivoAnulacion}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
