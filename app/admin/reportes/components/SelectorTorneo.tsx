"use client";

import { useCallback } from "react";

import { listTorneosForAdmin } from "@/actions/torneos";

import BuscadorRecurso, { type OpcionRecurso } from "./BuscadorRecurso";

const MAX_RESULTADOS = 20;

export default function SelectorTorneo({
  seleccionado = null,
}: {
  seleccionado?: { id: number; etiqueta: string } | null;
}) {
  const buscar = useCallback(async (texto: string) => {
    const data = await listTorneosForAdmin({
      searchBy: texto,
      pageSize: MAX_RESULTADOS,
      orderBy: "inicio",
      orderDir: "desc",
    });

    return data.items.map<OpcionRecurso>((torneo) => ({
      id: torneo.id,
      titulo: `${torneo.nombre} — ${torneo.categoriaCode}`,
      detalle: [torneo.eventoName, torneo.complejoName]
        .filter(Boolean)
        .join(" · "),
    }));
  }, []);

  return (
    <BuscadorRecurso
      etiqueta="Torneo"
      placeholder="Buscar por nombre, evento o categoria..."
      idInput="buscar-torneo"
      buscar={buscar}
      hrefDe={(id) => `/admin/reportes/inscriptos?torneoId=${id}`}
      hrefLimpiar="/admin/reportes/inscriptos"
      seleccionado={seleccionado}
    />
  );
}
