"use server";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { ensureComplejoManagerAccess } from "@/lib/complejo-access";
import { isComplejoFeatureEnabled } from "@/actions/complejo-features";
import { haySolapamiento } from "@/lib/horarios";
import {
  DURACION_TURNO_DEFAULT,
  entraEnHorario,
  fechaConMinutos,
  fechaKey,
  fechaKeyDB,
  fechaParaDB,
  resolverHorario,
  sumarDias,
  type HorarioExcepcion,
  type HorarioResuelto,
  type HorarioSemanal,
} from "@/lib/turnos-horario";
import {
  ocurrenciasEnVentana,
  type TurnoFrecuencia,
} from "@/lib/turnos-recurrencia";

/**
 * Cuantos dias hacia adelante se materializan las ocurrencias de una serie al
 * crearla. De ahi en mas las extiende cron/turnos-cron.ts.
 *
 * Sin exportar: un modulo "use server" solo puede exportar funciones async.
 */
const VENTANA_RECURRENCIA_DIAS = 90;

/** Duracion que se asume para los partidos viejos, que no la tienen guardada. */
const DURACION_PARTIDO_FALLBACK = 90;

export type TurnoCanchaOption = {
  id: number;
  numero: number;
  name: string | null;
  label: string;
};

export type TurnoOcupacion = {
  tipo: "TURNO" | "PARTIDO";
  id: number;
  canchaId: number;
  /** ISO del inicio. */
  startAt: string;
  endAt: string;
  dayKey: string;
  inicioMin: number;
  finMin: number;
  titulo: string;
  detalle: string | null;
  /** Solo en los turnos. */
  status: "LIBRE" | "RESERVADO" | "BLOQUEADO" | null;
  pagado: boolean | null;
  serieId: number | null;
  frecuencia: TurnoFrecuencia | null;
  jugadorId: number | null;
  notas: string | null;
};

export type TurnosCalendario = {
  canchas: TurnoCanchaOption[];
  /** Un horario resuelto por cada fecha del rango pedido. */
  horarios: HorarioResuelto[];
  ocupacion: TurnoOcupacion[];
  duracionDefault: number;
};

async function ensureTurnosHabilitados(complejoId: number) {
  const acceso = await ensureComplejoManagerAccess(complejoId);

  const habilitado = await isComplejoFeatureEnabled(complejoId, "TURNOS");
  if (!habilitado) {
    throw new Error("La seccion de turnos no esta habilitada para este complejo");
  }

  return acceso;
}

function canchaLabel(cancha: { numero: number; name: string | null }) {
  return `Cancha ${cancha.numero}${cancha.name ? ` - ${cancha.name}` : ""}`;
}

