export const USER_ROLES = [
  "jugador",
  "admin",
  "superadmin",
  "dataentry",
  "fiscal",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  jugador: "Jugador",
  admin: "Administrador",
  superadmin: "Superadmin",
  dataentry: "Data entry",
  fiscal: "Fiscal",
};

export function isUserRole(value: unknown): value is UserRole {
  return (
    typeof value === "string" &&
    (USER_ROLES as readonly string[]).includes(value)
  );
}

export function hasRole(
  role: UserRole | null | undefined,
  allowed: readonly UserRole[],
) {
  if (!role) return false;
  return allowed.includes(role);
}

export function canManageEventos(role: UserRole | null | undefined) {
  return hasRole(role, ["admin", "superadmin", "dataentry"]);
}

export function canManageTorneos(role: UserRole | null | undefined) {
  return hasRole(role, ["admin", "superadmin", "dataentry"]);
}

export function canManageAdminResources(role: UserRole | null | undefined) {
  return hasRole(role, ["admin", "superadmin"]);
}

export function canManagePartidos(role: UserRole | null | undefined) {
  return hasRole(role, ["admin", "superadmin"]);
}

export function canReadRecategorizacion(role: UserRole | null | undefined) {
  return hasRole(role, ["admin", "superadmin", "fiscal"]);
}

export function canWriteRecategorizacion(role: UserRole | null | undefined) {
  return hasRole(role, ["fiscal"]);
}

export function canSetResultados(role: UserRole | null | undefined) {
  return hasRole(role, ["admin", "superadmin", "dataentry"]);
}

export function canManageUsers(role: UserRole | null | undefined) {
  return hasRole(role, ["admin", "superadmin"]);
}
