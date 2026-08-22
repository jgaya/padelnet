import "server-only";

import { getComplejoAccess, requireComplejoRole } from "@/lib/authz";

export type ComplejoManagerAccess = {
  userId: number;
  complejoId: number;
  isSuperadmin: boolean;
  esPropietario: boolean;
};

/**
 * Guard de las actions que gestionan un complejo. Es una fachada delgada sobre
 * requireComplejoRole: se conserva el nombre porque lo usan una decena de
 * actions, pero la logica de permisos vive en lib/authz.ts.
 */
export async function ensureComplejoManagerAccess(
  complejoId: number,
): Promise<ComplejoManagerAccess> {
  const acceso = await requireComplejoRole(complejoId, ["ADMIN"]);

  return {
    userId: acceso.userId,
    complejoId: acceso.complejoId,
    isSuperadmin: acceso.esSuperadmin,
    esPropietario: acceso.esPropietario,
  };
}

export async function canManageComplejo(complejoId: number): Promise<boolean> {
  const acceso = await getComplejoAccess(complejoId);
  return acceso?.rol === "ADMIN";
}
