"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownTrayIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/solid";

import { useSnackbar } from "@/context/SnackbarContext";
import { slugify } from "@/lib/slug";
import { descargarCsv, type CeldaCsv } from "@/lib/exportar-csv";
import { descargarPdf, precargarPdf } from "@/lib/exportar-pdf";
import type { FilaHorario, ReporteHorarios } from "@/actions/reportes";

const SIN_FECHA = "Sin fecha";

const COLUMNAS_PDF = [
  "Cancha",
  "Partido",
  "Hora",
  "Resultado",
  "Firma A",
  "Firma B",
];

/**
 * Anchos en mm sobre A4 vertical (182mm utiles). "Partido" se queda con lo que
 * sobra, que es lo que mas texto lleva. Las dos firmas necesitan lugar real
 * para que alguien pueda firmar ahi.
 */
const ANCHOS_PDF = { 0: 24, 2: 14, 3: 20, 4: 24, 5: 24 };

function nombreDia(dia: string) {
  if (!dia) return SIN_FECHA;

  const [y, m, d] = dia.split("-").map(Number);
  const fecha = new Date(y, m - 1, d);
  if (Number.isNaN(fecha.getTime())) return SIN_FECHA;

  const nombre = new Intl.DateTimeFormat("es-AR", { weekday: "long" }).format(
    fecha,
  );

  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}

function fechaArchivo() {
  const hoy = new Date();
  return [
    String(hoy.getDate()).padStart(2, "0"),
    String(hoy.getMonth() + 1).padStart(2, "0"),
    hoy.getFullYear(),
  ].join("-");
}

