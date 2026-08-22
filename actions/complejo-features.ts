"use server";

import { revalidatePath } from "next/cache";

import { assertSuperadmin } from "@/lib/authz";
import {
  COMPLEJO_FEATURES,
  getFeatureDefinition,
  isComplejoFeatureKey,
  resolveFeatureState,
  type ComplejoFeatureKey,
  type ComplejoFeatureOverride,
  type ComplejoFeatureState,
} from "@/lib/complejo-features";
import { prisma } from "@/lib/prisma";

export type ComplejoFeaturesResult = {
  complejo: {
    id: number;
    name: string;
    ciudad: string;
    provincia: string;
  };
  features: ComplejoFeatureState[];
};

export type ComplejoFeatureMatrixRow = {
  complejoId: number;
  complejoNombre: string;
  ciudad: string;
  provincia: string;
  features: ComplejoFeatureState[];
};

const OVERRIDE_SELECT = {
  feature: true,
  enabled: true,
  updatedAt: true,
  updatedBy: { select: { name: true, lastname: true } },
} as const;

type OverrideRow = {
  feature: ComplejoFeatureKey;
  enabled: boolean;
  updatedAt: Date;
  updatedBy: { name: string; lastname: string } | null;
};

function toOverride(row: OverrideRow): ComplejoFeatureOverride {
  return {
    feature: row.feature,
    enabled: row.enabled,
    updatedAt: row.updatedAt.toISOString(),
    updatedByNombre: row.updatedBy
      ? `${row.updatedBy.name} ${row.updatedBy.lastname}`
      : null,
  };
}

function revalidateFeaturePaths(complejoId: number) {
  revalidatePath("/superadmin/funcionalidades");
  revalidatePath(`/superadmin/complejos/${complejoId}/funcionalidades`);
}

export async function listComplejoFeatures(
  complejoId: number,
): Promise<ComplejoFeaturesResult | null> {
  await assertSuperadmin();

  if (!Number.isInteger(complejoId) || complejoId <= 0) {
    return null;
  }

  const complejo = await prisma.complejo.findFirst({
    where: { id: complejoId, deletedAt: null },
    select: {
      id: true,
      name: true,
      ciudad: true,
      provincia: true,
      features: { select: OVERRIDE_SELECT },
    },
  });

  if (!complejo) {
    return null;
  }

  return {
    complejo: {
      id: complejo.id,
      name: complejo.name,
      ciudad: complejo.ciudad,
      provincia: complejo.provincia,
    },
    features: resolveFeatureState(complejo.features.map(toOverride)),
  };
}

export async function listComplejosFeatureMatrix(): Promise<
  ComplejoFeatureMatrixRow[]
> {
  await assertSuperadmin();

  // Una sola query con los overlays incluidos: nada de una consulta por complejo.
  const complejos = await prisma.complejo.findMany({
    where: { deletedAt: null },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      ciudad: true,
      provincia: true,
      features: { select: OVERRIDE_SELECT },
    },
  });

  return complejos.map((complejo) => ({
    complejoId: complejo.id,
    complejoNombre: complejo.name,
    ciudad: complejo.ciudad,
    provincia: complejo.provincia,
    features: resolveFeatureState(complejo.features.map(toOverride)),
  }));
}

export async function setComplejoFeature(
  complejoId: number,
  feature: string,
  enabled: boolean,
) {
  const session = await assertSuperadmin();

  if (!isComplejoFeatureKey(feature)) {
    return { success: false as const, error: "Funcionalidad desconocida" };
  }

  if (!Number.isInteger(complejoId) || complejoId <= 0) {
    return { success: false as const, error: "Complejo invalido" };
  }

  const complejo = await prisma.complejo.findFirst({
    where: { id: complejoId, deletedAt: null },
    select: { id: true },
  });

  if (!complejo) {
    return { success: false as const, error: "Complejo no encontrado" };
  }

  await prisma.complejoFeature.upsert({
    where: { complejoId_feature: { complejoId, feature } },
    update: { enabled, updatedById: session.userId },
    create: { complejoId, feature, enabled, updatedById: session.userId },
  });

  revalidateFeaturePaths(complejoId);

  const definition = getFeatureDefinition(feature);

  return {
    success: true as const,
    message: `${definition?.label ?? feature} ${enabled ? "habilitada" : "deshabilitada"}`,
  };
}

/** Borra la excepcion: la funcionalidad vuelve al default del catalogo. */
export async function resetComplejoFeature(complejoId: number, feature: string) {
  await assertSuperadmin();

  if (!isComplejoFeatureKey(feature)) {
    return { success: false as const, error: "Funcionalidad desconocida" };
  }

  await prisma.complejoFeature.deleteMany({
    where: { complejoId, feature },
  });

  revalidateFeaturePaths(complejoId);

  const definition = getFeatureDefinition(feature);

  return {
    success: true as const,
    message: `${definition?.label ?? feature} volvio al valor por defecto`,
  };
}

/**
 * Gate que consultan las funcionalidades. No valida rol a proposito: la llaman
 * procesos internos (generacion de notificaciones, etc.), no el usuario.
 */
export async function isComplejoFeatureEnabled(
  complejoId: number,
  feature: ComplejoFeatureKey,
): Promise<boolean> {
  const definition = getFeatureDefinition(feature);
  if (!definition) return false;

  if (!Number.isInteger(complejoId) || complejoId <= 0) {
    return definition.defaultEnabled;
  }

  const override = await prisma.complejoFeature.findUnique({
    where: { complejoId_feature: { complejoId, feature } },
    select: { enabled: true },
  });

  return override ? override.enabled : definition.defaultEnabled;
}

/** Version en lote, para no hacer una query por complejo. */
export async function getEnabledComplejosForFeature(
  feature: ComplejoFeatureKey,
  complejoIds: number[],
): Promise<Set<number>> {
  const definition = getFeatureDefinition(feature);
  if (!definition || complejoIds.length === 0) return new Set();

  const overrides = await prisma.complejoFeature.findMany({
    where: { feature, complejoId: { in: complejoIds } },
    select: { complejoId: true, enabled: true },
  });

  const byComplejo = new Map(
    overrides.map((item) => [item.complejoId, item.enabled]),
  );

  return new Set(
    complejoIds.filter(
      (id) => byComplejo.get(id) ?? definition.defaultEnabled,
    ),
  );
}

export async function listFeatureCatalog() {
  return COMPLEJO_FEATURES;
}
