"use client";

import { useState } from "react";

import type { EventoResumen } from "@/lib/dashboard";

/**
 * Los torneos de cada evento, con su ocupacion.
 *
 * Va como acordeon porque un complejo con varios eventos y cinco torneos cada
 * uno da una tabla imposible de leer de corrido. Arranca abierto el primero,
 * que suele ser el evento en curso.
 */
export default function TablaTorneosPorEvento({
  eventos,
}: {
  eventos: EventoResumen[];
}) {
  const [abierto, setAbierto] = useState<number | null>(eventos[0]?.id ?? null);

  return (
    <div className="space-y-2">
      {eventos.map((evento) => {
        const estaAbierto = abierto === evento.id;

        return (
          <div
            key={evento.id}
            className="overflow-hidden rounded-xl border border-content/10"
          >
            <button
              type="button"
              onClick={() => setAbierto(estaAbierto ? null : evento.id)}
              aria-expanded={estaAbierto}
              className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 bg-surface-soft px-3 py-2.5 text-left transition hover:bg-surface-soft/70"
            >
              <span
                aria-hidden="true"
                className={`text-xs text-content/50 transition-transform ${estaAbierto ? "rotate-90" : ""}`}
              >
                ▶
              </span>
              <span className="font-semibold text-content">
                {evento.nombre}
              </span>
              <span className="text-xs text-content/60">
                {evento.complejoNombre}
              </span>
              <span className="ml-auto text-xs font-semibold text-content/70">
                {evento.totalInscriptos} inscriptos
                {evento.totalSuplentes > 0
                  ? ` · ${evento.totalSuplentes} suplentes`
                  : ""}
              </span>
              <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-content/70">
                {evento.estado}
              </span>
            </button>

            {estaAbierto ? (
              evento.torneos.length === 0 ? (
                <p className="px-3 py-3 text-sm text-content/60">
                  Este evento todavia no tiene torneos.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[34rem] text-sm">
                    <thead>
                      <tr className="border-b border-content/10 text-left text-xs uppercase tracking-wide text-content/60">
                        <th className="px-3 py-2 font-semibold">Torneo</th>
                        <th className="px-3 py-2 font-semibold">Categoria</th>
                        <th className="px-3 py-2 font-semibold">Inscriptos</th>
                        <th className="px-3 py-2 font-semibold">Suplentes</th>
                        <th className="px-3 py-2 font-semibold">Ocupacion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evento.torneos.map((torneo) => {
                        const pct = Math.round(torneo.ocupacion * 100);
                        // Pasado de cupo se marca en naranja: es el caso que
                        // hay que mirar, no un exito.
                        const lleno = pct >= 100;

                        return (
                          <tr
                            key={torneo.id}
                            className="border-b border-content/5 last:border-0"
                          >
                            <td className="px-3 py-2 text-content">
                              {torneo.nombre}
                            </td>
                            <td className="px-3 py-2 text-content/70">
                              {torneo.categoria}
                            </td>
                            <td className="px-3 py-2 text-content/70">
                              {torneo.inscriptos} / {torneo.capacidad}
                            </td>
                            <td className="px-3 py-2 text-content/70">
                              {torneo.suplentes}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-24 overflow-hidden rounded-full bg-surface-soft">
                                  <div
                                    className={`h-2 rounded-full ${lleno ? "bg-energy-orange" : "bg-padel-green"}`}
                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs text-content/70">
                                  {pct}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
