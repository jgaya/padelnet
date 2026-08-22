"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import TitleBar from "@/components/TitleBar";
import { useSnackbar } from "@/context/SnackbarContext";
import {
  cancelarTurno,
  crearTurno,
  getTurnosCalendario,
  marcarPagoTurno,
  type CancelarAlcance,
  type CrearTurnoPayload,
  type TurnoOcupacion,
  type TurnosCalendario,
} from "@/actions/turnos";
import {
  DIAS_SEMANA,
  fechaDesdeKey,
  fechaKey,
  sumarDias,
} from "@/lib/turnos-horario";

import CalendarioDia from "./components/CalendarioDia";
import CalendarioMes from "./components/CalendarioMes";
import CalendarioSemana from "./components/CalendarioSemana";
import HorariosPanel from "./components/HorariosPanel";
import TurnoDetalle from "./components/TurnoDetalle";
import TurnoForm from "./components/TurnoForm";
import type { VistaCalendario } from "./types";

/** Rango de fechas que hay que pedir para dibujar cada vista. */
function rangoDeVista(vista: VistaCalendario, ancla: Date) {
  if (vista === "DIA") {
    return { desde: ancla, hasta: ancla };
  }

  if (vista === "SEMANA") {
    const desde = sumarDias(ancla, -ancla.getDay());
    return { desde, hasta: sumarDias(desde, 6) };
  }

  // El mes se dibuja en semanas completas, asi que el rango se estira hasta el
  // domingo previo al dia 1 y el sabado posterior al ultimo dia.
  const primero = new Date(ancla.getFullYear(), ancla.getMonth(), 1);
  const ultimo = new Date(ancla.getFullYear(), ancla.getMonth() + 1, 0);

  return {
    desde: sumarDias(primero, -primero.getDay()),
    hasta: sumarDias(ultimo, 6 - ultimo.getDay()),
  };
}

