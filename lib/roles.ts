/**
 * Catalogo de roles.
 *
 * Hay dos niveles, y son independientes a proposito:
 *
 *   PlatformRole  - global. USER es el jugador; SUPERADMIN administra todo.
 *   ComplejoRole  - por complejo, en ComplejoMembership.
 *
 * Que alguien sea staff de un club NO se marca en PlatformRole: se marca con
 * una fila en ComplejoMembership. Por eso un mismo usuario puede ser ADMIN del
 * complejo 5 y simple jugador del 12.
 *
 * La autorizacion no vive aca: vive en lib/authz.ts, que consulta la DB.
 * Este modulo es solo el catalogo y sus etiquetas para la UI.
 */

export const PLATFORM_ROLES = ["USER", "SUPERADMIN"] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const COMPLEJO_ROLES = [
  "ADMIN",
  "DATAENTRY",
  "FISCAL",
  "STAFF",
] as const;
export type ComplejoRole = (typeof COMPLEJO_ROLES)[number];

export const PLATFORM_ROLE_LABELS: Record<PlatformRole, string> = {
  USER: "Jugador",
  SUPERADMIN: "Superadmin",
};

export const COMPLEJO_ROLE_LABELS: Record<ComplejoRole, string> = {
  ADMIN: "Administrador",
  DATAENTRY: "Data entry",
  FISCAL: "Fiscal",
  STAFF: "Staff",
};

/**
 * Roles de complejo que hoy habilitan pantallas. DATAENTRY, FISCAL y STAFF
 * estan declarados para el futuro pero todavia no dan acceso a nada: si se les
 * mostrara el menu de gestion, todas las pantallas les darian 404.
 */
export const COMPLEJO_ROLES_CON_GESTION: readonly ComplejoRole[] = ["ADMIN"];

export function esPlatformRole(value: unknown): value is PlatformRole {
  return (
    typeof value === "string" &&
    (PLATFORM_ROLES as readonly string[]).includes(value)
  );
}

export function esComplejoRole(value: unknown): value is ComplejoRole {
  return (
    typeof value === "string" &&
    (COMPLEJO_ROLES as readonly string[]).includes(value)
  );
}