/** Chips que se prenden y apagan, con atajos para todos y ninguno. */
function GrupoFiltro({
  titulo,
  opciones,
  activas,
  onToggle,
  onTodos,
  onNinguno,
  etiquetaDe = (valor: string) => valor,
}: {
  titulo: string;
  opciones: string[];
  activas: Record<string, boolean>;
  onToggle: (valor: string) => void;
  onTodos: () => void;
  onNinguno: () => void;
  etiquetaDe?: (valor: string) => string;
}) {
  if (opciones.length <= 1) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-content">{titulo}</span>
        <button
          type="button"
          onClick={onTodos}
          className="text-xs font-semibold text-padel-green hover:underline"
        >
          Todos
        </button>
        <button
          type="button"
          onClick={onNinguno}
          className="text-xs font-semibold text-content/60 hover:underline"
        >
          Ninguno
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {opciones.map((opcion) => {
          const activa = activas[opcion];
          return (
            <button
              key={opcion}
              type="button"
              aria-pressed={activa}
              onClick={() => onToggle(opcion)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                activa
                  ? "bg-padel-green/15 text-padel-green"
                  : "bg-surface-soft text-content/50 hover:text-content"
              }`}
            >
              {etiquetaDe(opcion)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ReporteHorariosView({
  reporte,
}: {
  reporte: ReporteHorarios;
}) {
  const showSnackbar = useSnackbar();
  const [exportando, setExportando] = useState<"pdf" | "csv" | null>(null);

  const { evento, filas } = reporte;

  const dias = useMemo(
    () => Array.from(new Set(filas.map((fila) => fila.dia))).sort(),
    [filas],
  );
  const canchas = useMemo(
    () => Array.from(new Set(filas.map((fila) => fila.cancha))).sort(),
    [filas],
  );

  const [diasActivos, setDiasActivos] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(dias.map((dia) => [dia, true])),
  );
  const [canchasActivas, setCanchasActivas] = useState<Record<string, boolean>>(
    () => Object.fromEntries(canchas.map((cancha) => [cancha, true])),
  );

  const filtradas = useMemo(
    () =>
      filas.filter((fila) => diasActivos[fila.dia] && canchasActivas[fila.cancha]),
    [filas, diasActivos, canchasActivas],
  );

  /** Un bloque por dia, en orden, sin los dias que quedaron vacios. */
  const porDia = useMemo(() => {
    const mapa = new Map<string, FilaHorario[]>();

    for (const fila of filtradas) {
      const actual = mapa.get(fila.dia);
      if (actual) actual.push(fila);
      else mapa.set(fila.dia, [fila]);
    }

    return [...mapa.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtradas]);

  const hayFilas = filtradas.length > 0;
  const nombreBase = `horarios-${slugify(evento.nombre)}-${fechaArchivo()}`;
  const meta = [evento.complejoNombre];

  const cuerpoPdf = (lista: FilaHorario[]) =>
    lista.map((fila) => [
      fila.idLegible ? `${fila.cancha}\nID: ${fila.idLegible}` : fila.cancha,
      `${fila.torneoNombre}\n${fila.enfrentamiento}`,
      fila.hora || "--:--",
      "",
      "",
      "",
    ]);

  const exportarPdf = async () => {
    setExportando("pdf");
    try {
      await descargarPdf({
        titulo: evento.nombre,
        meta,
        nombreArchivo: `${nombreBase}.pdf`,
        // Una hoja por dia: la planilla del sabado se arranca y se lleva a la
        // mesa de control sin el domingo pegado atras.
        hojaPorBloque: true,
        // Con bordes completos, que es una planilla para completar a mano.
        tema: "grid",
        fontSize: 10,
        cellPadding: 2.5,
        bloques: porDia.map(([dia, lista]) => ({
          titulo: `${nombreDia(dia)}${dia ? ` — ${dia}` : ""}`,
          head: COLUMNAS_PDF,
          body: cuerpoPdf(lista),
          anchos: ANCHOS_PDF,
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
        [evento.nombre],
        [meta.join(" - ")],
        [],
      ];

      for (const [dia, lista] of porDia) {
        celdas.push(
          [`${nombreDia(dia)}${dia ? ` (${dia})` : ""}`],
          ["Hora", "Cancha", "Torneo", "ID", "Pareja 1", "Pareja 2"],
          ...lista.map((fila) => {
            // En el CSV el enfrentamiento va partido en dos columnas: una celda
            // con saltos de linea es incomoda de filtrar en una planilla.
            const [pareja1, , pareja2] = fila.enfrentamiento.split("\n");
            return [
              fila.hora,
              fila.cancha,
              fila.torneoNombre,
              fila.idLegible ?? "",
              pareja1 ?? "",
              pareja2 ?? "",
            ];
          }),
          [],
        );
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
            {evento.nombre}
          </h2>
          <p className="text-sm text-content/70">{evento.complejoNombre}</p>
          <p className="text-sm text-content/60">
            {filtradas.length} de {filas.length} partido
            {filas.length === 1 ? "" : "s"} · {porDia.length} dia
            {porDia.length === 1 ? "" : "s"}
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

      {filas.length ? (
        <div className="flex flex-col gap-4 rounded-2xl border border-content/10 bg-surface p-5">
          <GrupoFiltro
            titulo="Dias"
            opciones={dias}
            activas={diasActivos}
            etiquetaDe={nombreDia}
            onToggle={(dia) =>
              setDiasActivos((prev) => ({ ...prev, [dia]: !prev[dia] }))
            }
            onTodos={() =>
              setDiasActivos(Object.fromEntries(dias.map((d) => [d, true])))
            }
            onNinguno={() =>
              setDiasActivos(Object.fromEntries(dias.map((d) => [d, false])))
            }
          />
          <GrupoFiltro
            titulo="Canchas"
            opciones={canchas}
            activas={canchasActivas}
            onToggle={(cancha) =>
              setCanchasActivas((prev) => ({ ...prev, [cancha]: !prev[cancha] }))
            }
            onTodos={() =>
              setCanchasActivas(
                Object.fromEntries(canchas.map((c) => [c, true])),
              )
            }
            onNinguno={() =>
              setCanchasActivas(
                Object.fromEntries(canchas.map((c) => [c, false])),
              )
            }
          />
        </div>
      ) : null}

      {!filas.length ? (
        <p className="rounded-2xl border border-content/10 bg-surface py-14 text-center text-sm text-content/60">
          Este evento todavia no tiene partidos generados.
        </p>
      ) : !hayFilas ? (
        <p className="rounded-2xl border border-content/10 bg-surface py-14 text-center text-sm text-content/60">
          Los filtros no dejan ningun partido. Prende algun dia y alguna cancha.
        </p>
      ) : (
        porDia.map(([dia, lista]) => (
          <section
            key={dia || "sin-fecha"}
            className="overflow-hidden rounded-2xl border border-content/10 bg-surface"
          >
            <h3 className="border-b border-content/10 px-4 py-3 text-sm font-semibold text-content">
              {nombreDia(dia)}
              {dia ? (
                <span className="ml-2 font-normal text-content/60">{dia}</span>
              ) : null}
              <span className="ml-2 font-normal text-content/60">
                ({lista.length})
              </span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-soft text-content/70">
                  <tr>
                    <th className="w-20 px-3 py-2 text-left font-semibold">
                      Hora
                    </th>
                    <th className="px-3 py-2 text-left font-semibold">
                      Cancha
                    </th>
                    <th className="px-3 py-2 text-left font-semibold">
                      Torneo
                    </th>
                    <th className="px-3 py-2 text-left font-semibold">
                      Partido
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((fila) => (
                    <tr
                      key={fila.partidoId}
                      className="border-t border-content/10"
                    >
                      <td className="px-3 py-2 font-medium text-content">
                        {fila.hora || "--:--"}
                      </td>
                      <td className="px-3 py-2 text-content/80">
                        {fila.cancha}
                        {fila.idLegible ? (
                          <span className="block text-xs text-content/50">
                            {fila.idLegible}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-content/70">
                        {fila.torneoNombre}
                      </td>
                      <td className="whitespace-pre-line px-3 py-2 text-content">
                        {fila.enfrentamiento}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </div>
  );
}
