"use client";

import { useMemo, useState } from "react";
import type { PublicTorneoDetail } from "@/actions/torneos-public";
import Bracket from "@/components/Bracket";
import Link from "next/link";

function formatDateTime(value: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function torneoStatusLabel(status: PublicTorneoDetail["status"]) {
  switch (status) {
    case "PUBLISHED":
      return "Publicado";
    case "IN_PROGRESS":
      return "En progreso";
    case "FINISHED":
      return "Finalizado";
    case "ARCHIVED":
      return "Archivado";
    case "DRAFT":
    default:
      return "Borrador";
  }
}

type ActiveTab = "grupos" | "llave";

const MOCK_GRUPOS: PublicTorneoDetail["grupos"] = [
  {
    id: -1,
    nombre: "Zona A",
    rows: [
      { parejaId: -11, parejaNombre: "Perez / Gomez", pts: 6, pg: 3, pp: 0, sg: 6, sp: 2, gg: 38, gp: 24 },
      { parejaId: -12, parejaNombre: "Lopez / Diaz", pts: 5, pg: 2, pp: 1, sg: 5, sp: 3, gg: 34, gp: 29 },
      { parejaId: -13, parejaNombre: "Sosa / Ruiz", pts: 4, pg: 1, pp: 2, sg: 3, sp: 5, gg: 27, gp: 33 },
      { parejaId: -14, parejaNombre: "Acosta / Medina", pts: 3, pg: 0, pp: 3, sg: 2, sp: 6, gg: 21, gp: 34 },
    ],
  },
  {
    id: -2,
    nombre: "Zona B",
    rows: [
      { parejaId: -21, parejaNombre: "Fernandez / Nunez", pts: 6, pg: 3, pp: 0, sg: 6, sp: 1, gg: 40, gp: 23 },
      { parejaId: -22, parejaNombre: "Rossi / Vidal", pts: 5, pg: 2, pp: 1, sg: 4, sp: 3, gg: 31, gp: 28 },
      { parejaId: -23, parejaNombre: "Molina / Silva", pts: 4, pg: 1, pp: 2, sg: 3, sp: 5, gg: 29, gp: 35 },
      { parejaId: -24, parejaNombre: "Ibarra / Torres", pts: 3, pg: 0, pp: 3, sg: 1, sp: 6, gg: 20, gp: 34 },
    ],
  },
];

function mockDate(dayOffset: number, hour: number) {
  return new Date(Date.UTC(2026, 3, 9 + dayOffset, hour, 0, 0)).toISOString();
}

const MOCK_LLAVE: PublicTorneoDetail["llave"] = [
  {
    round: "DIECISEISAVOS",
    label: "Dieciseisavos de final",
    matches: Array.from({ length: 16 }, (_, index) => ({
      id: -1000 - index,
      round: "DIECISEISAVOS" as const,
      scheduledAt: mockDate(0, 10 + (index % 8)),
      status: "FINISHED" as const,
      pareja1: `Pareja ${index * 2 + 1}`,
      pareja2: `Pareja ${index * 2 + 2}`,
      cancha: `Cancha ${(index % 3) + 1}`,
      score: "6-4 | 6-3",
    })),
  },
  {
    round: "OCTAVOS",
    label: "Octavos de final",
    matches: Array.from({ length: 8 }, (_, index) => ({
      id: -1100 - index,
      round: "OCTAVOS" as const,
      scheduledAt: mockDate(1, 10 + index),
      status: "FINISHED" as const,
      pareja1: `Ganador D${index * 2 + 1}`,
      pareja2: `Ganador D${index * 2 + 2}`,
      cancha: `Cancha ${(index % 3) + 1}`,
      score: "6-2 | 6-4",
    })),
  },
  {
    round: "CUARTOS",
    label: "Cuartos de final",
    matches: Array.from({ length: 4 }, (_, index) => ({
      id: -1200 - index,
      round: "CUARTOS" as const,
      scheduledAt: mockDate(2, 11 + index),
      status: "FINISHED" as const,
      pareja1: `Ganador O${index * 2 + 1}`,
      pareja2: `Ganador O${index * 2 + 2}`,
      cancha: `Cancha ${(index % 2) + 1}`,
      score: "7-5 | 6-4",
    })),
  },
  {
    round: "SEMIFINAL",
    label: "Semifinal",
    matches: Array.from({ length: 2 }, (_, index) => ({
      id: -1300 - index,
      round: "SEMIFINAL" as const,
      scheduledAt: mockDate(3, 18 + index),
      status: "FINISHED" as const,
      pareja1: `Ganador Q${index * 2 + 1}`,
      pareja2: `Ganador Q${index * 2 + 2}`,
      cancha: `Cancha ${index + 1}`,
      score: "6-4 | 7-6",
    })),
  },
  {
    round: "FINAL",
    label: "Final",
    matches: [
      {
        id: -1400,
        round: "FINAL",
        scheduledAt: mockDate(4, 19),
        status: "SCHEDULED",
        pareja1: "Ganador S1",
        pareja2: "Ganador S2",
        cancha: "Cancha Central",
        score: "-",
      },
    ],
  },
];

export default function TorneoDetailTabs({
  detail,
}: {
  detail: PublicTorneoDetail;
}) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("grupos");

  const locationLabel = useMemo(
    () => `${detail.complejoNombre} - ${detail.complejoCiudad}, ${detail.complejoProvincia}`,
    [detail.complejoCiudad, detail.complejoNombre, detail.complejoProvincia],
  );

  const hasRealGrupos = detail.grupos.length > 0;
  const hasRealLlave = detail.llave.some((column) => column.matches.length > 0);
  const gruposToRender = hasRealGrupos ? detail.grupos : MOCK_GRUPOS;
  const llaveToRender = hasRealLlave ? detail.llave : MOCK_LLAVE;

  return (
    <div className="space-y-5">
      <header className="rounded-3xl border border-deep-black/10 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-deep-black/60">
            {locationLabel}
          </p>

          <Link
            href="/torneos"
            className="inline-flex rounded-full border border-deep-black/15 bg-white px-4 py-2 text-sm font-semibold text-deep-black transition hover:bg-surface-soft"
          >
            Volver a torneos
          </Link>
        </div>
        <h1 className="mt-2 text-3xl font-semibold text-deep-black sm:text-4xl">
          {detail.nombre}
        </h1>
        <p className="mt-1 text-sm text-deep-black/70">
          Evento: {detail.eventoNombre}
        </p>
        {detail.comentario ? (
          <p className="mt-3 text-sm text-deep-black/75">{detail.comentario}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-padel-green/20 px-3 py-1 text-padel-green">
            {torneoStatusLabel(detail.status)}
          </span>
          <span className="rounded-full bg-surface-soft px-3 py-1 text-deep-black/80">
            Sexo: {detail.sexo}
          </span>
          <span className="rounded-full bg-surface-soft px-3 py-1 text-deep-black/80">
            Capacidad: {detail.capacidad} parejas
          </span>
          <span className="rounded-full bg-surface-soft px-3 py-1 text-deep-black/80">
            Inicio: {formatDateTime(detail.inicio)}
          </span>
        </div>
      </header>

      <div className="rounded-3xl border border-deep-black/10 bg-white shadow-sm">
        <div className="flex gap-2 border-b border-deep-black/10 px-4 pt-4 sm:px-6">
          <button
            type="button"
            onClick={() => setActiveTab("grupos")}
            className={`rounded-t-2xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === "grupos"
                ? "bg-padel-green/15 text-padel-green"
                : "text-deep-black/70 hover:bg-surface-soft"
            }`}
          >
            Grupos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("llave")}
            className={`rounded-t-2xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === "llave"
                ? "bg-padel-green/15 text-padel-green"
                : "text-deep-black/70 hover:bg-surface-soft"
            }`}
          >
            Llave
          </button>
        </div>

        <div className="p-1 sm:p-4">
          {activeTab === "grupos" ? (
            <div className="space-y-4">
              {!hasRealGrupos ? (
                <p className="rounded-xl border border-energy-orange/25 bg-energy-orange/10 px-4 py-2 text-xs font-semibold text-energy-orange">
                  Mostrando datos de ejemplo para zonas.
                </p>
              ) : null}

              {gruposToRender.map((grupo) => (
                <article
                  key={grupo.id}
                  className="overflow-hidden rounded-2xl border border-deep-black/10"
                >
                  <div className="border-b border-deep-black/10 bg-gradient-to-r from-padel-green/15 via-white to-energy-orange/15 px-4 py-3">
                    <h2 className="text-lg font-semibold text-deep-black">
                      {grupo.nombre}
                    </h2>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-surface-soft text-deep-black/80">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold">Pareja</th>
                          <th className="px-3 py-2 text-right font-semibold">Pts</th>
                          <th className="px-3 py-2 text-right font-semibold">PG</th>
                          <th className="px-3 py-2 text-right font-semibold">PP</th>
                          <th className="px-3 py-2 text-right font-semibold">SG</th>
                          <th className="px-3 py-2 text-right font-semibold">SP</th>
                          <th className="px-3 py-2 text-right font-semibold">GG</th>
                          <th className="px-3 py-2 text-right font-semibold">GP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grupo.rows.map((row, index) => (
                          <tr
                            key={row.parejaId}
                            className={`transition hover:bg-padel-green/10 ${
                              index % 2 === 0 ? "bg-white" : "bg-surface-soft/50"
                            }`}
                          >
                            <td className="px-3 py-2 font-medium text-deep-black">
                              {row.parejaNombre}
                            </td>
                            <td className="px-3 py-2 text-right">{row.pts}</td>
                            <td className="px-3 py-2 text-right">{row.pg}</td>
                            <td className="px-3 py-2 text-right">{row.pp}</td>
                            <td className="px-3 py-2 text-right">{row.sg}</td>
                            <td className="px-3 py-2 text-right">{row.sp}</td>
                            <td className="px-3 py-2 text-right">{row.gg}</td>
                            <td className="px-3 py-2 text-right">{row.gp}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {!hasRealLlave ? (
                <p className="rounded-xl border border-energy-orange/25 bg-energy-orange/10 px-4 py-2 text-xs font-semibold text-energy-orange">
                  Mostrando datos de ejemplo para la llave.
                </p>
              ) : null}

              <Bracket columns={llaveToRender} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
