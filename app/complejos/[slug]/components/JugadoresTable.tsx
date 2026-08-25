"use client";

import type { PublicComplejoJugador } from "@/actions/complejos-public";
import { usePagedItems } from "@/app/complejos/[slug]/components/usePagedItems";
import LinkJugador from "@/components/jugador/LinkJugador";
import TableWithPagination from "@/components/TableWithPagination";

export default function JugadoresTable({
  jugadores,
}: {
  jugadores: PublicComplejoJugador[];
}) {
  const { page, setPage, pageItems, total, pageSize } =
    usePagedItems(jugadores);

  return (
    <TableWithPagination
      items={pageItems}
      page={page}
      total={total}
      pageSize={pageSize}
      onPageChange={setPage}
      getRowKey={(jugador) => jugador.id}
      renderHeader={() => (
        <tr>
          <th>Jugador</th>
          <th>Categoria</th>
        </tr>
      )}
      renderRow={(jugador) => (
        <tr>
          <td>
            <LinkJugador jugadorId={jugador.id}>{jugador.nombre}</LinkJugador>
          </td>
          <td>
            {jugador.categoria ? (
              <span className="inline-flex rounded-full bg-padel-green/15 px-3 py-1 text-xs font-semibold text-content">
                {jugador.categoria}
              </span>
            ) : (
              <span className="text-content/45">Sin categoria</span>
            )}
          </td>
        </tr>
      )}
    />
  );
}
