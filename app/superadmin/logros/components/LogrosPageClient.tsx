"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  EyeIcon,
  EyeSlashIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";

import RowActions from "@/components/RowActions";
import TitleBar from "@/components/TitleBar";
import MedallaLogro from "@/components/logros/MedallaLogro";
import { useSnackbar } from "@/context/SnackbarContext";
import {
  alternarActivoLogro,
  borrarLogro,
  listarLogros,
  type LogroAdminItem,
} from "@/actions/logros";
import { ESTILO_RAREZA } from "@/lib/logros-catalogo";

export default function LogrosPageClient() {
  const [items, setItems] = useState<LogroAdminItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const showSnackbar = useSnackbar();

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setItems(await listarLogros());
    } catch {
      showSnackbar("No se pudo cargar el catalogo de logros", "error");
    } finally {
      setCargando(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const onAlternar = async (logro: LogroAdminItem) => {
    const res = await alternarActivoLogro(logro.id, !logro.activo);
    if (!res.success) {
      showSnackbar(res.error, "error");
      return;
    }
    showSnackbar(logro.activo ? "Logro desactivado" : "Logro activado", "success");
    await cargar();
  };

  const onBorrar = async (logro: LogroAdminItem) => {
    const res = await borrarLogro(logro.id);
    if (!res.success) {
      showSnackbar(res.error, "error");
      return;
    }
    showSnackbar("Logro borrado", "success");
    await cargar();
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <TitleBar
        title="Logros"
        total={items.length}
        buttons={
          <Link className="btn btn-primary" href="/superadmin/logros/new">
            Nuevo logro
          </Link>
        }
      />

      <p className="mb-4 text-sm text-content/70">
        El <strong>codigo</strong> es lo que el motor busca para otorgar el
        logro. Se define al crear y no se puede editar despues: cambiarlo lo
        desengancharia de los eventos que lo dan.
      </p>

      {cargando ? (
        <p className="py-16 text-center text-sm text-content/60">Cargando...</p>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-content/10 bg-surface py-16 text-center text-sm text-content/60">
          No hay logros cargados. El seed trae un catalogo inicial.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((logro) => (
            <li
              key={logro.id}
              className={`flex items-start gap-3 rounded-2xl border border-content/10 bg-surface p-4 ${
                logro.activo ? "" : "opacity-60"
              }`}
            >
              <div className="w-24 shrink-0">
                <MedallaLogro
                  titulo={logro.titulo}
                  descripcion={logro.descripcion}
                  icono={logro.icono}
                  rareza={logro.rareza}
                  obtenido
                  progreso={0}
                  progresoObjetivo={null}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-content">
                      {logro.titulo}
                    </p>
                    <p className="truncate font-mono text-xs text-content/60">
                      {logro.codigo}
                    </p>
                  </div>

                  <RowActions
                    tituloMobile={logro.titulo}
                    actions={[
                      {
                        key: "editar",
                        label: "Editar",
                        icon: <PencilSquareIcon className="h-4 w-4" />,
                        href: `/superadmin/logros/${logro.id}`,
                      },
                      {
                        key: "activo",
                        label: logro.activo ? "Desactivar" : "Activar",
                        icon: logro.activo ? (
                          <EyeSlashIcon className="h-4 w-4" />
                        ) : (
                          <EyeIcon className="h-4 w-4" />
                        ),
                        onClick: () => onAlternar(logro),
                      },
                      {
                        key: "borrar",
                        label: "Borrar",
                        icon: <TrashIcon className="h-4 w-4" />,
                        variant: "danger" as const,
                        disabled: logro.obtenidoPor > 0,
                        disabledReason:
                          "Ya hay jugadores que lo ganaron: desactivalo",
                        onClick: () => onBorrar(logro),
                        confirm: {
                          title: "Borrar logro",
                          message: `Se elimina "${logro.titulo}" del catalogo.`,
                          textBtn: "Borrar",
                        },
                      },
                    ]}
                  />
                </div>

                <p className="mt-1 text-sm text-content/70">
                  {logro.descripcion}
                </p>

                <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                  <span
                    className={`rounded-full px-2 py-0.5 ${ESTILO_RAREZA[logro.rareza].fondo} ${ESTILO_RAREZA[logro.rareza].texto}`}
                  >
                    {ESTILO_RAREZA[logro.rareza].label}
                  </span>
                  <span className="rounded-full bg-surface-soft px-2 py-0.5 text-content/70">
                    {logro.progresoObjetivo
                      ? `Objetivo: ${logro.progresoObjetivo}`
                      : "Se gana la 1ra vez"}
                  </span>
                  <span className="rounded-full bg-surface-soft px-2 py-0.5 text-content/70">
                    {logro.obtenidoPor} jugador
                    {logro.obtenidoPor === 1 ? "" : "es"}
                  </span>
                  {!logro.activo ? (
                    <span className="rounded-full bg-warning/15 px-2 py-0.5 text-warning">
                      Inactivo
                    </span>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
