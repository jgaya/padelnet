import "server-only";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import type { SessionPayload } from "@/lib/session";
import type { ComplejoRole } from "@/lib/roles";

/**
 * Autorizacion. Es el unico lugar donde se decide que puede hacer alguien.
 *
 * La regla: la pregunta nunca es "que sos", es "que sos EN ESTE COMPLEJO". El
 * rol de complejo sale siempre de ComplejoMembership, no de la sesion, asi
 * revocar un permiso surte efecto al instante y un mismo usuario puede
 * administrar un complejo y ser jugador en otro.
 */

export type ComplejoAccess = {
  userId: number;
  complejoId: number;
  /** Rol efectivo. Para un superadmin siempre es ADMIN. */
  rol: ComplejoRole;
  esSuperadmin: boolean;
  esPropietario: boolean;
};

export async function esSuperadmin() {
  const session = await getSession();
  return session?.platformRole === "SUPERADMIN";
}

/**
 * Corta la ejecucion si quien llama no es superadmin, y devuelve la sesion para
 * poder registrar quien hizo el cambio.
 */
export async function assertSuperadmin(): Promise<SessionPayload> {
  const session = await getSession();

  if (!session || session.platformRole !== "SUPERADMIN") {
    throw new Error("No autorizado");
  }

  return session;
}

/**
 * Rol del usuario logueado dentro de un complejo, o null si no tiene ninguno.
 * El superadmin cuenta como ADMIN en todos.
 */
export async function getRolEnComplejo(
  complejoId: number,
): Promise<ComplejoRole | null> {
  const acceso = await getComplejoAccess(complejoId);
  return acceso?.rol ?? null;
}

/**
 * Version completa de getRolEnComplejo: ademas del rol devuelve quien es y si
 * es el titular. Devuelve null en vez de tirar, para los casos donde hay que
 * decidir que mostrar en lugar de cortar.
 */
export async function getComplejoAccess(
  complejoId: number,
): Promise<ComplejoAccess | null> {
  if (!Number.isInteger(complejoId) || complejoId <= 0) return null;

  const session = await getSession();
  if (!session) return null;

  const complejo = await prisma.complejo.findFirst({
    where: { id: complejoId, deletedAt: null, isActive: true },
    select: { id: true },
  });

  if (!complejo) return null;

  if (session.platformRole === "SUPERADMIN") {
    return {
      userId: session.userId,
      complejoId,
      rol: "ADMIN",
      esSuperadmin: true,
      esPropietario: false,
    };
  }

  const membership = await prisma.complejoMembership.findFirst({
    where: { userId: session.userId, complejoId, isActive: true },
    select: { role: true, esPropietario: true },
  });

  if (!membership) return null;

  return {
    userId: session.userId,
    complejoId,
    rol: membership.role,
    esSuperadmin: false,
    esPropietario: membership.esPropietario,
  };
}

/**
 * Exige que el usuario tenga alguno de esos roles en el complejo. Tira si no.
 * Es el guard que usan las actions de complejo.
 */
export async function requireComplejoRole(
  complejoId: number,
  roles: readonly ComplejoRole[],
): Promise<ComplejoAccess> {
  if (!Number.isInteger(complejoId) || complejoId <= 0) {
    throw new Error("Complejo invalido");
  }

  const session = await getSession();
  if (!session) {
    throw new Error("No autorizado");
  }

  const acceso = await getComplejoAccess(complejoId);

  // Se distingue "el complejo no existe" de "existe pero no tenes rol": el
  // primero es un 404 y el segundo un 403, y confundirlos complica el soporte.
  if (!acceso) {
    const existe = await prisma.complejo.findFirst({
      where: { id: complejoId, deletedAt: null, isActive: true },
      select: { id: true },
    });

    throw new Error(existe ? "No autorizado" : "Complejo no encontrado");
  }

  if (!roles.includes(acceso.rol)) {
    throw new Error("No autorizado");
  }

  return acceso;
}

/** Version que no tira, para decidir si mostrar algo. */
export async function puedeGestionarComplejo(complejoId: number) {
  const acceso = await getComplejoAccess(complejoId);
  return acceso?.rol === "ADMIN";
}

/**
 * Sobre que complejos puede mirar datos quien esta logueado.
 *
 * `todos` es el superadmin: no se enumeran los ids porque la consulta que lo
 * reciba simplemente no filtra. `algunos` lleva los complejos donde es ADMIN, y
 * puede venir vacio si no administra ninguno.
 *
 * Ojo: `lib/canchas-auth.ts` tiene esta misma logica con otro nombre y tirando
 * en vez de devolver vacio. Sobra una de las dos, pero unificarlas toca las
 * pantallas de canchas y no entra en este cambio.
 */
export type AlcanceComplejos =
  | { tipo: "todos"; userId: number }
  | { tipo: "algunos"; userId: number; complejoIds: number[] };

export async function getAlcanceComplejos(): Promise<AlcanceComplejos | null> {
  const session = await getSession();
  if (!session) return null;

  if (session.platformRole === "SUPERADMIN") {
    return { tipo: "todos", userId: session.userId };
  }

  const memberships = await prisma.complejoMembership.findMany({
    where: {
      userId: session.userId,
      isActive: true,
      role: "ADMIN",
      complejo: { deletedAt: null, isActive: true },
    },
    select: { complejoId: true },
  });

  return {
    tipo: "algunos",
    userId: session.userId,
    complejoIds: Array.from(new Set(memberships.map((m) => m.complejoId))),
  };
}

/**
 * Si el usuario administra al menos un complejo. Se usa para el menu de gestion
 * y para los listados multi-complejo.
 */
export async function administraAlgunComplejo() {
  const session = await getSession();
  if (!session) return false;
  if (session.platformRole === "SUPERADMIN") return true;

  const membership = await prisma.complejoMembership.findFirst({
    where: {
      userId: session.userId,
      isActive: true,
      role: "ADMIN",
      complejo: { deletedAt: null, isActive: true },
    },
    select: { id: true },
  });

  return Boolean(membership);
}
