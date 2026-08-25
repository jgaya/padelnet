"use client";

import type { PublicComplejoPartido } from "@/actions/complejos-public";
import {
  formatDate,
  formatTime,
} from "@/app/complejos/[slug]/components/format";
import { usePagedItems } from "@/app/complejos/[slug]/components/usePagedItems";
import TableWithPagination from "@/components/TableWithPagination";

function partidoEstado(partido: PublicComplejoPartido) {
  if (partido.walkover) return "Walkover";

  switch (partido.status) {
    case "IN_PROGRESS":
      return "En juego";
    case "FINISHED":
      return "Finalizado";
    case "SCHEDULED":
      return "Programado";
    case "WALKOVER":
      return "Walkover";
    case "PENDING":
    default:
      return "Pendiente";
  }
}

export default function CalendarioTable({
  partidos,
}: {
  partidos: PublicComplejoPartido[];
}) {
  const { page, setPage, pageItems, total, pageSize } = usePagedItems(partidos);

  return (
    <TableWithPagination
      items={pageItems}
      page={page}
      total={total}
      pageSize={pageSize}
      onPageChange={setPage}
      getRowKey={(partido) => partido.id}
      renderHeader={() => (
        <tr>
          <th>Fecha</th>
          <th>Hora</th>
          <th>Partido</th>
          <th>Torneo</th>
          <th>Cancha</th>
          <th>Estado</th>
          <th>Resultado</th>
        </tr>
      )}
      renderRow={(partido) => (
        <tr>
          <td>{formatDate(partido.scheduledAt)}</td>
          <td>{formatTime(partido.scheduledAt)}</td>
          <td>
            {partido.pareja1Nombre} vs {partido.pareja2Nombre}
          </td>
          <td>{partido.torneoNombre}</td>
          <td>{partido.canchaLabel}</td>
          <td>{partidoEstado(partido)}</td>
          <td>
            {partido.resultado ?? (
              <span className="text-content/45">Sin resultado</span>
            )}
          </td>
        </tr>
      )}
    />
  );
}
