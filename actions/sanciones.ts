"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ensureComplejoManagerAccess } from "@/lib/complejo-access";
import { prisma } from "@/lib/prisma";
import { fechaKey, fechaParaDB } from "@/lib/turnos-horario";
import type { SancionEstado } from "@/lib/generated/prisma/client";

/**
 * Sanciones disciplinarias: el CRUD del admin.
 *
 * El bloqueo efectivo no vive aca sino en lib/sanciones.ts, que es lo que
 * consulta actions/torneos-inscripcion.ts. Aca solo se cargan y se anulan.
 */

const JUGADORES_LIMIT = 20;
/** Es lo que se publica: pedir un minimo evita que quede "molesto" y nada mas. */
const MOTIVO_MINIMO = 20;

export type SancionJugadorOption = {
  id: number;
  nombre: string;
  dni: string | null;
};

export type SancionItem = {
  id: number;
  jugadorId: number;
  jugadorNombre: string;
  desde: string;
  hasta: string;
  motivo: string;
  estado: SancionEstado;
  /** Si cubre hoy y no esta anulada: es la que efectivamente bloquea. */
  vigenteHoy: boolean;
  creadaPor: string | null;
  anuladaPor: string | null;
  anuladaAt: string | null;
  motivoAnulacion: string | null;
};

const CrearSancionSchema = z
  .object({
    jugadorId: z.number().int().positive("Elegi un jugador"),
    desde: z.string().min(1, "Falta la fecha de inicio"),
    hasta: z.string().min(1, "Falta la fecha de fin"),
    motivo: z
      .string()
      .trim()
      .min(
        MOTIVO_MINIMO,
        `Escribi los considerandos: al menos ${MOTIVO_MINIMO} caracteres. Este texto se publica.`,
      )
      .max(5000),
  })
  .refine((valor) => valor.hasta >= valor.desde, {
    message: "La fecha de fin no puede ser anterior a la de inicio",
    path: ["hasta"],
  });

export type CrearSancionInput = z.input<typeof CrearSancionSchema>;

function nombreCompleto(user: { name: string; lastname: string }) {
  return `${user.name} ${user.lastname}`.trim();
}

/** Las fechas van a columnas `@db.Date`: medianoche UTC, no local. */
function aFechaDB(valor: string) {
  return fechaParaDB(valor);
}

export async function listarSanciones(
  complejoId: number,
): Promise<SancionItem[]> {
  await ensureComplejoManagerAccess(complejoId);

  const hoy = fechaParaDB(fechaKey(new Date()));

  const filas = await prisma.sancion.findMany({
    where: { complejoId },
    orderBy: [{ desde: "desc" }, { id: "desc" }],
    select: {
      id: true,
      jugadorId: true,
      desde: true,
      hasta: true,
      motivo: true,
      estado: true,
      anuladaAt: true,
      motivoAnulacion: true,
      jugador: { select: { name: true, lastname: true } },
      creadaPor: { select: { name: true, lastname: true } },
      anuladaPor: { select: { name: true, lastname: true } },
    },
  });

  return filas.map((fila) => ({
    id: fila.id,
    jugadorId: fila.jugadorId,
    jugadorNombre: nombreCompleto(fila.jugador),
    desde: fila.desde.toISOString(),
    hasta: fila.hasta.toISOString(),
    motivo: fila.motivo,
    estado: fila.estado,
    vigenteHoy:
      fila.estado === "VIGENTE" && fila.desde <= hoy && fila.hasta >= hoy,
    creadaPor: fila.creadaPor ? nombreCompleto(fila.creadaPor) : null,
    anuladaPor: fila.anuladaPor ? nombreCompleto(fila.anuladaPor) : null,
    anuladaAt: fila.anuladaAt ? fila.anuladaAt.toISOString() : null,
    motivoAnulacion: fila.motivoAnulacion,
  }));
}

export async function buscarJugadoresParaSancionar(
  complejoId: number,
  term: string,
): Promise<SancionJugadorOption[]> {
  await ensureComplejoManagerAccess(complejoId);

  const search = term.trim();
  if (search.length < 2) return [];

  const jugadores = await prisma.user.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      platformRole: "USER",
      OR: [
        { name: { contains: search } },
        { lastname: { contains: search } },
        { dni: { contains: search } },
        { email: { contains: search } },
      ],
    },
    orderBy: [{ lastname: "asc" }, { name: "asc" }],
    take: JUGADORES_LIMIT,
    select: { id: true, name: true, lastname: true, dni: true },
  });

  return jugadores.map((jugador) => ({
    id: jugador.id,
    nombre: nombreCompleto(jugador),
    dni: jugador.dni,
  }));
}

