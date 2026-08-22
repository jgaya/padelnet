"use client";

import { minutesToTime } from "@/lib/horarios";
import { DIAS_SEMANA, fechaDesdeKey } from "@/lib/turnos-horario";
import type { CalendarioProps } from "../types";
import styles from "../page.module.css";

type CalendarioSemanaProps = CalendarioProps & {
  /** Las 7 claves "YYYY-MM-DD" de la semana, de domingo a sabado. */
  dias: string[];
  onVerDia: (dayKey: string) => void;
};

/**
 * Vista semanal: una columna por dia con la lista de lo agendado. No intenta
 * dibujar la grilla horaria de las 7 canchas por dia, que a este ancho no se
 * lee; para eso esta la vista diaria, a la que se llega clickeando el dia.
 */
export default function CalendarioSemana({
  dias,
  horarios,
  ocupacion,
  canchas,
  onVerDia,
  onTurno,
}: CalendarioSemanaProps) {
  const labelCancha = new Map(canchas.map((c) => [c.id, `C${c.numero}`]));

  return (
    <div className={styles.semana}>
      {dias.map((dayKey) => {
        const fecha = fechaDesdeKey(dayKey);
        const horario = horarios.find((item) => item.fecha === dayKey);
        const items = ocupacion
          .filter((item) => item.dayKey === dayKey)
          .sort((a, b) => a.inicioMin - b.inicioMin);

        return (
          <div
            key={dayKey}
            className={`${styles.diaCelda} ${horario?.cerrado ? styles.diaCeldaCerrado : ""}`}
            style={{ minHeight: 180, cursor: "default" }}
          >
            <button
              type="button"
              className="text-left"
              onClick={() => onVerDia(dayKey)}
              title="Ver el dia"
            >
              <span className={styles.diaNumero}>
                {DIAS_SEMANA[fecha.getDay()].slice(0, 3)} {fecha.getDate()}
              </span>
              <span className="block text-xs text-slate-500">
                {horario?.cerrado
                  ? "Cerrado"
                  : horario
                    ? `${minutesToTime(horario.aperturaMin)}-${minutesToTime(horario.cierreMin)}`
                    : ""}
              </span>
            </button>

            <div className="flex flex-col gap-1 overflow-y-auto">
              {items.length === 0 ? (
                <span className="text-xs text-slate-400">Sin turnos</span>
              ) : null}

              {items.map((item) => {
                const esPartido = item.tipo === "PARTIDO";
                const color = esPartido
                  ? "bg-blue-100 text-blue-900"
                  : item.status === "BLOQUEADO"
                    ? "bg-slate-200 text-slate-700"
                    : item.pagado
                      ? "bg-emerald-100 text-emerald-900"
                      : "bg-amber-100 text-amber-900";

                return (
                  <button
                    key={`${item.tipo}-${item.id}`}
                    type="button"
                    disabled={esPartido}
                    onClick={() => onTurno(item)}
                    className={`rounded px-1.5 py-1 text-left text-[0.7rem] leading-tight ${color} ${esPartido ? "cursor-not-allowed" : "hover:brightness-95"}`}
                  >
                    <span className="font-semibold">
                      {minutesToTime(item.inicioMin)}
                    </span>{" "}
                    {labelCancha.get(item.canchaId) ?? ""} · {item.titulo}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
