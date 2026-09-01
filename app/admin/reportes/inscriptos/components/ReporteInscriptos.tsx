"use client";

import { useState } from "react";
import {
  ArrowDownTrayIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/solid";

import { useSnackbar } from "@/context/SnackbarContext";
import { slugify } from "@/lib/slug";
import { descargarCsv, type CeldaCsv } from "@/lib/exportar-csv";
import { descargarPdf, precargarPdf } from "@/lib/exportar-pdf";
import type { FilaInscripto, ReporteInscriptos } from "@/actions/reportes";

const SEXO_LABEL: Record<ReporteInscriptos["torneo"]["sexo"], string> = {
  MASCULINO: "Caballeros",
  FEMENINO: "Damas",
  MIXTO: "Mixto",
};

const COLUMNAS = ["#", "Jugador 1", "Jugador 2", "Restriccion", "Inscripta el"];

function formatearFecha(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** dd-mm-aaaa para el nombre del archivo. */
function fechaArchivo() {
  const hoy = new Date();
  return [
    String(hoy.getDate()).padStart(2, "0"),
    String(hoy.getMonth() + 1).padStart(2, "0"),
    hoy.getFullYear(),
  ].join("-");
}

function filasDeBloque(filas: FilaInscripto[]): (string | number)[][] {
  return filas.map((fila, indice) => [
    indice + 1,
    fila.jugador1,
    fila.jugador2,
    fila.restriccion ?? "",
    formatearFecha(fila.inscriptaEl),
  ]);
}

export default function ReporteInscriptosView({
  reporte,
}: {
  reporte: ReporteInscriptos;
}) {
  const showSnackbar = useSnackbar();
  const [exportando, setExportando] = useState<"pdf" | "csv" | null>(null);

  const { torneo, titulares, suplentes } = reporte;
  const hayFilas = titulares.length > 0 || suplentes.length > 0;

  const meta = [
    SEXO_LABEL[torneo.sexo],
    torneo.categoriaCode,
    torneo.eventoNombre,
    torneo.complejoNombre,
    torneo.inicio ? `Inicia ${formatearFecha(torneo.inicio)}` : null,
  ].filter((linea): linea is string => Boolean(linea));

  const nombreBase = `inscriptos-${slugify(torneo.nombre)}-${fechaArchivo()}`;

  const exportarPdf = async () => {
    setExportando("pdf");
    try {
      await descargarPdf({
        titulo: torneo.nombre,
        meta: [...meta, `Emitido el ${formatearFecha(new Date().toISOString())}`],
        nombreArchivo: `${nombreBase}.pdf`,
        bloques: [
          {
            titulo: `Titulares (${titulares.length})`,
            head: COLUMNAS,
            body: filasDeBloque(titulares),
            anchos: { 0: 12 },
          },
          ...(suplentes.length
            ? [
                {
                  titulo: `Suplentes (${suplentes.length})`,
                  head: COLUMNAS,
                  body: filasDeBloque(suplentes),
                  anchos: { 0: 12 },
                },
              ]
            : []),
        ],
      });
    } catch (error) {
      console.error("Error exportando el PDF", error);
      showSnackbar("No se pudo generar el PDF", "error");
    } finally {
      setExportando(null);
    }
  };

  const exportarCsv = async () => {
    setExportando("csv");
    try {
      const filas: CeldaCsv[][] = [
        [torneo.nombre],
        [meta.join(" - ")],
        [],
        [`Titulares (${titulares.length})`],
        COLUMNAS,
        ...filasDeBloque(titulares),
      ];

      if (suplentes.length) {
        filas.push(
          [],
          [`Suplentes (${suplentes.length})`],
          COLUMNAS,
          ...filasDeBloque(suplentes),
        );
      }

      await descargarCsv(`${nombreBase}.csv`, filas);
    } catch (error) {
      console.error("Error exportando el CSV", error);
      showSnackbar("No se pudo generar el CSV", "error");
    } finally {
      setExportando(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-content/10 bg-surface p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-content">
            {torneo.nombre}
          </h2>
          <p className="text-sm text-content/70">{meta.join(" · ")}</p>
          <p className="text-sm text-content/60">
            {titulares.length} titular{titulares.length === 1 ? "" : "es"} ·{" "}
            {suplentes.length} suplente{suplentes.length === 1 ? "" : "s"} ·
            capacidad {torneo.capacidad}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportarPdf}
            // Adelanta la carga de jspdf antes del click, para que el handler
            // sea corto y no se venza la activacion que pide navigator.share.
            onPointerDown={precargarPdf}
            disabled={!hayFilas || exportando !== null}
            className="inline-flex items-center gap-2 rounded-full bg-energy-orange px-4 py-2 text-sm font-semibold text-on-brand shadow-[0_8px_16px_var(--glow-orange-strong)] transition hover:brightness-95 disabled:opacity-50 disabled:shadow-none"
          >
            <DocumentTextIcon className="h-4 w-4" />
            {exportando === "pdf" ? "Generando..." : "PDF"}
          </button>
          <button
            type="button"
            onClick={exportarCsv}
            disabled={!hayFilas || exportando !== null}
            className="inline-flex items-center gap-2 rounded-full bg-padel-green px-4 py-2 text-sm font-semibold text-on-brand transition hover:brightness-95 disabled:opacity-50"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            CSV
          </button>
        </div>
      </div>

      {!hayFilas ? (
        <p className="rounded-2xl border border-content/10 bg-surface py-14 text-center text-sm text-content/60">
          Este torneo todavia no tiene parejas inscriptas.
        </p>
      ) : (
        <>
          <Bloque titulo="Titulares" filas={titulares} />
          {suplentes.length ? (
            <Bloque titulo="Suplentes" filas={suplentes} />
          ) : null}
        </>
      )}
    </div>
  );
}

function Bloque({ titulo, filas }: { titulo: string; filas: FilaInscripto[] }) {
  if (!filas.length) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-content/10 bg-surface">
      <h3 className="border-b border-content/10 px-4 py-3 text-sm font-semibold text-content">
        {titulo} ({filas.length})
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-soft text-content/70">
            <tr>
              <th className="w-12 px-3 py-2 text-left font-semibold">#</th>
              <th className="px-3 py-2 text-left font-semibold">Jugador 1</th>
              <th className="px-3 py-2 text-left font-semibold">Jugador 2</th>
              <th className="px-3 py-2 text-left font-semibold">Restriccion</th>
              <th className="px-3 py-2 text-left font-semibold">
                Inscripta el
              </th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila, indice) => (
              <tr
                key={`${fila.jugador1}-${fila.jugador2}-${indice}`}
                className="border-t border-content/10"
              >
                <td className="px-3 py-2 text-content/60">{indice + 1}</td>
                <td className="px-3 py-2 font-medium text-content">
                  {fila.jugador1}
                </td>
                <td className="px-3 py-2 font-medium text-content">
                  {fila.jugador2}
                </td>
                <td className="px-3 py-2 text-content/70">
                  {fila.restriccion ?? "—"}
                </td>
                <td className="px-3 py-2 text-content/70">
                  {formatearFecha(fila.inscriptaEl)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
