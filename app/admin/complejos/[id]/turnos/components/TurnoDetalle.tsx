"use client";

import { useState } from "react";

import { minutesToTime } from "@/lib/horarios";
import { FRECUENCIA_LABEL } from "@/lib/turnos-recurrencia";
import type { CancelarAlcance, TurnoOcupacion } from "@/actions/turnos";

type TurnoDetalleProps = {
  turno: TurnoOcupacion;
  canchaLabel: string;
  trabajando: boolean;
  onCerrar: () => void;
  onPago: (pagado: boolean) => void;
  onCancelar: (alcance: CancelarAlcance) => void;
};

export default function TurnoDetalle({
  turno,
  canchaLabel,
  trabajando,
  onCerrar,
  onPago,
  onCancelar,
}: TurnoDetalleProps) {
  const [confirmando, setConfirmando] = useState(false);
  const esBloqueo = turno.status === "BLOQUEADO";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4">
      <div className="mt-10 w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">
          {esBloqueo ? "Cancha bloqueada" : turno.titulo}
        </h2>

        <dl className="mt-3 space-y-1 text-sm text-slate-700">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Cancha</dt>
            <dd>{canchaLabel}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Fecha</dt>
            <dd>{turno.dayKey}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Horario</dt>
            <dd>
              {minutesToTime(turno.inicioMin)} - {minutesToTime(turno.finMin)}
            </dd>
          </div>
          {turno.detalle ? (
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Telefono</dt>
              <dd>{turno.detalle}</dd>
            </div>
          ) : null}
          {turno.frecuencia ? (
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Turno fijo</dt>
              <dd>{FRECUENCIA_LABEL[turno.frecuencia]}</dd>
            </div>
          ) : null}
          {!esBloqueo ? (
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Pago</dt>
              <dd
                className={
                  turno.pagado
                    ? "font-semibold text-emerald-700"
                    : "font-semibold text-amber-700"
                }
              >
                {turno.pagado ? "Pagado" : "Impago"}
              </dd>
            </div>
          ) : null}
          {turno.notas ? (
            <div className="pt-1">
              <dt className="text-slate-500">Notas</dt>
              <dd>{turno.notas}</dd>
            </div>
          ) : null}
        </dl>

        {confirmando ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="mb-2 text-sm text-red-900">
              {turno.serieId
                ? "Este turno es parte de una serie. Que queres cancelar?"
                : "Seguro que queres cancelar este turno?"}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                onClick={() => onCancelar("SOLO")}
                disabled={trabajando}
              >
                {turno.serieId ? "Solo este turno" : "Cancelar el turno"}
              </button>
              {turno.serieId ? (
                <button
                  type="button"
                  className="rounded-lg bg-red-700 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                  onClick={() => onCancelar("SIGUIENTES")}
                  disabled={trabajando}
                >
                  Este y los siguientes
                </button>
              ) : null}
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                onClick={() => setConfirmando(false)}
                disabled={trabajando}
              >
                Volver
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            {!esBloqueo ? (
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50"
                onClick={() => onPago(!turno.pagado)}
                disabled={trabajando}
              >
                {turno.pagado ? "Marcar impago" : "Marcar pagado"}
              </button>
            ) : null}
            <button
              type="button"
              className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700 disabled:opacity-50"
              onClick={() => setConfirmando(true)}
              disabled={trabajando}
            >
              Cancelar turno
            </button>
            <button
              type="button"
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white"
              onClick={onCerrar}
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
