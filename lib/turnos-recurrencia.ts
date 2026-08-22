/**
 * Ocurrencias de un turno fijo.
 *
 * Las series no tienen fecha de fin: `hasta` queda en null y cron/turnos-cron.ts
 * las va materializando dentro de una ventana movil. `hasta` solo se completa
 * cuando el admin corta la serie con "este turno y los siguientes".
 *
 * Modulo puro: lo ejercita scripts/check-turnos.ts sin base de datos.
 */

import { fechaKey, sumarDias } from "@/lib/turnos-horario";

export type TurnoFrecuencia = "DIARIA" | "SEMANAL" | "MENSUAL";

export type SerieRecurrente = {
  frecuencia: TurnoFrecuencia;
  /** Primera fecha de la serie (local, a medianoche). */
  desde: Date;
  /** null mientras la serie este abierta. Inclusive. */
  hasta: Date | null;
};

/** Tope duro de ocurrencias por calculo, para que un rango absurdo no cuelgue. */
const MAX_OCURRENCIAS = 2000;

/**
 * Fechas de la serie dentro de [desde, hasta], ambas inclusive.
 *
 * La mensual repite el mismo dia del mes y **saltea los meses que no lo tienen**:
 * una serie del 31 no se juega en febrero ni en los meses de 30 dias, y no se
 * corre al 1 del mes siguiente. Correrla cambiaria el dia de la semana del turno
 * fijo, que es justo lo que el titular reservo.
 */
export function ocurrenciasEnVentana(
  serie: SerieRecurrente,
  ventanaDesde: Date,
  ventanaHasta: Date,
): Date[] {
  const inicio = new Date(serie.desde);
  inicio.setHours(0, 0, 0, 0);

  const finVentana = new Date(ventanaHasta);
  finVentana.setHours(0, 0, 0, 0);

  const desdeVentana = new Date(ventanaDesde);
  desdeVentana.setHours(0, 0, 0, 0);

  // El fin efectivo es el mas temprano entre el corte de la serie y la ventana.
  let fin = finVentana;
  if (serie.hasta) {
    const corte = new Date(serie.hasta);
    corte.setHours(0, 0, 0, 0);
    if (corte < fin) fin = corte;
  }

  if (fin < inicio || fin < desdeVentana) return [];

  const ocurrencias: Date[] = [];
  const agregar = (fecha: Date) => {
    if (fecha >= desdeVentana && fecha <= fin) {
      ocurrencias.push(fecha);
    }
  };

  if (serie.frecuencia === "DIARIA" || serie.frecuencia === "SEMANAL") {
    const paso = serie.frecuencia === "DIARIA" ? 1 : 7;

    for (
      let fecha = new Date(inicio);
      fecha <= fin && ocurrencias.length < MAX_OCURRENCIAS;
      fecha = sumarDias(fecha, paso)
    ) {
      agregar(new Date(fecha));
    }

    return ocurrencias;
  }

  const diaDelMes = inicio.getDate();

  for (
    let offset = 0;
    ocurrencias.length < MAX_OCURRENCIAS;
    offset += 1
  ) {
    const anio = inicio.getFullYear();
    const mes = inicio.getMonth() + offset;
    // Dia 0 del mes siguiente = ultimo dia de este mes.
    const diasDelMes = new Date(anio, mes + 1, 0).getDate();

    const primeroDelMes = new Date(anio, mes, 1);
    if (primeroDelMes > fin) break;

    if (diaDelMes <= diasDelMes) {
      agregar(new Date(anio, mes, diaDelMes));
    }
  }

  return ocurrencias;
}

/** Claves "YYYY-MM-DD" de las ocurrencias, para deduplicar contra lo ya creado. */
export function clavesDeOcurrencias(fechas: Date[]) {
  return new Set(fechas.map((fecha) => fechaKey(fecha)));
}

export const FRECUENCIA_LABEL: Record<TurnoFrecuencia, string> = {
  DIARIA: "Todos los dias",
  SEMANAL: "Cada semana",
  MENSUAL: "Cada mes",
};