function listarDias(desde: Date, hasta: Date) {
  const dias: string[] = [];
  for (
    let fecha = new Date(desde);
    fecha <= hasta;
    fecha = sumarDias(fecha, 1)
  ) {
    dias.push(fechaKey(fecha));
  }
  return dias;
}

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export default function TurnosPageClient({ basePath }: { basePath: string }) {
  const params = useParams<{ id: string }>();
  const complejoId = Number(params.id);
  const showSnackbar = useSnackbar();

  const [vista, setVista] = useState<VistaCalendario>("DIA");
  const [ancla, setAncla] = useState(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return hoy;
  });

  const [data, setData] = useState<TurnosCalendario | null>(null);
  const [cargando, setCargando] = useState(true);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canchaFiltro, setCanchaFiltro] = useState<number | "TODAS">("TODAS");

  const [nuevoTurno, setNuevoTurno] = useState<{
    fecha: string;
    canchaId: number;
    inicioMin: number;
  } | null>(null);
  const [detalle, setDetalle] = useState<TurnoOcupacion | null>(null);
  const [verHorarios, setVerHorarios] = useState(false);

  const rango = useMemo(() => rangoDeVista(vista, ancla), [ancla, vista]);
  const desdeKey = fechaKey(rango.desde);
  const hastaKey = fechaKey(rango.hasta);

  const cargar = useCallback(async () => {
    if (!Number.isInteger(complejoId) || complejoId <= 0) {
      setError("Complejo invalido");
      setCargando(false);
      return;
    }

    setCargando(true);
    setError(null);

    try {
      const result = await getTurnosCalendario(complejoId, desdeKey, hastaKey);
      setData(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo cargar el calendario";
      setError(message);
      showSnackbar(message, "error");
    } finally {
      setCargando(false);
    }
  }, [complejoId, desdeKey, hastaKey, showSnackbar]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const mover = (pasos: number) => {
    setAncla((prev) => {
      if (vista === "DIA") return sumarDias(prev, pasos);
      if (vista === "SEMANA") return sumarDias(prev, pasos * 7);
      return new Date(prev.getFullYear(), prev.getMonth() + pasos, 1);
    });
  };

  const irHoy = () => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    setAncla(hoy);
  };

  const canchasVisibles = useMemo(() => {
    if (!data) return [];
    return canchaFiltro === "TODAS"
      ? data.canchas
      : data.canchas.filter((cancha) => cancha.id === canchaFiltro);
  }, [canchaFiltro, data]);

  const ocupacionVisible = useMemo(() => {
    if (!data) return [];
    return canchaFiltro === "TODAS"
      ? data.ocupacion
      : data.ocupacion.filter((item) => item.canchaId === canchaFiltro);
  }, [canchaFiltro, data]);

  const handleCrear = async (payload: CrearTurnoPayload) => {
    setTrabajando(true);
    try {
      const result = await crearTurno(complejoId, payload);

      if (!result.success) {
        showSnackbar(result.error, "error");
        return;
      }

      // Los salteos importan: en una serie hay fechas que no entran porque el
      // complejo cierra o porque ya hay algo. Callarlo seria mentir.
      if (result.salteados.length > 0) {
        showSnackbar(
          `Se crearon ${result.creados} turnos. Quedaron afuera ${result.salteados.length}: ${result.salteados.slice(0, 3).join("; ")}${result.salteados.length > 3 ? "..." : ""}`,
          "warning",
        );
      } else {
        showSnackbar(
          result.creados === 1
            ? "Turno creado"
            : `Se crearon ${result.creados} turnos`,
          "success",
        );
      }

      setNuevoTurno(null);
      await cargar();
    } catch (err) {
      showSnackbar(
        err instanceof Error ? err.message : "No se pudo crear el turno",
        "error",
      );
    } finally {
      setTrabajando(false);
    }
  };

  const handlePago = async (pagado: boolean) => {
    if (!detalle) return;
    setTrabajando(true);
    try {
      const result = await marcarPagoTurno(complejoId, detalle.id, pagado);
      if (!result.success) {
        showSnackbar(result.error, "error");
        return;
      }
      showSnackbar(
        pagado ? "Turno marcado pagado" : "Turno marcado impago",
        "success",
      );
      setDetalle(null);
      await cargar();
    } catch (err) {
      showSnackbar(
        err instanceof Error ? err.message : "No se pudo actualizar el pago",
        "error",
      );
    } finally {
      setTrabajando(false);
    }
  };

  const handleCancelar = async (alcance: CancelarAlcance) => {
    if (!detalle) return;
    setTrabajando(true);
    try {
      const result = await cancelarTurno(complejoId, detalle.id, alcance);
      if (!result.success) {
        showSnackbar(result.error, "error");
        return;
      }
      showSnackbar(
        alcance === "SIGUIENTES" ? "Serie cortada" : "Turno cancelado",
        "success",
      );
      setDetalle(null);
      await cargar();
    } catch (err) {
      showSnackbar(
        err instanceof Error ? err.message : "No se pudo cancelar",
        "error",
      );
    } finally {
      setTrabajando(false);
    }
  };

  const abrirDia = (dayKey: string) => {
    setAncla(fechaDesdeKey(dayKey));
    setVista("DIA");
  };

  const titulo = useMemo(() => {
    if (vista === "DIA") {
      return `${DIAS_SEMANA[ancla.getDay()]} ${ancla.getDate()} de ${MESES[ancla.getMonth()]}`;
    }
    if (vista === "SEMANA") {
      return `Semana del ${rango.desde.getDate()}/${rango.desde.getMonth() + 1} al ${rango.hasta.getDate()}/${rango.hasta.getMonth() + 1}`;
    }
    return `${MESES[ancla.getMonth()]} ${ancla.getFullYear()}`;
  }, [ancla, rango, vista]);

  if (!Number.isInteger(complejoId) || complejoId <= 0) {
    return (
      <>
        <TitleBar title="Turnos" />
        <p>Parametros invalidos.</p>
      </>
    );
  }

  return (
    <>
      <TitleBar
        title="Turnos de cancha"
        buttons={
          <>
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              onClick={() => setVerHorarios(true)}
            >
              Horarios
            </button>
            <Link
              href={`${basePath}/${complejoId}/canchas`}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            >
              Canchas
            </Link>
          </>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="inline-flex overflow-hidden rounded-lg border border-slate-300">
          {(["DIA", "SEMANA", "MES"] as const).map((opcion) => (
            <button
              key={opcion}
              type="button"
              className={`px-3 py-1.5 text-sm ${
                vista === opcion
                  ? "bg-slate-900 font-semibold text-white"
                  : "bg-white text-slate-700"
              }`}
              onClick={() => setVista(opcion)}
            >
              {opcion === "DIA"
                ? "Dia"
                : opcion === "SEMANA"
                  ? "Semana"
                  : "Mes"}
            </button>
          ))}
        </div>

        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
            onClick={() => mover(-1)}
            aria-label="Anterior"
          >
            &larr;
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            onClick={irHoy}
          >
            Hoy
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
            onClick={() => mover(1)}
            aria-label="Siguiente"
          >
            &rarr;
          </button>
        </div>

        <span className="text-base font-semibold capitalize text-slate-900">
          {titulo}
        </span>

        {data && data.canchas.length > 1 ? (
          <select
            className="ml-auto rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            value={canchaFiltro}
            onChange={(event) =>
              setCanchaFiltro(
                event.target.value === "TODAS"
                  ? "TODAS"
                  : Number(event.target.value),
              )
            }
          >
            <option value="TODAS">Todas las canchas</option>
            {data.canchas.map((cancha) => (
              <option key={cancha.id} value={cancha.id}>
                {cancha.label}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-slate-600">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded border border-emerald-600 bg-emerald-100" />
          Pagado
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded border border-amber-600 bg-amber-100" />
          Impago
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded border border-blue-600 bg-blue-100" />
          Partido de torneo
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded border border-slate-400 bg-slate-200" />
          Bloqueado
        </span>
      </div>

      {cargando ? (
        <p className="text-slate-600">Cargando calendario...</p>
      ) : null}
      {!cargando && error ? <p className="text-red-700">{error}</p> : null}

      {!cargando && data ? (
        <>
          {vista === "DIA" ? (
            <CalendarioDia
              dayKey={desdeKey}
              canchas={canchasVisibles}
              horarios={data.horarios}
              ocupacion={ocupacionVisible}
              duracionDefault={data.duracionDefault}
              onSlotLibre={(fecha, canchaId, inicioMin) =>
                setNuevoTurno({ fecha, canchaId, inicioMin })
              }
              onTurno={setDetalle}
            />
          ) : null}

          {vista === "SEMANA" ? (
            <CalendarioSemana
              dias={listarDias(rango.desde, rango.hasta)}
              canchas={canchasVisibles}
              horarios={data.horarios}
              ocupacion={ocupacionVisible}
              duracionDefault={data.duracionDefault}
              onSlotLibre={(fecha, canchaId, inicioMin) =>
                setNuevoTurno({ fecha, canchaId, inicioMin })
              }
              onTurno={setDetalle}
              onVerDia={abrirDia}
            />
          ) : null}

          {vista === "MES" ? (
            <CalendarioMes
              dias={listarDias(rango.desde, rango.hasta)}
              mesActual={ancla.getMonth()}
              horarios={data.horarios}
              ocupacion={ocupacionVisible}
              onVerDia={abrirDia}
            />
          ) : null}

          {data.canchas.length > 0 ? (
            <button
              type="button"
              className="mt-3 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white"
              onClick={() =>
                setNuevoTurno({
                  fecha: vista === "DIA" ? desdeKey : fechaKey(ancla),
                  canchaId: data.canchas[0].id,
                  inicioMin: 9 * 60,
                })
              }
            >
              Nuevo turno
            </button>
          ) : null}
        </>
      ) : null}

      {nuevoTurno && data ? (
        <TurnoForm
          complejoId={complejoId}
          canchas={data.canchas}
          inicial={nuevoTurno}
          guardando={trabajando}
          onCancel={() => setNuevoTurno(null)}
          onSubmit={(payload) => void handleCrear(payload)}
        />
      ) : null}

      {detalle && data ? (
        <TurnoDetalle
          turno={detalle}
          canchaLabel={
            data.canchas.find((cancha) => cancha.id === detalle.canchaId)
              ?.label ?? "Cancha"
          }
          trabajando={trabajando}
          onCerrar={() => setDetalle(null)}
          onPago={(pagado) => void handlePago(pagado)}
          onCancelar={(alcance) => void handleCancelar(alcance)}
        />
      ) : null}

      {verHorarios ? (
        <HorariosPanel
          complejoId={complejoId}
          onCerrar={() => setVerHorarios(false)}
          onGuardado={() => void cargar()}
        />
      ) : null}
    </>
  );
}
