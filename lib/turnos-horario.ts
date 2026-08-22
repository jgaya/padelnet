/**
 * Horario de atencion de un complejo y la grilla de turnos que sale de el.
 *
 * Precedencia: excepcion de fecha > horario del dia de la semana > default.
 *
 * Modulo puro (sin prisma ni "use server"): lo importan la action de turnos, el
 * cron y los componentes client del calendario.
 */

import { MINUTOS_POR_DIA, minutesToTime } from "@/lib/horarios";

/** Rige mientras el complejo no configure nada: 9:00 a 23:00. */
export const HORARIO_DEFAULT = { aperturaMin: 9 * 60, cierreMin: 23 * 60 };

/** Duracion de un turno cuando el admin no la cambia. */
export const DURACION_TURNO_DEFAULT = 90;

export type HorarioSemanal = {
  /** 0 = domingo .. 6 = sabado, igual que Date.getDay(). */
  diaSemana: number;
  aperturaMin: number;
  cierreMin: number;
  cerrado: boolean;
};

export type HorarioExcepcion = {
  /** Fecha en formato "YYYY-MM-DD". */
  fecha: string;
  aperturaMin: number;
  cierreMin: number;
  cerrado: boolean;
  motivo?: string | null;
};

export type HorarioResuelto = {
  fecha: string;
  aperturaMin: number;
  cierreMin: number;
  cerrado: boolean;
  /** De donde salio el horario, para poder mostrarlo en la UI. */
  origen: "EXCEPCION" | "SEMANAL" | "DEFAULT";
  motivo: string | null;
};

export const DIAS_SEMANA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miercoles",
  "Jueves",
  "Viernes",
  "Sabado",
] as const;

/**
 * Clave de fecha en horario local, "YYYY-MM-DD".
 *
 * A proposito no se usa toISOString(): esa convierte a UTC y en Argentina
 * (UTC-3) devuelve el dia anterior para cualquier hora antes de las 3 AM.
 */
export function fechaKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Inversa de fechaKey: "2026-08-20" -> Date local a medianoche. */
export function fechaDesdeKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Las columnas `@db.Date` (TurnoSerie.desde/hasta, ComplejoHorarioExcepcion.fecha)
 * viajan como medianoche UTC. Leerlas como fecha local corre el dia hacia atras
 * en cualquier offset negativo: en Argentina (UTC-3) el 19/09 vuelve como el
 * 18/09 a las 21:00. Estos dos helpers son el unico punto donde se cruza esa
 * frontera; el resto del codigo trabaja con fechas locales.
 */
export function fechaKeyDB(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** "2026-08-20" -> Date para escribir en una columna `@db.Date`. */
export function fechaParaDB(key: string) {
  return new Date(`${key}T00:00:00.000Z`);
}

/** Valor de una columna `@db.Date` -> Date local a medianoche, para calcular. */
export function fechaLocalDesdeDB(date: Date) {
  return fechaDesdeKey(fechaKeyDB(date));
}

export function esMismaFecha(a: Date, b: Date) {
  return fechaKey(a) === fechaKey(b);
}

/** Suma dias sin romperse en los cambios de mes, anio ni horario de verano. */
export function sumarDias(date: Date, dias: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + dias);
  return next;
}

export function resolverHorario(
  fecha: Date,
  horarios: HorarioSemanal[],
  excepciones: HorarioExcepcion[],
): HorarioResuelto {
  const key = fechaKey(fecha);

  const excepcion = excepciones.find((item) => item.fecha === key);
  if (excepcion) {
    return {
      fecha: key,
      aperturaMin: excepcion.aperturaMin,
      cierreMin: excepcion.cierreMin,
      cerrado: excepcion.cerrado,
      origen: "EXCEPCION",
      motivo: excepcion.motivo ?? null,
    };
  }

  const semanal = horarios.find((item) => item.diaSemana === fecha.getDay());
  if (semanal) {
    return {
      fecha: key,
      aperturaMin: semanal.aperturaMin,
      cierreMin: semanal.cierreMin,
      cerrado: semanal.cerrado,
      origen: "SEMANAL",
      motivo: null,
    };
  }

  return {
    fecha: key,
    aperturaMin: HORARIO_DEFAULT.aperturaMin,
    cierreMin: HORARIO_DEFAULT.cierreMin,
    cerrado: false,
    origen: "DEFAULT",
    motivo: null,
  };
}

export type FranjaHoraria = {
  inicioMin: number;
  finMin: number;
  inicio: string;
  fin: string;
};

/**
 * Franjas de `duracionMin` que entran enteras en el horario de atencion. Si la
 * duracion no divide la ventana el resto queda afuera: no se ofrece un turno
 * que termine despues del cierre.
 */
export function generarFranjas(
  horario: HorarioResuelto,
  duracionMin: number,
): FranjaHoraria[] {
  if (horario.cerrado) return [];
  if (!Number.isInteger(duracionMin) || duracionMin <= 0) return [];

  const franjas: FranjaHoraria[] = [];

  for (
    let inicioMin = horario.aperturaMin;
    inicioMin + duracionMin <= horario.cierreMin;
    inicioMin += duracionMin
  ) {
    franjas.push({
      inicioMin,
      finMin: inicioMin + duracionMin,
      inicio: minutesToTime(inicioMin),
      fin: minutesToTime(inicioMin + duracionMin),
    });
  }

  return franjas;
}

/** true si [inicioMin, inicioMin + duracionMin) entra en el horario del dia. */
export function entraEnHorario(
  horario: HorarioResuelto,
  inicioMin: number,
  duracionMin: number,
) {
  if (horario.cerrado) return false;
  return (
    inicioMin >= horario.aperturaMin &&
    inicioMin + duracionMin <= horario.cierreMin
  );
}

/** Date local a partir de una fecha y un minuto del dia. */
export function fechaConMinutos(fecha: Date, minutos: number) {
  const result = new Date(fecha);
  result.setHours(0, 0, 0, 0);
  // setMinutes maneja solo el desborde si alguna vez llega 1440.
  result.setMinutes(Math.min(minutos, MINUTOS_POR_DIA));
  return result;
}
