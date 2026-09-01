"use client";

import { useCallback } from "react";

import { listEventosForAdmin } from "@/actions/eventos";

import BuscadorRecurso, { type OpcionRecurso } from "./BuscadorRecurso";

const MAX_RESULTADOS = 20;

function rango(inicio: string, fin: string) {
  const formato = (valor: string) =>
    new Date(valor).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const desde = formato(inicio);
  const hasta = formato(fin);

  return desde === hasta ? desde : `${desde} al ${hasta}`;
}

export default function SelectorEvento({
  seleccionado = null,
}: {
  seleccionado?: { id: number; etiqueta: string } | null;
}) {
  const buscar = useCallback(async (texto: string) => {
    const data = await listEventosForAdmin({
      searchBy: texto,
      pageSize: MAX_RESULTADOS,
      orderBy: "inicio",
      orderDir: "desc",
    });

    return data.items.map<OpcionRecurso>((evento) => ({
      id: evento.id,
      titulo: evento.nombre,
      detalle: [evento.complejoName, rango(evento.inicio, evento.fin)]
        .filter(Boolean)
        .join(" · "),
    }));
  }, []);

  return (
    <BuscadorRecurso
      etiqueta="Evento"
      placeholder="Buscar por nombre o complejo..."
      idInput="buscar-evento"
      buscar={buscar}
      hrefDe={(id) => `/admin/reportes/horarios?eventoId=${id}`}
      hrefLimpiar="/admin/reportes/horarios"
      seleccionado={seleccionado}
    />
  );
}
