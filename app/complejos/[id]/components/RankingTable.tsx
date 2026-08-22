"use client";

import { useMemo } from "react";

import type { PublicComplejoRankingRow } from "@/actions/complejos-public";
import { usePagedItems } from "@/app/complejos/[id]/components/usePagedItems";
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
      renderHeader={() => (
        <tr>
          <th>#</th>
          <th>Jugador</th>
          <th>Categoria</th>
          <th>Torneos</th>
          <th>Puntos</th>
        </tr>
      )}
      renderRow={(fila) => (
        <tr>
          <td className="font-semibold text-deep-black/70">{fila.posicion}</td>
          <td>{fila.nombre}</td>
          <td>
            {fila.categoria ?? (
              <span className="text-deep-black/45">Sin categoria</span>
            )}
          </td>
          <td>{fila.torneos}</td>
          <td className="font-semibold text-energy-orange">{fila.puntos}</td>
        </tr>
      )}
    />
  );
}
