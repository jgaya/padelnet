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
import type { FilaSancion, ReporteSanciones } from "@/actions/reportes";

const COLUMNAS = ["Jugador", "Desde", "Hasta", "Estado", "Motivo"];
/** Anchos en mm sobre A4 vertical. "Motivo" se queda con lo que sobra. */
const ANCHOS = { 1: 22, 2: 22, 3: 22 };

/** Columnas `@db.Date`: se leen en UTC o se corren un dia. */
function formatearFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

function fechaArchivo() {
  const hoy = new Date();
  return [
    String(hoy.getDate()).padStart(2, "0"),
    String(hoy.getMonth() + 1).padStart(2, "0"),
    hoy.getFullYear(),
  ].join("-");
}

function aFilas(filas: FilaSancion[]) {
  return filas.map((fila) => [
    fila.jugador,
    formatearFecha(fila.desde),
    formatearFecha(fila.hasta),
    fila.estado,
    fila.motivo,
  ]);
}

function Bloque({ titulo, filas }: { titulo: string; filas: FilaSancion[] }) {
  if (!filas.length) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-content/10 bg-surface">
      <h3 className="border-b border-content/10 px-4 py-3 text-sm font-semibold text-content">
        {titulo} ({filas.length})
      </h3>
      <ul className="divide-y divide-content/10">
        {filas.map((fila, indice) => (
          <li key={`${fila.jugador}-${indice}`} className="px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-content">{fila.jugador}</span>
              <span className="text-xs text-content/60">
                {formatearFecha(fila.desde)} al {formatearFecha(fila.hasta)} ·{" "}
                {fila.estado}
              </span>
            </div>
            <p className="mt-1 whitespace-pre-line text-sm text-content/70">
              {fila.motivo}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function ReporteSancionesView({
  reporte,
}: {
  reporte: ReporteSanciones;
}) {
  const showSnackbar = useSnackbar();
  const [exportando, setExportando] = useState<"pdf" | "csv" | null>(null);

  const { complejo, vigentes, historicas } = reporte;
  const hayFilas = vigentes.length > 0 || historicas.length > 0;

  const meta = [[complejo.ciudad, complejo.provincia].filter(Boolean).join(", ")];
  const nombreBase = `sanciones-${slugify(complejo.nombre)}-${fechaArchivo()}`;

  const bloques = [
    { titulo: `Vigentes (${vigentes.length})`, filas: vigentes },
    { titulo: `Historicas (${historicas.length})`, filas: historicas },
  ].filter((bloque) => bloque.filas.length > 0);

  const exportarPdf = async () => {
    setExportando("pdf");
    try {
      await descargarPdf({
        titulo: `Sanciones - ${complejo.nombre}`,
        meta,
        nombreArchivo: `${nombreBase}.pdf`,
        bloques: bloques.map((bloque) => ({
          titulo: bloque.titulo,
          head: COLUMNAS,
          body: aFilas(bloque.filas),
          anchos: ANCHOS,
        })),
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
      const celdas: CeldaCsv[][] = [
        [`Sanciones - ${complejo.nombre}`],
        [meta.join(" - ")],
        [],
      ];

      for (const bloque of bloques) {
        celdas.push([bloque.titulo], COLUMNAS, ...aFilas(bloque.filas), []);
      }

      await descargarCsv(`${nombreBase}.csv`, celdas);
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
            {complejo.nombre}
          </h2>
          <p className="text-sm text-content/70">{meta.join(" · ")}</p>
          <p className="text-sm text-content/60">
            {vigentes.length} vigente{vigentes.length === 1 ? "" : "s"} ·{" "}
            {historicas.length} historica{historicas.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportarPdf}
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
          Este complejo no tiene sanciones cargadas.
        </p>
      ) : (
        <>
          <Bloque titulo="Vigentes" filas={vigentes} />
          <Bloque titulo="Historicas" filas={historicas} />
        </>
      )}
    </div>
  );
}
