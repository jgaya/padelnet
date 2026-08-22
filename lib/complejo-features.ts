/**
 * Catalogo de funcionalidades que el superadmin habilita o deshabilita por
 * complejo.
 *
 * Para sumar una funcionalidad nueva:
 *   1. agregar el valor al enum ComplejoFeatureKey en prisma/schema.prisma
 *      (y correr la migracion),
 *   2. agregar la entrada aca,
 *   3. consultar isComplejoFeatureEnabled() donde la funcionalidad actue.
 *
 * Este archivo no lleva "use server": lo importan tanto las actions como los
 * componentes client que dibujan los toggles.
 */

export type ComplejoFeatureKey = "NOTIFICACIONES" | "LOGROS" | "TURNOS";

export type ComplejoFeatureDefinition = {
  key: ComplejoFeatureKey;
  label: string;
  description: string;
  /** Valor que rige mientras el superadmin no fije una excepcion. */
  defaultEnabled: boolean;
};

export const COMPLEJO_FEATURES: readonly ComplejoFeatureDefinition[] = [
  {
    key: "NOTIFICACIONES",
    label: "Notificaciones",
    description:
      "Avisos push a los jugadores del club sobre sus partidos y los torneos nuevos.",
    defaultEnabled: false,
  },
  {
    key: "LOGROS",
    label: "Logros",
    description: "Logros y medallas para los jugadores del club.",
    defaultEnabled: false,
  },
  {
    key: "TURNOS",
    label: "Turnos de cancha",
    description:
      "Calendario de alquiler de canchas: reservas, cancelaciones, cobros y turnos fijos.",
    defaultEnabled: false,
  },
];

export const COMPLEJO_FEATURE_KEYS = COMPLEJO_FEATURES.map(
  (feature) => feature.key,
);

export function isComplejoFeatureKey(
  value: unknown,
): value is ComplejoFeatureKey {
  return (
    typeof value === "string" &&
    COMPLEJO_FEATURE_KEYS.includes(value as ComplejoFeatureKey)
  );
}

export function getFeatureDefinition(key: ComplejoFeatureKey) {
  return COMPLEJO_FEATURES.find((feature) => feature.key === key) ?? null;
}

export type ComplejoFeatureState = ComplejoFeatureDefinition & {
  enabled: boolean;
  /** true si el valor viene de una fila en ComplejoFeature y no del default. */
  isOverride: boolean;
  updatedAt: string | null;
  updatedByNombre: string | null;
};

export type ComplejoFeatureOverride = {
  feature: ComplejoFeatureKey;
  enabled: boolean;
  updatedAt: string | null;
  updatedByNombre: string | null;
};

/**
 * Cruza el catalogo con los overrides guardados. Devuelve siempre una entrada
 * por funcionalidad del catalogo, aunque el complejo no tenga ninguna fila.
 */
export function resolveFeatureState(
  overrides: ComplejoFeatureOverride[],
): ComplejoFeatureState[] {
  const byKey = new Map(overrides.map((item) => [item.feature, item]));

  return COMPLEJO_FEATURES.map((definition) => {
    const override = byKey.get(definition.key);

    return {
      ...definition,
      enabled: override ? override.enabled : definition.defaultEnabled,
      isOverride: Boolean(override),
      updatedAt: override?.updatedAt ?? null,
      updatedByNombre: override?.updatedByNombre ?? null,
    };
  });
}
