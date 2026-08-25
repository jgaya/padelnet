"use client";

import { useMemo, useState } from "react";

import type { PublicComplejoRecategorizacion } from "@/actions/complejos-public";
import { usePagedItems } from "@/app/complejos/[slug]/components/usePagedItems";
import Badge from "@/app/components/UI/Badge";
import LinkJugador from "@/components/jugador/LinkJugador";
import TableWithPagination from "@/components/TableWithPagination";

/**
 * `Recategorizacion.fecha` es una columna `@db.Date`: se guarda a medianoche
 * UTC. Formatearla en la zona local adelantaria un dia el resultado en la
 * Argentina, asi que el dia se saca y se muestra siempre en UTC.
 */
function fechaKey(value: string) {
  return value.slice(0, 10);
}

function formatFecha(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

function Movimiento({ item }: { item: PublicComplejoRecategorizacion }) {
  if (item.nivelPrevio === item.nivelNuevo) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="font-semibold text-content">{item.nivelNuevo}</span>
        <Badge text="Observado" variant="warning" size="sm" />
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-content/60">
        {item.nivelPrevio ?? "Sin categoria"}
      </span>
      <span aria-hidden="true" className="text-padel-green">
        &rarr;
      </span>
      <span className="inline-flex rounded-full bg-padel-green/15 px-3 py-1 text-xs font-semibold text-content">
        {item.nivelNuevo}
      </span>
    </span>
  );
}

export default function RecategorizacionTable({
  items,
}: {
  items: PublicComplejoRecategorizacion[];
}) {
  const fechasDisponibles = useMemo(
    () =>
      Array.from(new Set(items.map((item) => fechaKey(item.fecha)))).sort(
        (a, b) => b.localeCompare(a),
      ),
    [items],
  );

  // Arranca en la jornada mas reciente, que es lo que la gente viene a mirar.
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(
    () => fechasDisponibles[0] ?? "all",
  );
  const [texto, setTexto] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();

    // La busqueda por jugador manda sobre el filtro de fecha: si alguien busca
    // su apellido quiere todo su historial, no el de una jornada.
    if (termino) {
      return items.filter((item) =>
        item.jugadorNombre.toLowerCase().includes(termino),
      );
    }

    if (fechaSeleccionada === "all") return items;

    return items.filter((item) => fechaKey(item.fecha) === fechaSeleccionada);
  }, [busqueda, fechaSeleccionada, items]);

  const { page, setPage, pageItems, total, pageSize } =
    usePagedItems(filtrados);

  function handleBuscar() {
    setPage(1);
    setFechaSeleccionada("all");
    setBusqueda(texto);
  }

  function handleLimpiar() {
    setPage(1);
    setTexto("");
    setBusqueda("");
    setFechaSeleccionada(fechasDisponibles[0] ?? "all");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="sm:w-56">
          <label
            className="mb-1.5 block text-sm font-semibold text-content"
            htmlFor="recategorizacion-fecha"
          >
            Fecha
          </label>
          <select
            id="recategorizacion-fecha"
            className="w-full rounded-xl border border-content/20 bg-surface px-3 py-2.5 text-sm text-content focus:border-padel-green focus:outline-none focus:ring-2 focus:ring-padel-green/20"
            value={fechaSeleccionada}
            onChange={(event) => {
              setPage(1);
              setBusqueda("");
              setTexto("");
              setFechaSeleccionada(event.target.value);
            }}
          >
            <option value="all">Todas</option>
            {fechasDisponibles.map((fecha) => (
              <option key={fecha} value={fecha}>
                {formatFecha(fecha)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label
            className="mb-1.5 block text-sm font-semibold text-content"
            htmlFor="recategorizacion-jugador"
          >
            Buscar jugador
          </label>
          <div className="flex gap-2">
            <input
              id="recategorizacion-jugador"
              type="search"
              className="w-full rounded-xl border border-content/20 bg-surface px-3 py-2.5 text-sm text-content focus:border-padel-green focus:outline-none focus:ring-2 focus:ring-padel-green/20"
              placeholder="Nombre o apellido"
              value={texto}
              onChange={(event) => setTexto(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleBuscar();
                }
              }}
            />
            <button
              type="button"
              className="whitespace-nowrap rounded-full bg-padel-green px-4 py-2 text-sm font-semibold text-on-brand transition hover:brightness-95"
              onClick={handleBuscar}
            >
              Buscar
            </button>
            {busqueda.trim() ? (
              <button
                type="button"
                className="whitespace-nowrap rounded-full border border-content/20 bg-surface px-4 py-2 text-sm font-semibold text-content transition hover:bg-surface-soft"
                onClick={handleLimpiar}
              >
                Limpiar
              </button>
            ) : null}
          </div>
          {busqueda.trim() ? (
            <p className="mt-1.5 mb-0 text-xs text-content/60">
              Resultados de todas las fechas.
            </p>
          ) : null}
        </div>
      </div>

      {filtrados.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-content/20 bg-surface-soft px-5 py-8 text-center text-sm text-content/70">
          No hay recategorizaciones para este filtro.
        </p>
      ) : (
        <TableWithPagination
          items={pageItems}
          page={page}
          total={total}
          pageSize={pageSize}
          onPageChange={setPage}
          getRowKey={(item) => item.id}
          renderHeader={() => (
            <tr>
              <th>Fecha</th>
              <th>Jugador</th>
              <th>Movimiento</th>
            </tr>
          )}
          renderRow={(item) => (
            <tr>
              <td>{formatFecha(item.fecha)}</td>
              <td className="capitalize">
                <LinkJugador jugadorId={item.jugadorId}>
                  {item.jugadorNombre}
                </LinkJugador>
              </td>
              <td>
                <Movimiento item={item} />
              </td>
            </tr>
          )}
        />
      )}
    </div>
  );
}
