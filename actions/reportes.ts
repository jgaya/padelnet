"use server";

import { canManageComplejo } from "@/lib/complejo-access";
import { prisma } from "@/lib/prisma";
import { canchaLabel } from "@/lib/torneo-vista-publica";
import { listManagedTorneoInscripciones } from "@/actions/torneos-inscripcion";

/**
 * Datos de los reportes de gestion.
 *
 * Las consultas se reusan de las actions que ya existen; lo unico propio de
 * aca es el armado del encabezado y el recorte de filas que va al reporte.
 */

export type FilaInscripto = {
  jugador1: string;
  jugador2: string;
  restriccion: string | null;
  /** ISO. El formato lo decide quien lo muestra. */
  inscriptaEl: string;
};

export type ReporteInscriptos = {
  torneo: {
    id: number;
    nombre: string;
    categoriaCode: string;
    sexo: "MASCULINO" | "FEMENINO" | "MIXTO";
    capacidad: number;
    inicio: string | null;
    eventoNombre: string;
    complejoNombre: string;
  };
  titulares: FilaInscripto[];
  suplentes: FilaInscripto[];
};

/**
 * Listado de inscriptos de un torneo, para el reporte.
 *
 * Devuelve null si el torneo no existe o si quien pide no administra el
 * complejo. Los dos casos se responden igual a proposito: un "no tenes
 * permiso" distinguible de un "no existe" deja saber que ese id es de un
 * torneo real de otro club.
 *
 * Las parejas dadas de baja quedan afuera: esto es el listado de quienes
 * juegan, que es para lo que se imprime. La pantalla de inscripciones si las
 * muestra, porque ahi el caso de uso es otro.
 */
export async function datosReporteInscriptos(
  torneoId: number,
): Promise<ReporteInscriptos | null> {
  const id = Number(torneoId);
  if (!Number.isInteger(id) || id <= 0) return null;

  const torneo = await prisma.torneo.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      nombre: true,
      categoriaCode: true,
      sexo: true,
      capacidad: true,
      inicio: true,
      evento: {
        select: {
          nombre: true,
          complejoId: true,
          complejo: { select: { name: true } },
        },
      },
    },
  });

  if (!torneo) return null;

  // Se chequea antes de tocar nada mas: asi un torneo ajeno no filtra ni su
  // nombre. Se usa la version que devuelve boolean y no la que tira, para
  // poder mostrar el estado vacio en vez de una pantalla de error.
  if (!(await canManageComplejo(torneo.evento.complejoId))) return null;

  const filas = await listManagedTorneoInscripciones(id);
  const activas = filas.filter((fila) => !fila.dadaDeBaja);

  const aFila = (fila: (typeof activas)[number]): FilaInscripto => ({
    jugador1: fila.jugador1,
    jugador2: fila.jugador2,
    restriccion: fila.restriccion,
    inscriptaEl: fila.createdAt,
  });

  return {
    torneo: {
      id: torneo.id,
      nombre: torneo.nombre,
      categoriaCode: torneo.categoriaCode,
      sexo: torneo.sexo,
      capacidad: torneo.capacidad,
      inicio: torneo.inicio ? torneo.inicio.toISOString() : null,
      eventoNombre: torneo.evento.nombre,
      complejoNombre: torneo.evento.complejo.name,
    },
    titulares: activas.filter((fila) => !fila.suplente).map(aFila),
    suplentes: activas.filter((fila) => fila.suplente).map(aFila),
  };
}

// ========================================
// Horarios de partidos de un evento
// ========================================

export type FilaHorario = {
  partidoId: number;
  /** El id que el admin puede leer y buscar ("Verano-C4-Zona_A-1"). */
  idLegible: string | null;
  torneoNombre: string;
  cancha: string;
  /** "YYYY-MM-DD", o "" si el partido todavia no tiene fecha. */
  dia: string;
  /** "HH:mm", o "" si no tiene fecha. */
  hora: string;
  /** Las dos parejas, ya armadas para imprimir. Lleva saltos de linea. */
  enfrentamiento: string;
};

export type ReporteHorarios = {
  evento: {
    id: number;
    nombre: string;
    complejoNombre: string;
    inicio: string;
    fin: string;
  };
  filas: FilaHorario[];
};

const SIN_CANCHA = "Sin cancha";
const A_DEFINIR = "A definir";

function nombreJugadorCorto(
  user: { name: string; lastname: string } | null | undefined,
) {
  if (!user) return "";
  return `${user.name} ${user.lastname}`.trim();
}

type ParejaImprimible = {
  jugador1: { name: string; lastname: string } | null;
  jugador2: { name: string; lastname: string } | null;
} | null;

function ladoDelPartido(pareja: ParejaImprimible, letra: string | null) {
  if (!pareja) return letra ? `${letra} ${A_DEFINIR}` : A_DEFINIR;

  const nombres = [
    nombreJugadorCorto(pareja.jugador1),
    nombreJugadorCorto(pareja.jugador2),
  ]
    .filter(Boolean)
    .join(" / ");

  const texto = nombres || A_DEFINIR;
  return letra ? `${letra} ${texto}` : texto;
}

/**
 * El dia y la hora se calculan en el servidor, no en el navegador.
 *
 * El dia es la clave con la que se agrupa y por la que se filtra, asi que tiene
 * que ser una sola: si el cliente la derivara del ISO, el HTML del servidor y
 * el del cliente podrian discrepar y ademas dos usuarios en zonas distintas
 * verian el fixture partido distinto. Se usa la hora local del servidor, que es
 * la del club.
 */
