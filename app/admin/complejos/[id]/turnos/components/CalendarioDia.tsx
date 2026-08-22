"use client";

import { useMemo } from "react";

import { minutesToTime } from "@/lib/horarios";
import { generarFranjas, type HorarioResuelto } from "@/lib/turnos-horario";
import type { TurnoOcupacion } from "@/actions/turnos";
import type { CalendarioProps } from "../types";
import styles from "../page.module.css";

/** Cada cuantos minutos se dibuja una linea de referencia. */
const PASO_LINEAS = 60;

type CalendarioDiaProps = CalendarioProps & { dayKey: string };

function claseDeBloque(item: TurnoOcupacion) {
  if (item.tipo === "PARTIDO") return styles.bloquePartido;
  if (item.status === "BLOQUEADO") return styles.bloqueBloqueado;
  return item.pagado ? styles.bloqueTurno : styles.bloqueImpago;
}

export default function CalendarioDia({
  dayKey,
  canchas,
  horarios,
  ocupacion,
  duracionDefault,
  onSlotLibre,
  onTurno,
}: CalendarioDiaProps) {
  const horario: HorarioResuelto | undefined = horarios.find(
    (item) => item.fecha === dayKey,
  );

  const delDia = useMemo(
    () => ocupacion.filter((item) => item.dayKey === dayKey),
    [dayKey, ocupacion],
  );

  // Los limites de la grilla se estiran si hay algo agendado fuera del horario
  // de atencion (un partido cargado antes de la apertura, un turno que quedo de
  // un horario viejo): si no, el bloque se dibujaria fuera del contenedor.
  const { desdeMin, hastaMin } = useMemo(() => {
    let desde = horario?.cerrado ? 9 * 60 : (horario?.aperturaMin ?? 9 * 60);
    let hasta = horario?.cerrado ? 23 * 60 : (horario?.cierreMin ?? 23 * 60);

    for (const item of delDia) {
      desde = Math.min(desde, item.inicioMin);
      hasta = Math.max(hasta, item.finMin);
    }

    return { desdeMin: desde, hastaMin: Math.max(hasta, desde + 60) };
  }, [delDia, horario]);

  const totalMin = hastaMin - desdeMin;
  const alto = `calc(var(--hora-alto) * ${totalMin / 60})`;
  const posicion = (minuto: number) =>
    `calc(var(--hora-alto) * ${(minuto - desdeMin) / 60})`;

  // Huecos clickeables: las franjas del horario que no estan ocupadas.
  const franjasLibres = useMemo(() => {
    if (!horario || horario.cerrado) return new Map<number, number[]>();

    const franjas = generarFranjas(horario, duracionDefault);
    const porCancha = new Map<number, number[]>();

    for (const cancha of canchas) {
      const ocupadas = delDia.filter((item) => item.canchaId === cancha.id);
      const libres = franjas
        .filter(
          (franja) =>
            !ocupadas.some(
              (item) =>
                franja.inicioMin < item.finMin &&
                item.inicioMin < franja.finMin,
            ),
        )
        .map((franja) => franja.inicioMin);

      porCancha.set(cancha.id, libres);
    }

    return porCancha;
  }, [canchas, delDia, duracionDefault, horario]);

  const lineas: number[] = [];
  const primeraLinea = Math.ceil(desdeMin / PASO_LINEAS) * PASO_LINEAS;
  for (let minuto = primeraLinea; minuto <= hastaMin; minuto += PASO_LINEAS) {
    lineas.push(minuto);
  }

  if (canchas.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-4 text-slate-600">
        Este complejo no tiene canchas activas.
      </p>
    );
  }

  return (
    <>
      {horario?.cerrado ? (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          El complejo esta cerrado este dia
          {horario.motivo ? `: ${horario.motivo}` : ""}.
        </p>
      ) : null}

      <div
        className={styles.calendario}
        style={{ ["--columnas" as string]: canchas.length }}
      >
        <div className={styles.grilla}>
          <div className={`${styles.encabezado} ${styles.encabezadoHoras}`}>
            Hora
          </div>
          {canchas.map((cancha) => (
            <div key={cancha.id} className={styles.encabezado}>
              {cancha.label}
            </div>
          ))}

          <div className={styles.columnaHoras} style={{ height: alto }}>
            {lineas.map((minuto) => (
              <span
                key={minuto}
                className={styles.marcaHora}
                style={{ top: posicion(minuto) }}
              >
                {minutesToTime(minuto)}
              </span>
            ))}
          </div>

          {canchas.map((cancha) => {
            const items = delDia.filter((item) => item.canchaId === cancha.id);
            const libres = franjasLibres.get(cancha.id) ?? [];

            return (
              <div
                key={cancha.id}
                className={styles.columna}
                style={{ height: alto }}
              >
                {lineas.map((minuto) => (
                  <div
                    key={minuto}
                    className={styles.lineaHora}
                    style={{ top: posicion(minuto) }}
                  />
                ))}

                {/* Franjas fuera del horario de atencion, rayadas. */}
                {horario && !horario.cerrado ? (
                  <>
                    {horario.aperturaMin > desdeMin ? (
                      <div
                        className={styles.fueraDeHorario}
                        style={{
                          top: posicion(desdeMin),
                          height: `calc(var(--hora-alto) * ${(horario.aperturaMin - desdeMin) / 60})`,
                        }}
                      />
                    ) : null}
                    {horario.cierreMin < hastaMin ? (
                      <div
                        className={styles.fueraDeHorario}
                        style={{
                          top: posicion(horario.cierreMin),
                          height: `calc(var(--hora-alto) * ${(hastaMin - horario.cierreMin) / 60})`,
                        }}
                      />
                    ) : null}
                  </>
                ) : (
                  <div
                    className={styles.fueraDeHorario}
                    style={{ top: 0, height: alto }}
                  />
                )}

                {libres.map((inicioMin) => (
                  <button
                    key={`libre-${inicioMin}`}
                    type="button"
                    className={styles.libre}
                    style={{
                      top: posicion(inicioMin),
                      height: `calc(var(--hora-alto) * ${duracionDefault / 60} - 4px)`,
                    }}
                    onClick={() => onSlotLibre(dayKey, cancha.id, inicioMin)}
                    title={`Reservar ${minutesToTime(inicioMin)}`}
                  >
                    +
                  </button>
                ))}

                {items.map((item) => {
                  const esPartido = item.tipo === "PARTIDO";

                  return (
                    <button
                      key={`${item.tipo}-${item.id}`}
                      type="button"
                      disabled={esPartido}
                      className={`${styles.bloque} ${claseDeBloque(item)}`}
                      style={{
                        top: posicion(item.inicioMin),
                        height: `calc(var(--hora-alto) * ${(item.finMin - item.inicioMin) / 60} - 4px)`,
                      }}
                      onClick={() => {
                        if (!esPartido) onTurno(item);
                      }}
                      title={
                        esPartido
                          ? `${item.titulo}${item.detalle ? ` - ${item.detalle}` : ""}`
                          : undefined
                      }
                    >
                      <span className={styles.bloqueTitulo}>{item.titulo}</span>
                      <span className={styles.bloqueHora}>
                        {minutesToTime(item.inicioMin)} -{" "}
                        {minutesToTime(item.finMin)}
                      </span>
                      {esPartido && item.detalle ? (
                        <span className={styles.bloqueHora}>
                          {" "}
                          · {item.detalle}
                        </span>
                      ) : null}
                      {!esPartido && item.status !== "BLOQUEADO" ? (
                        <span className={styles.bloqueHora}>
                          {" "}
                          · {item.pagado ? "Pagado" : "Impago"}
                          {item.serieId ? " · fijo" : ""}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
