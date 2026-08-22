import "server-only";

import { prisma } from "@/lib/prisma";
import { haySolapamiento } from "@/lib/horarios";
import {
  entraEnHorario,
  fechaConMinutos,
  fechaKey,
  fechaKeyDB,
  fechaLocalDesdeDB,
  fechaParaDB,
  resolverHorario,
  sumarDias,
  type HorarioExcepcion,
  type HorarioSemanal,
} from "@/lib/turnos-horario";
import { ocurrenciasEnVentana } from "@/lib/turnos-recurrencia";

/** Hasta donde adelante se mantienen materializadas las series abiertas. */
const VENTANA_DIAS = 90;

/** Duracion que se asume para los partidos viejos, que no la tienen guardada. */
const DURACION_PARTIDO_FALLBACK = 90;

export type ExtenderSeriesResult = {
  series: number;
  creados: number;
  salteados: number;
};

/**
 * Extiende las series de turnos abiertas hasta la ventana movil.
 *
 * Se dispara desde /api/cron/turnos, igual que las notificaciones: las series
 * no tienen fecha de fin, asi que alguien tiene que ir creando las ocurrencias.
 *
 * Es idempotente: si la ocurrencia ya existe no la duplica. Y saltea las que
 * chocarian con un partido de torneo o con otro turno, en vez de pisarlas.
 */
export async function extenderSeriesDeTurnos(): Promise<ExtenderSeriesResult> {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const limite = sumarDias(hoy, VENTANA_DIAS);

  const series = await prisma.turnoSerie.findMany({
    where: {
      deletedAt: null,
      // Abiertas, o cortadas en una fecha que todavia no llego. La comparacion
      // va contra medianoche UTC porque `hasta` es una columna @db.Date.
      OR: [{ hasta: null }, { hasta: { gte: fechaParaDB(fechaKey(hoy)) } }],
      cancha: { deletedAt: null, isActive: true },
    },
    select: {
      id: true,
      complejoId: true,
      canchaId: true,
      frecuencia: true,
      desde: true,
      hasta: true,
      inicioMin: true,
      duracionMin: true,
      jugadorId: true,
      nombreContacto: true,
      telefonoContacto: true,
      notas: true,
      createdById: true,
    },
  });

  let creados = 0;
  let salteados = 0;

  // Los horarios se cachean por complejo: varias series comparten complejo.
  const horariosPorComplejo = new Map<
    number,
    { horarios: HorarioSemanal[]; excepciones: HorarioExcepcion[] }
  >();

  for (const serie of series) {
    let config = horariosPorComplejo.get(serie.complejoId);

    if (!config) {
      const [semanal, excepciones] = await Promise.all([
        prisma.complejoHorario.findMany({
          where: { complejoId: serie.complejoId },
          select: {
            diaSemana: true,
            aperturaMin: true,
            cierreMin: true,
            cerrado: true,
          },
        }),
        prisma.complejoHorarioExcepcion.findMany({
          where: { complejoId: serie.complejoId },
          select: {
            fecha: true,
            aperturaMin: true,
            cierreMin: true,
            cerrado: true,
            motivo: true,
          },
        }),
      ]);

      config = {
        horarios: semanal,
        excepciones: excepciones.map((item) => ({
          fecha: fechaKeyDB(item.fecha),
          aperturaMin: item.aperturaMin,
          cierreMin: item.cierreMin,
          cerrado: item.cerrado,
          motivo: item.motivo,
        })),
      };
      horariosPorComplejo.set(serie.complejoId, config);
    }

    const ocurrencias = ocurrenciasEnVentana(
      {
        frecuencia: serie.frecuencia,
        desde: fechaLocalDesdeDB(serie.desde),
        hasta: serie.hasta ? fechaLocalDesdeDB(serie.hasta) : null,
      },
      hoy,
      limite,
    );

    if (ocurrencias.length === 0) continue;

    // Lo que ya existe de esta serie en la ventana, para no duplicar.
    const existentes = await prisma.turnoSlot.findMany({
      where: {
        serieId: serie.id,
        startAt: { gte: hoy, lt: sumarDias(limite, 1) },
      },
      select: { startAt: true },
    });
    const yaCreadas = new Set(existentes.map((slot) => fechaKey(slot.startAt)));

    for (const ocurrencia of ocurrencias) {
      if (yaCreadas.has(fechaKey(ocurrencia))) continue;

      const horario = resolverHorario(
        ocurrencia,
        config.horarios,
        config.excepciones,
      );

      if (!entraEnHorario(horario, serie.inicioMin, serie.duracionMin)) {
        salteados += 1;
        continue;
      }

      const inicio = fechaConMinutos(ocurrencia, serie.inicioMin);
      const fin = fechaConMinutos(
        ocurrencia,
        serie.inicioMin + serie.duracionMin,
      );

      const libre = await estaLibre(serie.canchaId, inicio, fin);
      if (!libre) {
        salteados += 1;
        continue;
      }

      try {
        await prisma.turnoSlot.create({
          data: {
            canchaId: serie.canchaId,
            serieId: serie.id,
            createdById: serie.createdById,
            startAt: inicio,
            endAt: fin,
            duracionMin: serie.duracionMin,
            status: "RESERVADO",
            reserva: {
              create: {
                jugadorId: serie.jugadorId,
                nombreContacto: serie.nombreContacto,
                telefonoContacto: serie.telefonoContacto,
                notas: serie.notas,
                createdById: serie.createdById,
              },
            },
          },
        });
        creados += 1;
      } catch (error) {
        console.error(
          `No se pudo crear la ocurrencia ${fechaKey(ocurrencia)} de la serie ${serie.id}`,
          error,
        );
        salteados += 1;
      }
    }
  }

  return { series: series.length, creados, salteados };
}

async function estaLibre(canchaId: number, inicio: Date, fin: Date) {
  const desdeDia = new Date(inicio);
  desdeDia.setHours(0, 0, 0, 0);
  const hastaDia = sumarDias(desdeDia, 1);

  const slots = await prisma.turnoSlot.findMany({
    where: {
      canchaId,
      deletedAt: null,
      startAt: { gte: desdeDia, lt: hastaDia },
    },
    select: {
      startAt: true,
      endAt: true,
      reserva: { select: { status: true } },
    },
  });

  for (const slot of slots) {
    if (slot.reserva && slot.reserva.status === "CANCELADA") continue;
    if (
      haySolapamiento(
        inicio.getTime(),
        fin.getTime(),
        slot.startAt.getTime(),
        slot.endAt.getTime(),
      )
    ) {
      return false;
    }
  }

  const partidos = await prisma.partido.findMany({
    where: {
      canchaId,
      deletedAt: null,
      status: { not: "CANCELLED" },
      scheduledAt: { gte: desdeDia, lt: hastaDia },
    },
    select: { scheduledAt: true, duracionMin: true },
  });

  for (const partido of partidos) {
    if (!partido.scheduledAt) continue;
    const duracion = partido.duracionMin ?? DURACION_PARTIDO_FALLBACK;
    const partidoFin = new Date(partido.scheduledAt.getTime() + duracion * 60_000);

    if (
      haySolapamiento(
        inicio.getTime(),
        fin.getTime(),
        partido.scheduledAt.getTime(),
        partidoFin.getTime(),
      )
    ) {
      return false;
    }
  }

  return true;
}
