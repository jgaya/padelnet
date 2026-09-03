"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/solid";

import SearchBar from "@/components/SearchBar";
import TitleBar from "@/components/TitleBar";
import { useSnackbar } from "@/context/SnackbarContext";
import { useUpdateSearchParams } from "@/hooks/useUpdateSearchParams";
import { listarAuditoria, type AuditoriaItem } from "@/actions/auditoria";

const ACCIONES = ["CREAR", "ACTUALIZAR", "BORRAR", "MASIVA"] as const;
const PAGE_SIZE = 25;

const COLOR_ACCION: Record<string, string> = {
  CREAR: "bg-padel-green/15 text-padel-green",
  ACTUALIZAR: "bg-info/15 text-info",
  BORRAR: "bg-danger/15 text-danger",
  MASIVA: "bg-warning/15 text-warning",
};

function formatear(fecha: Date) {
  return new Date(fecha).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Recorta lo largo: un Json entero rompe el ancho de la tabla. */
function recortar(valor: string | null) {
  if (valor === null) return "—";
  if (valor === "") return '""';
  return valor.length > 120 ? `${valor.slice(0, 120)}…` : valor;
}

export default function TablaAuditoria({ tablas }: { tablas: string[] }) {
  const [items, setItems] = useState<AuditoriaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());

  const router = useRouter();
  const searchParams = useSearchParams();
  const showSnackbar = useSnackbar();
  const updateQuery = useUpdateSearchParams();

  const tabla = searchParams.get("tabla") ?? "";
  const accion = searchParams.get("accion") ?? "";
  const registroId = searchParams.get("registroId") ?? "";
  const desde = searchParams.get("desde") ?? "";
  const hasta = searchParams.get("hasta") ?? "";
  const searchBy = searchParams.get("searchBy") ?? "";
  const page = Number(searchParams.get("page")) || 1;

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await listarAuditoria({
        page,
        pageSize: PAGE_SIZE,
        tabla: tabla || undefined,
        accion: accion || undefined,
        registroId: registroId || undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
        searchBy,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch {
      showSnackbar("No se pudo cargar el registro de cambios", "error");
    } finally {
      setCargando(false);
    }
  }, [page, tabla, accion, registroId, desde, hasta, searchBy, showSnackbar]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const alternar = (id: string) =>
    setAbiertas((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });

  const filtrar = (clave: string, valor: string) =>
    router.push(updateQuery({ [clave]: valor || null, page: 1 }));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <TitleBar title="Registro de cambios" total={total} />

      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-content/10 bg-surface p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-content/70">Tabla</span>
            <select
              className="padel-form-select"
              value={tabla}
              onChange={(e) => filtrar("tabla", e.target.value)}
            >
              <option value="">Todas</option>
              {tablas.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-content/70">Accion</span>
            <select
              className="padel-form-select"
              value={accion}
              onChange={(e) => filtrar("accion", e.target.value)}
            >
              <option value="">Todas</option>
              {ACCIONES.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-content/70">Desde</span>
            <input
              type="date"
              lang="es-AR"
              className="padel-form-input"
              value={desde}
              onChange={(e) => filtrar("desde", e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-content/70">Hasta</span>
            <input
              type="date"
              lang="es-AR"
              className="padel-form-input"
              value={hasta}
              onChange={(e) => filtrar("hasta", e.target.value)}
            />
          </label>
        </div>

        <SearchBar placeholder="Buscar por persona, mail o id de registro..." />

        {registroId ? (
          <p className="text-sm text-content/70">
            Historial del registro <strong>#{registroId}</strong>{" "}
            <button
              type="button"
              onClick={() => filtrar("registroId", "")}
              className="font-semibold text-padel-green hover:underline"
            >
              ver todo
            </button>
          </p>
        ) : null}
      </div>

      {cargando ? (
        <p className="py-16 text-center text-sm text-content/60">Cargando...</p>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-content/10 bg-surface py-16 text-center text-sm text-content/60">
          No hay cambios registrados con esos filtros.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-content/10 bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-soft text-content/70">
                <tr>
                  <th className="w-8 px-2 py-2" />
                  <th className="px-3 py-2 text-left font-semibold">Fecha</th>
                  <th className="px-3 py-2 text-left font-semibold">Quien</th>
                  <th className="px-3 py-2 text-left font-semibold">Tabla</th>
                  <th className="px-3 py-2 text-left font-semibold">Accion</th>
                  <th className="px-3 py-2 text-left font-semibold">Registro</th>
                  <th className="px-3 py-2 text-left font-semibold">Cambios</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const abierta = abiertas.has(item.id);

                  return (
                    <Fragment key={item.id}>
                      <tr
                        className="cursor-pointer border-t border-content/10 hover:bg-surface-soft"
                        onClick={() => alternar(item.id)}
                      >
                        <td className="px-2 py-2 text-content/40">
                          {abierta ? (
                            <ChevronDownIcon className="h-4 w-4" />
                          ) : (
                            <ChevronRightIcon className="h-4 w-4" />
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-content/70">
                          {formatear(item.createdAt)}
                        </td>
                        <td className="px-3 py-2 font-medium text-content">
                          {item.actor}
                          {item.origen !== "web" ? (
                            <span className="ml-1 text-xs text-content/50">
                              ({item.origen})
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 text-content/80">
                          {item.tabla}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${COLOR_ACCION[item.accion] ?? "bg-surface-soft"}`}
                          >
                            {item.accion}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-content/70">
                          {item.registroId ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                filtrar("registroId", item.registroId!);
                              }}
                              className="font-medium text-padel-green hover:underline"
                            >
                              #{item.registroId}
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-2 text-content/60">
                          {item.cambios.length} campo
                          {item.cambios.length === 1 ? "" : "s"}
                        </td>
                      </tr>

                      {abierta ? (
                        <tr className="bg-surface-soft/50">
                          <td />
                          <td colSpan={6} className="px-3 pb-3">
                            <ul className="flex flex-col gap-1">
                              {item.cambios.map((cambio) => (
                                <li
                                  key={cambio.campo}
                                  className="flex flex-wrap items-baseline gap-2 text-xs"
                                >
                                  <span className="min-w-32 font-semibold text-content">
                                    {cambio.campo}
                                  </span>
                                  <span className="text-danger line-through">
                                    {recortar(cambio.antes)}
                                  </span>
                                  <span className="text-content/40">→</span>
                                  <span className="text-padel-green">
                                    {recortar(cambio.despues)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPaginas > 1 ? (
        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => router.push(updateQuery({ page: page - 1 }))}
            className="rounded-full bg-surface-soft px-4 py-2 text-sm font-semibold text-content disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-sm text-content/60">
            Pagina {page} de {totalPaginas}
          </span>
          <button
            type="button"
            disabled={page >= totalPaginas}
            onClick={() => router.push(updateQuery({ page: page + 1 }))}
            className="rounded-full bg-surface-soft px-4 py-2 text-sm font-semibold text-content disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      ) : null}
    </div>
  );
}
