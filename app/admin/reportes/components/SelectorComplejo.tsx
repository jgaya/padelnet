"use client";

import { useCallback } from "react";

import { listComplejos } from "@/actions/complejos";

import BuscadorRecurso, { type OpcionRecurso } from "./BuscadorRecurso";

const MAX_RESULTADOS = 20;

export default function SelectorComplejo({
  seleccionado = null,
}: {
  seleccionado?: { id: number; etiqueta: string } | null;
}) {
  const buscar = useCallback(async (texto: string) => {
    const data = await listComplejos({
      searchBy: texto,
      pageSize: MAX_RESULTADOS,
      orderBy: "name",
      orderDir: "asc",
    });

    return data.items.map<OpcionRecurso>((complejo) => ({
      id: complejo.id,
      titulo: complejo.name,
      detalle: [complejo.ciudad, complejo.provincia].filter(Boolean).join(", "),
    }));
  }, []);

  return (
    <BuscadorRecurso
      etiqueta="Complejo"
      placeholder="Buscar por nombre, ciudad o provincia..."
      idInput="buscar-complejo"
      buscar={buscar}
      hrefDe={(id) => `/admin/reportes/sanciones?complejoId=${id}`}
      hrefLimpiar="/admin/reportes/sanciones"
      seleccionado={seleccionado}
    />
  );
}
