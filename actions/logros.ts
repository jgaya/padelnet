"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertSuperadmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import type { LogroRareza } from "@/lib/logros-catalogo";

/**
 * Logros: catalogo (superadmin) y consulta (jugador).
 *
 * El otorgamiento no vive aca sino en lib/logros.ts, que es lo que llaman las
 * actions de resultados y ranking.
 */

const RAREZAS: LogroRareza[] = [
  "COMUN",
  "POCO_COMUN",
  "RARO",
  "EPICO",
  "LEGENDARIO",
];

export type LogroAdminItem = {
  id: number;
  codigo: string;
  titulo: string;
  descripcion: string;
  icono: string | null;
  rareza: LogroRareza;
  progresoObjetivo: number | null;
  activo: boolean;
  orden: number;
  /** Cuantos jugadores lo tienen. Si es > 0 no se puede borrar. */
  obtenidoPor: number;
};

/** Un logro tal como lo ve el jugador, con su progreso. */
export type LogroDelJugador = {
  id: number;
  codigo: string;
  titulo: string;
  descripcion: string;
  icono: string | null;
  rareza: LogroRareza;
  progreso: number;
  progresoObjetivo: number | null;
  obtenido: boolean;
  obtenidoAt: string | null;
};

const LogroSchema = z.object({
  codigo: z
    .string()
    .trim()
    .min(3, "El codigo es obligatorio")
    .max(48)
    .regex(
      /^[A-Z0-9_]+$/,
      "Solo mayusculas, numeros y guion bajo (ej: PRIMER_PARTIDO)",
    ),
  titulo: z.string().trim().min(3, "Falta el titulo").max(80),
  descripcion: z.string().trim().min(5, "Falta la descripcion").max(200),
  icono: z.string().trim().max(200).optional(),
  rareza: z.enum(["COMUN", "POCO_COMUN", "RARO", "EPICO", "LEGENDARIO"]),
  progresoObjetivo: z.number().int().positive().nullable(),
  activo: z.boolean(),
  orden: z.number().int().min(0).max(9999),
});

export type LogroInput = z.input<typeof LogroSchema>;

// ========================================
// Catalogo (superadmin)
// ========================================

export async function listarLogros(): Promise<LogroAdminItem[]> {
  await assertSuperadmin();

  const filas = await prisma.logro.findMany({
    orderBy: [{ orden: "asc" }, { id: "asc" }],
    select: {
      id: true,
      codigo: true,
      titulo: true,
      descripcion: true,
      icono: true,
      rareza: true,
      progresoObjetivo: true,
      activo: true,
      orden: true,
      _count: { select: { usuarios: { where: { obtenidoAt: { not: null } } } } },
    },
  });

  return filas.map((fila) => ({
    id: fila.id,
    codigo: fila.codigo,
    titulo: fila.titulo,
    descripcion: fila.descripcion,
    icono: fila.icono,
    rareza: fila.rareza,
    progresoObjetivo: fila.progresoObjetivo,
    activo: fila.activo,
    orden: fila.orden,
    obtenidoPor: fila._count.usuarios,
  }));
}

export async function obtenerLogro(id: number) {
  await assertSuperadmin();

  return prisma.logro.findUnique({
    where: { id },
    select: {
      id: true,
      codigo: true,
      titulo: true,
      descripcion: true,
      icono: true,
      rareza: true,
      progresoObjetivo: true,
      activo: true,
      orden: true,
    },
  });
}

type Resultado = { success: true } | { success: false; error: string };

export async function crearLogro(input: LogroInput): Promise<Resultado> {
  await assertSuperadmin();

  const parsed = LogroSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Revisa los datos",
    };
  }

  const datos = parsed.data;

  const existente = await prisma.logro.findUnique({
    where: { codigo: datos.codigo },
    select: { id: true },
  });

  if (existente) {
    return { success: false, error: "Ya hay un logro con ese codigo" };
  }

  await prisma.logro.create({
    data: { ...datos, icono: datos.icono?.trim() || null },
  });

  revalidatePath("/superadmin/logros");
  return { success: true };
}