export type CrearSancionResult =
  | {
      success: true;
      /** Inscripciones vigentes que caen dentro del periodo, para avisar. */
      inscripcionesEnConflicto: { torneoId: number; torneoNombre: string }[];
      /** Si ya habia otra sancion solapada. Es aviso, no error. */
      yaHabiaSolapada: boolean;
    }
  | { success: false; error: string };

export async function crearSancion(
  complejoId: number,
  input: CrearSancionInput,
): Promise<CrearSancionResult> {
  const acceso = await ensureComplejoManagerAccess(complejoId);

  const parsed = CrearSancionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Revisa los datos",
    };
  }

  const { jugadorId, motivo } = parsed.data;
  const desde = aFechaDB(parsed.data.desde);
  const hasta = aFechaDB(parsed.data.hasta);

  if (Number.isNaN(desde.getTime()) || Number.isNaN(hasta.getTime())) {
    return { success: false, error: "Las fechas no son validas" };
  }

  const jugador = await prisma.user.findFirst({
    where: {
      id: jugadorId,
      deletedAt: null,
      isActive: true,
      platformRole: "USER",
    },
    select: { id: true },
  });

  if (!jugador) {
    return { success: false, error: "El jugador no existe o no esta activo" };
  }

  // Solapada: se avisa pero no se bloquea. Un club puede querer extender una
  // sancion cargando otra; lo que no queremos es que se duplique sin que nadie
  // se entere.
  const solapada = await prisma.sancion.findFirst({
    where: {
      complejoId,
      jugadorId,
      estado: "VIGENTE",
      desde: { lte: hasta },
      hasta: { gte: desde },
    },
    select: { id: true },
  });

  await prisma.sancion.create({
    data: {
      complejoId,
      jugadorId,
      desde,
      hasta,
      motivo,
      creadaPorId: acceso.userId,
    },
  });

  // Las inscripciones vigentes NO se tocan: una pareja se da de baja de a dos y
  // arrastraria a un compañero que no fue sancionado. Se listan para que la
  // decision la tome el admin.
  const parejas = await prisma.pareja.findMany({
    where: {
      deletedAt: null,
      OR: [{ player1Id: jugadorId }, { player2Id: jugadorId }],
      torneo: {
        deletedAt: null,
        evento: { complejoId },
        OR: [
          { inicio: null },
          { inicio: { lte: hasta } },
        ],
      },
    },
    select: { torneo: { select: { id: true, nombre: true } } },
    take: 20,
  });

  revalidatePath(`/admin/complejos/${complejoId}/sanciones`);

  return {
    success: true,
    yaHabiaSolapada: Boolean(solapada),
    inscripcionesEnConflicto: parejas.map((pareja) => ({
      torneoId: pareja.torneo.id,
      torneoNombre: pareja.torneo.nombre,
    })),
  };
}

export async function anularSancion(
  complejoId: number,
  sancionId: number,
  motivoAnulacion: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const acceso = await ensureComplejoManagerAccess(complejoId);

  const motivo = motivoAnulacion?.trim() ?? "";
  if (motivo.length < 5) {
    return {
      success: false,
      error: "Deci por que se anula: queda publicado junto a la sancion",
    };
  }

  const sancion = await prisma.sancion.findFirst({
    where: { id: sancionId, complejoId },
    select: { id: true, estado: true },
  });

  if (!sancion) {
    return { success: false, error: "La sancion no existe en este complejo" };
  }

  if (sancion.estado === "ANULADA") {
    return { success: false, error: "Ya estaba anulada" };
  }

  await prisma.sancion.update({
    where: { id: sancion.id },
    data: {
      estado: "ANULADA",
      anuladaPorId: acceso.userId,
      anuladaAt: new Date(),
      motivoAnulacion: motivo.slice(0, 300),
    },
  });

  revalidatePath(`/admin/complejos/${complejoId}/sanciones`);
  return { success: true };
}
