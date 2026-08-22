/**
 * Helpers de hora del dia, compartidos por la generacion de la grilla de
 * torneos (lib/torneo-grilla.ts) y por los turnos de cancha
 * (lib/turnos-horario.ts).
 *
 * Convencion: una hora del dia se representa como minutos desde medianoche.
 * Guardar y operar con enteros evita que una hora suelta arrastre fecha y zona
 * horaria, que es de donde salen los corrimientos de una hora.
 *
 * Modulo puro, sin "use server": lo importan actions, libs y componentes client.
 */

/** Minutos en un dia. Tambien es el valor de "24:00" como fin de jornada. */
export const MINUTOS_POR_DIA = 1440;

export function parseTime(value: string) {
  const [hourRaw, minuteRaw] = value.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    throw new Error("El horario debe tener formato HH:mm");
  }

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error("El horario debe estar entre 00:00 y 23:59");
  }

  return { hour, minute };
}

/** "09:30" -> 570. "24:00" se acepta como cierre a medianoche. */
export function parseTimeToMinutes(value: string) {
  if (value === "24:00") {
    return MINUTOS_POR_DIA;
  }

  const { hour, minute } = parseTime(value);
  return hour * 60 + minute;
}

/** 570 -> "09:30". */
export function minutesToTime(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${`${hour}`.padStart(2, "0")}:${`${minute}`.padStart(2, "0")}`;
}

/**
 * Dos intervalos [inicio, fin) se solapan. Los bordes no cuentan: un turno que
 * termina 10:30 y otro que empieza 10:30 conviven.
 */
export function haySolapamiento(
  aInicio: number,
  aFin: number,
  bInicio: number,
  bFin: number,
) {
  return aInicio < bFin && bInicio < aFin;
}