/**
 * Edita un logro. **El codigo no se toca.**
 *
 * Es la clave con la que lo busca el motor: cambiarlo lo desengancharia en
 * silencio de los eventos que lo otorgan y el logro dejaria de darse sin que
 * nadie se entere. Si hace falta otro codigo, se crea un logro nuevo.
 */
export async function editarLogro(
  id: number,
  input: LogroInput,
): Promise<Resultado> {
  await assertSuperadmin();

  const parsed = LogroSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Revisa los datos",
    };
  }

  // El codigo se descarta a proposito: ver el comentario de arriba.
  const datos = {
    titulo: parsed.data.titulo,
    descripcion: parsed.data.descripcion,
    icono: parsed.data.icono,
    rareza: parsed.data.rareza,
    progresoObjetivo: parsed.data.progresoObjetivo,
    activo: parsed.data.activo,
    orden: parsed.data.orden,
  };

  const logro = await prisma.logro.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!logro) return { success: false, error: "El logro no existe" };

  await prisma.logro.update({
    where: { id },
    data: { ...datos, icono: datos.icono?.trim() || null },
  });

  revalidatePath("/superadmin/logros");
  return { success: true };
}

/**
 * Borra un logro, solo si nadie lo gano.
 *
 * Con jugadores que lo tienen, borrarlo les sacaria una medalla que ya se
 * ganaron; ahi lo que corresponde es desactivarlo.
 */
export async function borrarLogro(id: number): Promise<Resultado> {
  await assertSuperadmin();

  const obtenidos = await prisma.logroUsuario.count({
    where: { logroId: id, obtenidoAt: { not: null } },
  });

  if (obtenidos > 0) {
    return {
      success: false,
      error: `${obtenidos} jugador(es) ya lo ganaron. Desactivalo en vez de borrarlo.`,
    };
  }

  await prisma.logro.delete({ where: { id } });

  revalidatePath("/superadmin/logros");
  return { success: true };
}

export async function alternarActivoLogro(
  id: number,
  activo: boolean,
): Promise<Resultado> {
  await assertSuperadmin();

  await prisma.logro.update({ where: { id }, data: { activo } });

  revalidatePath("/superadmin/logros");
  return { success: true };
}

export async function rarezasDisponibles() {
  await assertSuperadmin();
  return RAREZAS;
}

// ========================================
// Consulta (jugador)
// ========================================

/**
 * Arma la lista de logros de un jugador.
 *
 * `soloObtenidos` es para la ficha publica, donde se lucen las medallas y no
 * tiene sentido mostrarle a un tercero lo que a alguien le falta.
 */
async function logrosDe(
  userId: number,
  soloObtenidos: boolean,
): Promise<LogroDelJugador[]> {
  const logros = await prisma.logro.findMany({
    where: { activo: true },
    orderBy: [{ orden: "asc" }, { id: "asc" }],
    select: {
      id: true,
      codigo: true,
      titulo: true,
      descripcion: true,
      icono: true,
      rareza: true,
      progresoObjetivo: true,
      usuarios: {
        where: { userId },
        select: { progreso: true, obtenidoAt: true },
        take: 1,
      },
    },
  });

  return logros
    .map((logro) => {
      const mio = logro.usuarios[0];

      return {
        id: logro.id,
        codigo: logro.codigo,
        titulo: logro.titulo,
        descripcion: logro.descripcion,
        icono: logro.icono,
        rareza: logro.rareza,
        progreso: mio?.progreso ?? 0,
        progresoObjetivo: logro.progresoObjetivo,
        obtenido: Boolean(mio?.obtenidoAt),
        obtenidoAt: mio?.obtenidoAt ? mio.obtenidoAt.toISOString() : null,
      };
    })
    .filter((logro) => !soloObtenidos || logro.obtenido);
}

/** Los logros del usuario logueado, obtenidos y pendientes. */
export async function misLogros(): Promise<LogroDelJugador[]> {
  const session = await getSession();
  if (!session) return [];

  return logrosDe(session.userId, false);
}

/** Solo las medallas obtenidas, para la ficha publica de un jugador. */
export async function logrosPublicos(
  userId: number,
): Promise<LogroDelJugador[]> {
  if (!Number.isInteger(userId) || userId <= 0) return [];
  return logrosDe(userId, true);
}
