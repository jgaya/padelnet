"use client";

import { useState } from "react";

import type { Bucket } from "@/lib/dashboard-calculos";
import GraficoBarrasH from "./charts/GraficoBarrasH";

type SelectorEventoLocalidadProps = {
  eventos: { id: number; nombre: string }[];
  porEvento: Record<number, Bucket[]>;
};

/**
 * De donde son los jugadores anotados a un evento.
 *
 * Los datos de todos los eventos vienen ya calculados del servidor y el
 * selector solo cambia cual se muestra: son unas pocas decenas de filas y asi
 * cambiar de evento es instantaneo, sin un viaje a la base por cada cambio.
 */
export default function SelectorEventoLocalidad({
  eventos,
  porEvento,
}: SelectorEventoLocalidadProps) {
  const [eventoId, setEventoId] = useState<number | null>(
    eventos[0]?.id ?? null,
  );

  const datos = eventoId !== null ? (porEvento[eventoId] ?? []) : [];

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-deep-black/80">
        Evento
        <select
          value={eventoId ?? ""}
          onChange={(event) => setEventoId(Number(event.target.value))}
          className="mt-1 w-full rounded-xl border border-deep-black/15 px-3 py-2 text-sm"
        >
          {eventos.map((evento) => (
            <option key={evento.id} value={evento.id}>
              {evento.nombre}
            </option>
          ))}
        </select>
      </label>

      {datos.length === 0 ? (
        <p className="py-6 text-center text-sm text-deep-black/60">
          Nadie anotado en este evento cargo su localidad todavia.
        </p>
      ) : (
        <GraficoBarrasH datos={datos} />
      )}
    </div>
  );
}
