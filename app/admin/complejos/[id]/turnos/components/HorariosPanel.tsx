"use client";

import { useEffect, useState } from "react";

import { minutesToTime, parseTimeToMinutes } from "@/lib/horarios";
import { DIAS_SEMANA, HORARIO_DEFAULT } from "@/lib/turnos-horario";
import {
  borrarExcepcionHorario,
  getConfiguracionHorarios,
  guardarExcepcionHorario,
  guardarHorarioSemanal,
  type ConfiguracionHorarios,
  type HorarioSemanalInput,
} from "@/actions/turnos";
import { useSnackbar } from "@/context/SnackbarContext";

type HorariosPanelProps = {
  complejoId: number;
  onCerrar: () => void;
  /** Para refrescar el calendario cuando cambia un horario. */
  onGuardado: () => void;
};

function filasPorDefecto(config: ConfiguracionHorarios): HorarioSemanalInput[] {
  return DIAS_SEMANA.map((_, diaSemana) => {
    const guardado = config.semanal.find(
      (item) => item.diaSemana === diaSemana,
    );
    return (
      guardado ?? {
        diaSemana,
        aperturaMin: HORARIO_DEFAULT.aperturaMin,
        cierreMin: HORARIO_DEFAULT.cierreMin,
        cerrado: false,
      }
    );
  });
}

