"use client";

import type { PublicComplejoRecategorizacion } from "@/actions/complejos-public";
import { formatDate } from "@/app/complejos/[id]/components/format";
import { usePagedItems } from "@/app/complejos/[id]/components/usePagedItems";
import TableWithPagination from "@/components/TableWithPagination";

export default function RecategorizacionTable({
  items,
}: {
  items: PublicComplejoRecategorizacion[];
}) {
  const { page, setPage, pageItems, total, pageSize } = usePagedItems(items);

  return (
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
          <th>Categoria anterior</th>
          <th>Categoria nueva</th>
        </tr>
      )}
      renderRow={(item) => (
        <tr>
          <td>{formatDate(item.fecha)}</td>
          <td>{item.jugadorNombre}</td>
          <td className="text-deep-black/70">{item.nivelPrevio}</td>
          <td>
            <span className="inline-flex rounded-full bg-padel-green/15 px-3 py-1 text-xs font-semibold text-deep-black">
              {item.nivelNuevo}
            </span>
          </td>
        </tr>
      )}
    />
  );
}
