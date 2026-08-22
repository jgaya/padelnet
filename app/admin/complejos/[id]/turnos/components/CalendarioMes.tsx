"use client";

import { DIAS_SEMANA, fechaDesdeKey } from "@/lib/turnos-horario";
import type { TurnoOcupacion } from "@/actions/turnos";
import type { CalendarioProps } from "../types";
import styles from "../page.module.css";

type CalendarioMesProps = Pick<CalendarioProps, "horarios" | "ocupacion"> & {
  /** Todas las celdas de la grilla, incluidos los dias de relleno. */
  dias: string[];
  /** Mes que se esta mirando (0-11), para atenuar el relleno. */
  mesActual: number;
  onVerDia: (dayKey: string) => void;
};

function resumen(items: TurnoOcupacion[]) {
  let turnos = 0;
  let impagos = 0;
  let partidos = 0;

  for (const item of items) {
    if (item.tipo === "PARTIDO") {
      partidos += 1;
      continue;
    }
    if (item.status === "BLOQUEADO") continue;
    turnos += 1;
    if (!item.pagado) impagos += 1;
  }

  return { turnos, impagos, partidos };
}

/** Vista mensual: cuantos turnos y partidos hay cada dia. */
export default function CalendarioMes({
  dias,
  mesActual,
  horarios,
  ocupacion,
  onVerDia,
}: CalendarioMesProps) {
  return (
    <>
      <div className={`${styles.mes} mb-1`}>
        {DIAS_SEMANA.map((dia) => (
          <div
            key={dia}
            className="px-1 text-center text-xs font-semibold uppercase tracking-wide text-slate-500"
          >
            {dia.slice(0, 3)}
          </div>
        ))}
      </div>

      <div className={styles.mes}>
        {dias.map((dayKey) => {
          const fecha = fechaDesdeKey(dayKey);
          const otroMes = fecha.getMonth() !== mesActual;
          const horario = horarios.find((item) => item.fecha === dayKey);
          const { turnos, impagos, partidos } = resumen(
            ocupacion.filter((item) => item.dayKey === dayKey),
          );

          return (
            <button
              key={dayKey}
              type="button"
              onClick={() => onVerDia(dayKey)}
              className={`${styles.diaCelda} ${otroMes ? styles.diaCeldaOtroMes : ""} ${
                horario?.cerrado ? styles.diaCeldaCerrado : ""
              }`}
            >
              <span className={styles.diaNumero}>{fecha.getDate()}</span>

              {horario?.cerrado ? (
                <span className="text-xs text-slate-500">Cerrado</span>
              ) : null}

              <span className="flex flex-wrap gap-1">
                {turnos > 0 ? (
                  <span
                    className={`${styles.diaChip} bg-emerald-100 text-emerald-900`}
                  >
                    {turnos} turno{turnos === 1 ? "" : "s"}
                  </span>
                ) : null}
                {impagos > 0 ? (
                  <span
                    className={`${styles.diaChip} bg-amber-100 text-amber-900`}
                  >
                    {impagos} impago{impagos === 1 ? "" : "s"}
                  </span>
                ) : null}
                {partidos > 0 ? (
                  <span
                    className={`${styles.diaChip} bg-blue-100 text-blue-900`}
                  >
                    {partidos} partido{partidos === 1 ? "" : "s"}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