function diaYHora(fecha: Date | null) {
  if (!fecha) return { dia: "", hora: "" };

  const pad = (n: number) => String(n).padStart(2, "0");

  return {
    dia: `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`,
    hora: `${pad(fecha.getHours())}:${pad(fecha.getMinutes())}`,
  };
}

/**
 * Horarios de todos los partidos de un evento, para la planilla de mesa de
 * control.
 *
 * Es por evento y no por torneo a proposito: lo que se imprime y se cuelga en
 * el club es la grilla de canchas de la fecha, que cruza todos los torneos que
 * juegan ese fin de semana.
 *
 * Devuelve null si el evento no existe o si quien pide no administra el
 * complejo, igual que `datosReporteInscriptos`.
 */
export async function datosReporteHorarios(
  eventoId: number,
): Promise<ReporteHorarios | null> {
  const id = Number(eventoId);
  if (!Number.isInteger(id) || id <= 0) return null;

  const evento = await prisma.evento.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      nombre: true,
      inicio: true,
      fin: true,
      complejoId: true,
      complejo: { select: { name: true } },
    },
  });

  if (!evento) return null;
  if (!(await canManageComplejo(evento.complejoId))) return null;

  const partidos = await prisma.partido.findMany({
    where: {
      deletedAt: null,
      torneo: { eventoId: id, deletedAt: null },
    },
    // Sin fecha al final: un partido todavia sin programar no puede quedar
    // primero en la grilla del dia.
    orderBy: [{ scheduledAt: "asc" }, { canchaId: "asc" }, { id: "asc" }],
    select: {
      id: true,
      idLegible: true,
      scheduledAt: true,
      pareja1Letra: true,
      pareja2Letra: true,
      torneo: { select: { nombre: true } },
      cancha: { select: { name: true, numero: true } },
      pareja1: {
        select: {
          jugador1: { select: { name: true, lastname: true } },
          jugador2: { select: { name: true, lastname: true } },
        },
      },
      pareja2: {
        select: {
          jugador1: { select: { name: true, lastname: true } },
          jugador2: { select: { name: true, lastname: true } },
        },
      },
    },
  });

  const filas: FilaHorario[] = partidos.map((partido) => {
    const { dia, hora } = diaYHora(partido.scheduledAt);

    return {
      partidoId: partido.id,
      idLegible: partido.idLegible,
      torneoNombre: partido.torneo.nombre,
      cancha: canchaLabel(partido.cancha) ?? SIN_CANCHA,
      dia,
      hora,
      enfrentamiento: [
        ladoDelPartido(partido.pareja1, partido.pareja1Letra),
        "vs",
        ladoDelPartido(partido.pareja2, partido.pareja2Letra),
      ].join("\n"),
    };
  });

  return {
    evento: {
      id: evento.id,
      nombre: evento.nombre,
      complejoNombre: evento.complejo.name,
      inicio: evento.inicio.toISOString(),
      fin: evento.fin.toISOString(),
    },
    filas,
  };
}

// ========================================
// Sanciones disciplinarias de un complejo
// ========================================

export type FilaSancion = {
  jugador: string;
  desde: string;
  hasta: string;
  estado: string;
  motivo: string;
};

export type ReporteSanciones = {
  complejo: { id: number; nombre: string; ciudad: string; provincia: string };
  vigentes: FilaSancion[];
  historicas: FilaSancion[];
};

/**
 * Sanciones de un complejo, partidas en vigentes e historicas.
 *
 * "Vigente" es la que bloquea hoy: sin anular y con hoy dentro del periodo. El
 * resto —cumplidas, programadas y anuladas— va al bloque historico con su
 * estado, que es lo que se archiva.
 */
export async function datosReporteSanciones(
  complejoId: number,
): Promise<ReporteSanciones | null> {
  const id = Number(complejoId);
  if (!Number.isInteger(id) || id <= 0) return null;

  const complejo = await prisma.complejo.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, name: true, ciudad: true, provincia: true },
  });

  if (!complejo) return null;
  if (!(await canManageComplejo(id))) return null;

  const hoy = new Date();
  hoy.setUTCHours(0, 0, 0, 0);

  const filas = await prisma.sancion.findMany({
    where: { complejoId: id },
    orderBy: [{ desde: "desc" }, { id: "desc" }],
    select: {
      desde: true,
      hasta: true,
      motivo: true,
      estado: true,
      jugador: { select: { name: true, lastname: true } },
    },
  });

  const vigentes: FilaSancion[] = [];
  const historicas: FilaSancion[] = [];

  for (const fila of filas) {
    const bloqueaHoy =
      fila.estado === "VIGENTE" && fila.desde <= hoy && fila.hasta >= hoy;

    const item: FilaSancion = {
      jugador: `${fila.jugador.name} ${fila.jugador.lastname}`.trim(),
      desde: fila.desde.toISOString(),
      hasta: fila.hasta.toISOString(),
      estado:
        fila.estado === "ANULADA"
          ? "Anulada"
          : bloqueaHoy
            ? "Vigente"
            : fila.desde > hoy
              ? "Programada"
              : "Cumplida",
      motivo: fila.motivo,
    };

    if (bloqueaHoy) vigentes.push(item);
    else historicas.push(item);
  }

  return {
    complejo: {
      id: complejo.id,
      nombre: complejo.name,
      ciudad: complejo.ciudad,
      provincia: complejo.provincia,
    },
    vigentes,
    historicas,
  };
}
