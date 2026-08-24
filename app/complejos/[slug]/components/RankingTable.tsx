"use client";

import { useMemo } from "react";

import type { PublicComplejoRankingRow } from "@/actions/complejos-public";
import { usePagedItems } from "@/app/complejos/[slug]/components/usePagedItems";
import LinkJugador from "@/components/jugador/LinkJugador";
import TableWithPagination from "@/components/TableWithPagination";

export default function RankingTable({
  filas,
}: {
  filas: PublicComplejoRankingRow[];
}) {
  // La posicion se calcula sobre el listado completo, no sobre la pagina.
  const conPosicion = useMemo(
    () => filas.map((fila, index) => ({ ...fila, posicion: index + 1 })),
    [filas],
  );

  const { page, setPage, pageItems, total, pageSize } =
    usePagedItems(conPosicion);

  return (
    <TableWithPagination
      items={pageItems}
      page={page}
      total={total}
      pageSize={pageSize}
      onPageChange={setPage}
      getRowKey={(fila) => fila.jugadorId}
      // Sin columna de categoria: todas las filas son de la misma, que es la
      // que se eligio en el selector y ya esta en el titulo.
      renderHeader={() => (
        <tr>
          <th>#</th>
          <th>Jugador</th>
          <th>Torneos</th>
          <th>Puntos</th>
        </tr>
      )}
      renderRow={(fila) => (
        <tr>
          <td className="font-semibold text-deep-black/70">{fila.posicion}</td>
          <td>
            <LinkJugador jugadorId={fila.jugadorId}>{fila.nombre}</LinkJugador>
          </td>
          <td>{fila.torneos}</td>
          <td className="font-semibold text-energy-orange">{fila.puntos}</td>
        </tr>
      )}
    />
  );
}