export default function HorariosPanel({
  complejoId,
  onCerrar,
  onGuardado,
}: HorariosPanelProps) {
  const showSnackbar = useSnackbar();
  const [config, setConfig] = useState<ConfiguracionHorarios | null>(null);
  const [semanal, setSemanal] = useState<HorarioSemanalInput[]>([]);
  const [guardando, setGuardando] = useState(false);

  const [excFecha, setExcFecha] = useState("");
  const [excApertura, setExcApertura] = useState("09:00");
  const [excCierre, setExcCierre] = useState("23:00");
  const [excCerrado, setExcCerrado] = useState(false);
  const [excMotivo, setExcMotivo] = useState("");

  useEffect(() => {
    void getConfiguracionHorarios(complejoId)
      .then((data) => {
        setConfig(data);
        setSemanal(filasPorDefecto(data));
      })
      .catch((error: unknown) => {
        showSnackbar(
          error instanceof Error
            ? error.message
            : "No se pudo cargar el horario",
          "error",
        );
      });
  }, [complejoId, showSnackbar]);

  const actualizarDia = (
    diaSemana: number,
    cambio: Partial<HorarioSemanalInput>,
  ) => {
    setSemanal((prev) =>
      prev.map((item) =>
        item.diaSemana === diaSemana ? { ...item, ...cambio } : item,
      ),
    );
  };

  const recargar = async () => {
    const data = await getConfiguracionHorarios(complejoId);
    setConfig(data);
    setSemanal(filasPorDefecto(data));
    onGuardado();
  };

  const handleGuardarSemanal = async () => {
    setGuardando(true);
    try {
      const result = await guardarHorarioSemanal(complejoId, semanal);
      if (!result.success) {
        showSnackbar(result.error, "error");
        return;
      }
      showSnackbar("Horario de atencion guardado", "success");
      await recargar();
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudo guardar",
        "error",
      );
    } finally {
      setGuardando(false);
    }
  };

  const handleAgregarExcepcion = async () => {
    if (!excFecha) {
      showSnackbar("Elegi una fecha para la excepcion", "warning");
      return;
    }

    setGuardando(true);
    try {
      const result = await guardarExcepcionHorario(complejoId, {
        fecha: excFecha,
        aperturaMin: parseTimeToMinutes(excApertura),
        cierreMin: parseTimeToMinutes(excCierre),
        cerrado: excCerrado,
        motivo: excMotivo,
      });
      if (!result.success) {
        showSnackbar(result.error, "error");
        return;
      }
      showSnackbar("Excepcion guardada", "success");
      setExcFecha("");
      setExcMotivo("");
      setExcCerrado(false);
      await recargar();
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudo guardar",
        "error",
      );
    } finally {
      setGuardando(false);
    }
  };

  const handleBorrarExcepcion = async (fecha: string) => {
    setGuardando(true);
    try {
      await borrarExcepcionHorario(complejoId, fecha);
      showSnackbar("Excepcion eliminada", "success");
      await recargar();
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudo eliminar",
        "error",
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-6 w-full max-w-2xl rounded-xl bg-surface p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-content">
            Horario de atencion
          </h2>
          <button
            type="button"
            className="rounded-lg border border-content/20 px-3 py-1.5 text-sm"
            onClick={onCerrar}
          >
            Cerrar
          </button>
        </div>

        {!config ? (
          <p className="text-content/70">Cargando...</p>
        ) : (
          <>
            <p className="mb-3 text-sm text-content/70">
              Por defecto el complejo abre de 09:00 a 23:00. Lo que cambies aca
              rige para todas las semanas.
            </p>

            <div className="space-y-2">
              {semanal.map((dia) => (
                <div
                  key={dia.diaSemana}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-content/10 px-3 py-2"
                >
                  <span className="w-24 text-sm font-medium text-content/70">
                    {DIAS_SEMANA[dia.diaSemana]}
                  </span>
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={dia.cerrado}
                      onChange={(event) =>
                        actualizarDia(dia.diaSemana, {
                          cerrado: event.target.checked,
                        })
                      }
                    />
                    <span>Cerrado</span>
                  </label>
                  <input
                    type="time"
                    className="rounded border border-content/20 px-2 py-1 text-sm disabled:opacity-40"
                    value={minutesToTime(dia.aperturaMin)}
                    disabled={dia.cerrado}
                    onChange={(event) =>
                      actualizarDia(dia.diaSemana, {
                        aperturaMin: parseTimeToMinutes(event.target.value),
                      })
                    }
                  />
                  <span className="text-content/55">a</span>
                  <input
                    type="time"
                    className="rounded border border-content/20 px-2 py-1 text-sm disabled:opacity-40"
                    value={minutesToTime(dia.cierreMin)}
                    disabled={dia.cerrado}
                    onChange={(event) =>
                      actualizarDia(dia.diaSemana, {
                        cierreMin: parseTimeToMinutes(event.target.value),
                      })
                    }
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              className="mt-3 rounded-lg bg-success-solid px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
              onClick={() => void handleGuardarSemanal()}
              disabled={guardando}
            >
              Guardar horario semanal
            </button>

            <hr className="my-5 border-content/10" />

            <h3 className="mb-2 text-base font-semibold text-content">
              Excepciones por fecha
            </h3>
            <p className="mb-3 text-sm text-content/70">
              Para feriados o dias sueltos con otro horario. Le ganan al horario
              semanal.
            </p>

            <div className="flex flex-wrap items-end gap-2 rounded-lg border border-content/10 p-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-content/70">Fecha</span>
                <input
                  type="date"
                  className="rounded border border-content/20 px-2 py-1"
                  value={excFecha}
                  onChange={(event) => setExcFecha(event.target.value)}
                />
              </label>
              <label className="flex items-center gap-1 pb-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={excCerrado}
                  onChange={(event) => setExcCerrado(event.target.checked)}
                />
                <span>Cerrado</span>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-content/70">Desde</span>
                <input
                  type="time"
                  className="rounded border border-content/20 px-2 py-1 disabled:opacity-40"
                  value={excApertura}
                  disabled={excCerrado}
                  onChange={(event) => setExcApertura(event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-content/70">Hasta</span>
                <input
                  type="time"
                  className="rounded border border-content/20 px-2 py-1 disabled:opacity-40"
                  value={excCierre}
                  disabled={excCerrado}
                  onChange={(event) => setExcCierre(event.target.value)}
                />
              </label>
              <label className="flex grow flex-col gap-1 text-sm">
                <span className="text-content/70">Motivo</span>
                <input
                  type="text"
                  className="rounded border border-content/20 px-2 py-1"
                  placeholder="Feriado, mantenimiento..."
                  value={excMotivo}
                  onChange={(event) => setExcMotivo(event.target.value)}
                />
              </label>
              <button
                type="button"
                className="rounded-lg bg-ink px-3 py-1.5 text-sm font-semibold text-on-ink disabled:opacity-50"
                onClick={() => void handleAgregarExcepcion()}
                disabled={guardando}
              >
                Agregar
              </button>
            </div>

            {config.excepciones.length > 0 ? (
              <ul className="mt-3 space-y-1">
                {config.excepciones
                  .slice()
                  .sort((a, b) => a.fecha.localeCompare(b.fecha))
                  .map((exc) => (
                    <li
                      key={exc.fecha}
                      className="flex items-center justify-between gap-2 rounded border border-content/10 px-3 py-1.5 text-sm"
                    >
                      <span>
                        <strong>{exc.fecha}</strong>{" "}
                        {exc.cerrado
                          ? "cerrado"
                          : `${minutesToTime(exc.aperturaMin)} a ${minutesToTime(exc.cierreMin)}`}
                        {exc.motivo ? ` · ${exc.motivo}` : ""}
                      </span>
                      <button
                        type="button"
                        className="text-xs text-danger underline disabled:opacity-50"
                        onClick={() => void handleBorrarExcepcion(exc.fecha)}
                        disabled={guardando}
                      >
                        Quitar
                      </button>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-content/55">
                No hay excepciones cargadas.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