function minutosDelDia(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

function parseFechaKey(value: string, campo: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${campo} debe tener formato YYYY-MM-DD`);
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error(`${campo} no es una fecha valida`);
  }

  return date;
}

async function cargarHorarios(complejoId: number) {
  const [semanal, excepciones] = await Promise.all([
    prisma.complejoHorario.findMany({
      where: { complejoId },
      select: {
        diaSemana: true,
        aperturaMin: true,
        cierreMin: true,
        cerrado: true,
      },
    }),
    prisma.complejoHorarioExcepcion.findMany({
      where: { complejoId },
      select: {
        fecha: true,
        aperturaMin: true,
        cierreMin: true,
        cerrado: true,
        motivo: true,
      },
    }),
  ]);

  const horarios: HorarioSemanal[] = semanal;
  const excepcionesResueltas: HorarioExcepcion[] = excepciones.map((item) => ({
    fecha: fechaKeyDB(item.fecha),
    aperturaMin: item.aperturaMin,
    cierreMin: item.cierreMin,
    cerrado: item.cerrado,
    motivo: item.motivo,
  }));

  return { horarios, excepciones: excepcionesResueltas };
}

export async function getTurnosCalendario(
  complejoId: number,
  desdeKey: string,
  hastaKey: string,
): Promise<TurnosCalendario> {
  await ensureTurnosHabilitados(complejoId);

  const desde = parseFechaKey(desdeKey, "La fecha desde");
  const hasta = parseFechaKey(hastaKey, "La fecha hasta");

  if (hasta < desde) {
    throw new Error("El rango de fechas esta invertido");
  }

  const finExclusivo = sumarDias(hasta, 1);

  const [canchas, slots, partidos, config] = await Promise.all([
    prisma.cancha.findMany({
      where: { complejoId, deletedAt: null, isActive: true },
      orderBy: [{ numero: "asc" }, { id: "asc" }],
      select: { id: true, numero: true, name: true },
    }),
    prisma.turnoSlot.findMany({
      where: {
        deletedAt: null,
        cancha: { complejoId, deletedAt: null },
        startAt: { gte: desde, lt: finExclusivo },
      },
      orderBy: [{ startAt: "asc" }, { canchaId: "asc" }],
      select: {
        id: true,
        canchaId: true,
        startAt: true,
        endAt: true,
        status: true,
        serieId: true,
        serie: { select: { frecuencia: true } },
        reserva: {
          select: {
            jugadorId: true,
            nombreContacto: true,
            telefonoContacto: true,
            pagado: true,
            status: true,
            notas: true,
            jugador: { select: { name: true, lastname: true } },
          },
        },
      },
    }),
    prisma.partido.findMany({
      where: {
        deletedAt: null,
        canchaId: { not: null },
        scheduledAt: { gte: desde, lt: finExclusivo },
        status: { not: "CANCELLED" },
        torneo: { deletedAt: null, evento: { complejoId, deletedAt: null } },
      },
      orderBy: [{ scheduledAt: "asc" }],
      select: {
        id: true,
        canchaId: true,
        scheduledAt: true,
        duracionMin: true,
        llave: true,
        torneo: { select: { nombre: true } },
        grupo: { select: { nombre: true } },
      },
    }),
    cargarHorarios(complejoId),
  ]);

  const horarios: HorarioResuelto[] = [];
  for (
    let fecha = new Date(desde);
    fecha <= hasta;
    fecha = sumarDias(fecha, 1)
  ) {
    horarios.push(resolverHorario(fecha, config.horarios, config.excepciones));
  }

  const ocupacion: TurnoOcupacion[] = [];

  for (const slot of slots) {
    // Una reserva cancelada libera el turno: deja de ocupar la grilla.
    if (slot.reserva && slot.reserva.status === "CANCELADA") continue;

    const reserva = slot.reserva;
    const titular = reserva?.jugador
      ? `${reserva.jugador.name} ${reserva.jugador.lastname}`
      : (reserva?.nombreContacto ?? null);

    ocupacion.push({
      tipo: "TURNO",
      id: slot.id,
      canchaId: slot.canchaId,
      startAt: slot.startAt.toISOString(),
      endAt: slot.endAt.toISOString(),
      dayKey: fechaKey(slot.startAt),
      inicioMin: minutosDelDia(slot.startAt),
      finMin: minutosDelDia(slot.endAt),
      titulo:
        slot.status === "BLOQUEADO"
          ? "Bloqueado"
          : (titular ?? "Turno sin titular"),
      detalle: reserva?.telefonoContacto ?? null,
      status: slot.status,
      pagado: reserva ? reserva.pagado : null,
      serieId: slot.serieId,
      frecuencia: slot.serie?.frecuencia ?? null,
      jugadorId: reserva?.jugadorId ?? null,
      notas: reserva?.notas ?? null,
    });
  }

  for (const partido of partidos) {
    if (!partido.scheduledAt || partido.canchaId === null) continue;

    const duracion = partido.duracionMin ?? DURACION_PARTIDO_FALLBACK;
    const fin = new Date(partido.scheduledAt.getTime() + duracion * 60_000);

    ocupacion.push({
      tipo: "PARTIDO",
      id: partido.id,
      canchaId: partido.canchaId,
      startAt: partido.scheduledAt.toISOString(),
      endAt: fin.toISOString(),
      dayKey: fechaKey(partido.scheduledAt),
      inicioMin: minutosDelDia(partido.scheduledAt),
      finMin: minutosDelDia(partido.scheduledAt) + duracion,
      titulo: partido.torneo.nombre,
      detalle: partido.llave ?? partido.grupo?.nombre ?? null,
      status: null,
      pagado: null,
      serieId: null,
      frecuencia: null,
      jugadorId: null,
      notas: null,
    });
  }

  ocupacion.sort(
    (left, right) =>
      left.startAt.localeCompare(right.startAt) || left.canchaId - right.canchaId,
  );

  return {
    canchas: canchas.map((cancha) => ({
      id: cancha.id,
      numero: cancha.numero,
      name: cancha.name,
      label: canchaLabel(cancha),
    })),
    horarios,
    ocupacion,
    duracionDefault: DURACION_TURNO_DEFAULT,
  };
}

type ConflictoDetalle = { descripcion: string };

/**
 * Busca lo que ya ocupa la cancha en ese rango: otros turnos y partidos de
 * torneo. Se llama dentro de la transaccion que crea el turno, que es la unica
 * forma de cubrir el solapamiento en MySQL (no hay indice que lo exprese).
 */
async function buscarConflictos(
  tx: Prisma.TransactionClient,
  canchaId: number,
  inicio: Date,
  fin: Date,
  ignorarSlotIds: number[] = [],
): Promise<ConflictoDetalle[]> {
  const conflictos: ConflictoDetalle[] = [];

  // Se traen los del dia y se filtra por solapamiento real: el rango de la
  // consulta no puede expresar "se pisa con" sin conocer la duracion ajena.
  const desdeDia = new Date(inicio);
  desdeDia.setHours(0, 0, 0, 0);
  const hastaDia = sumarDias(desdeDia, 1);

  const slots = await tx.turnoSlot.findMany({
    where: {
      canchaId,
      deletedAt: null,
      startAt: { gte: desdeDia, lt: hastaDia },
      id: ignorarSlotIds.length > 0 ? { notIn: ignorarSlotIds } : undefined,
    },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      status: true,
      reserva: { select: { status: true, nombreContacto: true } },
    },
  });

  for (const slot of slots) {
    if (slot.reserva && slot.reserva.status === "CANCELADA") continue;
    if (
      !haySolapamiento(
        inicio.getTime(),
        fin.getTime(),
        slot.startAt.getTime(),
        slot.endAt.getTime(),
      )
    ) {
      continue;
    }

    conflictos.push({
      descripcion: `turno de ${horaCorta(slot.startAt)} a ${horaCorta(slot.endAt)}`,
    });
  }

  const partidos = await tx.partido.findMany({
    where: {
      canchaId,
      deletedAt: null,
      status: { not: "CANCELLED" },
      scheduledAt: { gte: desdeDia, lt: hastaDia },
    },
    select: {
      id: true,
      scheduledAt: true,
      duracionMin: true,
      torneo: { select: { nombre: true } },
    },
  });

  for (const partido of partidos) {
    if (!partido.scheduledAt) continue;
    const duracion = partido.duracionMin ?? DURACION_PARTIDO_FALLBACK;
    const partidoFin = new Date(partido.scheduledAt.getTime() + duracion * 60_000);

    if (
      !haySolapamiento(
        inicio.getTime(),
        fin.getTime(),
        partido.scheduledAt.getTime(),
        partidoFin.getTime(),
      )
    ) {
      continue;
    }

    conflictos.push({
      descripcion: `partido de ${partido.torneo.nombre} a las ${horaCorta(partido.scheduledAt)}`,
    });
  }

  return conflictos;
}

function horaCorta(date: Date) {
  return `${`${date.getHours()}`.padStart(2, "0")}:${`${date.getMinutes()}`.padStart(2, "0")}`;
}

export type CrearTurnoPayload = {
  canchaId: number;
  /** "YYYY-MM-DD". */
  fecha: string;
  inicioMin: number;
  duracionMin: number;
  /** BLOQUEADO crea una franja de mantenimiento, sin reserva. */
  bloqueo?: boolean;
  jugadorId?: number | null;
  nombreContacto?: string | null;
  telefonoContacto?: string | null;
  pagado?: boolean;
  notas?: string | null;
  frecuencia?: TurnoFrecuencia | null;
};

export type CrearTurnoResult =
  | { success: true; creados: number; salteados: string[] }
  | { success: false; error: string };

export async function crearTurno(
  complejoId: number,
  payload: CrearTurnoPayload,
): Promise<CrearTurnoResult> {
  const acceso = await ensureTurnosHabilitados(complejoId);

  const fecha = parseFechaKey(payload.fecha, "La fecha");
  const duracionMin = Number(payload.duracionMin);
  const inicioMin = Number(payload.inicioMin);

  if (!Number.isInteger(duracionMin) || duracionMin < 15 || duracionMin > 480) {
    return { success: false, error: "La duracion debe estar entre 15 y 480 minutos" };
  }

  if (!Number.isInteger(inicioMin) || inicioMin < 0 || inicioMin >= 1440) {
    return { success: false, error: "El horario de inicio es invalido" };
  }

  const cancha = await prisma.cancha.findFirst({
    where: { id: payload.canchaId, complejoId, deletedAt: null, isActive: true },
    select: { id: true },
  });

  if (!cancha) {
    return { success: false, error: "La cancha no pertenece al complejo" };
  }

  const bloqueo = payload.bloqueo === true;
  const nombreContacto = payload.nombreContacto?.trim() || null;
  const jugadorId = payload.jugadorId ?? null;

  if (!bloqueo && !jugadorId && !nombreContacto) {
    return {
      success: false,
      error: "Indica un jugador registrado o un nombre de contacto",
    };
  }

  if (jugadorId) {
    const jugador = await prisma.user.findFirst({
      where: { id: jugadorId, deletedAt: null },
      select: { id: true },
    });
    if (!jugador) {
      return { success: false, error: "El jugador no existe" };
    }
  }

  const config = await cargarHorarios(complejoId);
  const frecuencia = payload.frecuencia ?? null;

  // Fechas a ocupar: una sola, o la ventana inicial de la serie.
  const fechas = frecuencia
    ? ocurrenciasEnVentana(
        { frecuencia, desde: fecha, hasta: null },
        fecha,
        sumarDias(fecha, VENTANA_RECURRENCIA_DIAS),
      )
    : [fecha];

  if (fechas.length === 0) {
    return { success: false, error: "La recurrencia no genera ninguna fecha" };
  }

  // La primera ocurrencia es la que el admin eligio: si no entra, es un error y
  // no un salteo silencioso.
  const horarioPrimera = resolverHorario(
    fechas[0],
    config.horarios,
    config.excepciones,
  );
  if (!entraEnHorario(horarioPrimera, inicioMin, duracionMin)) {
    return {
      success: false,
      error: horarioPrimera.cerrado
        ? "El complejo esta cerrado ese dia"
        : "El turno queda fuera del horario de atencion",
    };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const conflictosPrimera = await buscarConflictos(
        tx,
        payload.canchaId,
        fechaConMinutos(fechas[0], inicioMin),
        fechaConMinutos(fechas[0], inicioMin + duracionMin),
      );

      if (conflictosPrimera.length > 0) {
        return {
          success: false as const,
          error: `El horario se pisa con: ${conflictosPrimera
            .map((item) => item.descripcion)
            .join(", ")}`,
        };
      }

      const serie = frecuencia
        ? await tx.turnoSerie.create({
            data: {
              complejoId,
              canchaId: payload.canchaId,
              frecuencia,
              // Columna @db.Date: se escribe en medianoche UTC para que no
              // se corra un dia al releerla.
              desde: fechaParaDB(fechaKey(fechas[0])),
              hasta: null,
              inicioMin,
              duracionMin,
              jugadorId,
              nombreContacto,
              telefonoContacto: payload.telefonoContacto?.trim() || null,
              notas: payload.notas?.trim() || null,
              createdById: acceso.userId,
            },
            select: { id: true },
          })
        : null;

      let creados = 0;
      const salteados: string[] = [];

      for (const ocurrencia of fechas) {
        const horario = resolverHorario(
          ocurrencia,
          config.horarios,
          config.excepciones,
        );

        if (!entraEnHorario(horario, inicioMin, duracionMin)) {
          salteados.push(`${fechaKey(ocurrencia)} (fuera del horario)`);
          continue;
        }

        const inicio = fechaConMinutos(ocurrencia, inicioMin);
        const fin = fechaConMinutos(ocurrencia, inicioMin + duracionMin);

        const conflictos = await buscarConflictos(
          tx,
          payload.canchaId,
          inicio,
          fin,
        );

        if (conflictos.length > 0) {
          salteados.push(
            `${fechaKey(ocurrencia)} (${conflictos.map((c) => c.descripcion).join(", ")})`,
          );
          continue;
        }

        await tx.turnoSlot.create({
          data: {
            canchaId: payload.canchaId,
            serieId: serie?.id ?? null,
            createdById: acceso.userId,
            startAt: inicio,
            endAt: fin,
            duracionMin,
            status: bloqueo ? "BLOQUEADO" : "RESERVADO",
            reserva: bloqueo
              ? undefined
              : {
                  create: {
                    jugadorId,
                    nombreContacto,
                    telefonoContacto: payload.telefonoContacto?.trim() || null,
                    pagado: payload.pagado === true,
                    pagadoAt: payload.pagado === true ? new Date() : null,
                    notas: payload.notas?.trim() || null,
                    createdById: acceso.userId,
                  },
                },
          },
        });

        creados += 1;
      }

      return { success: true as const, creados, salteados };
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "No se pudo crear el turno",
    };
  }
}

export type CancelarAlcance = "SOLO" | "SIGUIENTES";

export async function cancelarTurno(
  complejoId: number,
  turnoId: number,
  alcance: CancelarAlcance = "SOLO",
) {
  await ensureTurnosHabilitados(complejoId);

  const slot = await prisma.turnoSlot.findFirst({
    where: {
      id: turnoId,
      deletedAt: null,
      cancha: { complejoId, deletedAt: null },
    },
    select: { id: true, serieId: true, startAt: true },
  });

  if (!slot) {
    return { success: false as const, error: "Turno no encontrado" };
  }

  if (alcance === "SIGUIENTES" && !slot.serieId) {
    return {
      success: false as const,
      error: "El turno no pertenece a una serie",
    };
  }

  await prisma.$transaction(async (tx) => {
    if (alcance === "SIGUIENTES" && slot.serieId) {
      // Cortar la serie: se le pone fin el dia anterior a esta ocurrencia para
      // que el cron no la vuelva a extender, y se borran las futuras.
      const corte = sumarDias(slot.startAt, -1);

      await tx.turnoSerie.update({
        where: { id: slot.serieId },
        data: { hasta: fechaParaDB(fechaKey(corte)) },
      });

      await tx.turnoSlot.updateMany({
        where: {
          serieId: slot.serieId,
          startAt: { gte: slot.startAt },
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      });

      await tx.turnoReserva.updateMany({
        where: {
          slot: { serieId: slot.serieId, startAt: { gte: slot.startAt } },
          status: "CONFIRMADA",
        },
        data: { status: "CANCELADA", cancelledAt: new Date() },
      });

      return;
    }

    await tx.turnoSlot.update({
      where: { id: slot.id },
      data: { deletedAt: new Date() },
    });

    await tx.turnoReserva.updateMany({
      where: { turnoSlotId: slot.id, status: "CONFIRMADA" },
      data: { status: "CANCELADA", cancelledAt: new Date() },
    });
  });

  return { success: true as const };
}

export async function marcarPagoTurno(
  complejoId: number,
  turnoId: number,
  pagado: boolean,
) {
  await ensureTurnosHabilitados(complejoId);

  const slot = await prisma.turnoSlot.findFirst({
    where: {
      id: turnoId,
      deletedAt: null,
      cancha: { complejoId, deletedAt: null },
    },
    select: { id: true, reserva: { select: { id: true } } },
  });

  if (!slot?.reserva) {
    return {
      success: false as const,
      error: "El turno no tiene una reserva para cobrar",
    };
  }

  await prisma.turnoReserva.update({
    where: { id: slot.reserva.id },
    data: { pagado, pagadoAt: pagado ? new Date() : null },
  });

  return { success: true as const };
}

export type HorarioSemanalInput = {
  diaSemana: number;
  aperturaMin: number;
  cierreMin: number;
  cerrado: boolean;
};

export async function guardarHorarioSemanal(
  complejoId: number,
  dias: HorarioSemanalInput[],
) {
  await ensureTurnosHabilitados(complejoId);

  for (const dia of dias) {
    if (!Number.isInteger(dia.diaSemana) || dia.diaSemana < 0 || dia.diaSemana > 6) {
      return { success: false as const, error: "Dia de la semana invalido" };
    }
    if (!dia.cerrado && dia.aperturaMin >= dia.cierreMin) {
      return {
        success: false as const,
        error: "La apertura tiene que ser anterior al cierre",
      };
    }
  }

  await prisma.$transaction(
    dias.map((dia) =>
      prisma.complejoHorario.upsert({
        where: {
          complejoId_diaSemana: { complejoId, diaSemana: dia.diaSemana },
        },
        update: {
          aperturaMin: dia.aperturaMin,
          cierreMin: dia.cierreMin,
          cerrado: dia.cerrado,
        },
        create: {
          complejoId,
          diaSemana: dia.diaSemana,
          aperturaMin: dia.aperturaMin,
          cierreMin: dia.cierreMin,
          cerrado: dia.cerrado,
        },
      }),
    ),
  );

  return { success: true as const };
}

export async function guardarExcepcionHorario(
  complejoId: number,
  input: {
    fecha: string;
    aperturaMin: number;
    cierreMin: number;
    cerrado: boolean;
    motivo?: string | null;
  },
) {
  await ensureTurnosHabilitados(complejoId);

  parseFechaKey(input.fecha, "La fecha");

  if (!input.cerrado && input.aperturaMin >= input.cierreMin) {
    return {
      success: false as const,
      error: "La apertura tiene que ser anterior al cierre",
    };
  }

  const fecha = fechaParaDB(input.fecha);

  await prisma.complejoHorarioExcepcion.upsert({
    where: { complejoId_fecha: { complejoId, fecha } },
    update: {
      aperturaMin: input.aperturaMin,
      cierreMin: input.cierreMin,
      cerrado: input.cerrado,
      motivo: input.motivo?.trim() || null,
    },
    create: {
      complejoId,
      fecha,
      aperturaMin: input.aperturaMin,
      cierreMin: input.cierreMin,
      cerrado: input.cerrado,
      motivo: input.motivo?.trim() || null,
    },
  });

  return { success: true as const };
}

export async function borrarExcepcionHorario(complejoId: number, fecha: string) {
  await ensureTurnosHabilitados(complejoId);
  parseFechaKey(fecha, "La fecha");

  await prisma.complejoHorarioExcepcion.deleteMany({
    where: { complejoId, fecha: fechaParaDB(fecha) },
  });

  return { success: true as const };
}

export type ConfiguracionHorarios = {
  semanal: HorarioSemanalInput[];
  excepciones: Array<{
    fecha: string;
    aperturaMin: number;
    cierreMin: number;
    cerrado: boolean;
    motivo: string | null;
  }>;
};

export async function getConfiguracionHorarios(
  complejoId: number,
): Promise<ConfiguracionHorarios> {
  await ensureTurnosHabilitados(complejoId);

  const config = await cargarHorarios(complejoId);

  return {
    semanal: config.horarios,
    excepciones: config.excepciones.map((item) => ({
      fecha: item.fecha,
      aperturaMin: item.aperturaMin,
      cierreMin: item.cierreMin,
      cerrado: item.cerrado,
      motivo: item.motivo ?? null,
    })),
  };
}

/** Busca jugadores para el autocompletado del titular de la reserva. */
export async function buscarJugadoresParaTurno(
  complejoId: number,
  termino: string,
) {
  await ensureTurnosHabilitados(complejoId);

  const query = termino.trim();
  if (query.length < 2) return [];

  const jugadores = await prisma.user.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      OR: [
        { name: { contains: query } },
        { lastname: { contains: query } },
        { email: { contains: query } },
        { dni: { contains: query } },
      ],
    },
    orderBy: [{ lastname: "asc" }, { name: "asc" }],
    take: 10,
    select: { id: true, name: true, lastname: true, telefono: true },
  });

  return jugadores.map((jugador) => ({
    id: jugador.id,
    nombre: `${jugador.name} ${jugador.lastname}`,
    telefono: jugador.telefono,
  }));
}
