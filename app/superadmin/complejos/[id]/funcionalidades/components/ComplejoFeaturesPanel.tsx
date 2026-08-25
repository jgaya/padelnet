"use client";

import { useState, useTransition } from "react";

import {
  resetComplejoFeature,
  setComplejoFeature,
  type ComplejoFeaturesResult,
} from "@/actions/complejo-features";
import FeatureToggle from "@/app/superadmin/funcionalidades/components/FeatureToggle";
import { useSnackbar } from "@/context/SnackbarContext";
import type { ComplejoFeatureState } from "@/lib/complejo-features";

function formatDateTime(value: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function ComplejoFeaturesPanel({
  complejo,
  features: initialFeatures,
}: ComplejoFeaturesResult) {
  const showSnackbar = useSnackbar();
  const [features, setFeatures] =
    useState<ComplejoFeatureState[]>(initialFeatures);
  const [pending, startTransition] = useTransition();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const applyLocal = (key: string, patch: Partial<ComplejoFeatureState>) => {
    setFeatures((prev) =>
      prev.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  };

  const handleToggle = (feature: ComplejoFeatureState, next: boolean) => {
    const previous = {
      enabled: feature.enabled,
      isOverride: feature.isOverride,
    };
    // Optimista: si la action falla, se revierte abajo.
    applyLocal(feature.key, { enabled: next, isOverride: true });
    setBusyKey(feature.key);

    startTransition(async () => {
      const res = await setComplejoFeature(complejo.id, feature.key, next);
      setBusyKey(null);

      if (res.success) {
        showSnackbar(res.message, "success");
      } else {
        applyLocal(feature.key, previous);
        showSnackbar(res.error, "error");
      }
    });
  };

  const handleReset = (feature: ComplejoFeatureState) => {
    const previous = {
      enabled: feature.enabled,
      isOverride: feature.isOverride,
    };
    applyLocal(feature.key, {
      enabled: feature.defaultEnabled,
      isOverride: false,
      updatedAt: null,
      updatedByNombre: null,
    });
    setBusyKey(feature.key);

    startTransition(async () => {
      const res = await resetComplejoFeature(complejo.id, feature.key);
      setBusyKey(null);

      if (res.success) {
        showSnackbar(res.message, "success");
      } else {
        applyLocal(feature.key, previous);
        showSnackbar(res.error, "error");
      }
    });
  };

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 sm:py-8">
      <div className="overflow-hidden rounded-3xl border border-content/10 bg-surface shadow-sm">
        <div className="border-b border-content/10 bg-gradient-to-r from-padel-green/15 via-surface to-energy-orange/15 px-5 py-6 sm:px-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-content/60">
            Funcionalidades
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-content sm:text-3xl">
            {complejo.name}
          </h1>
          <p className="mt-1 text-sm text-content/70">
            {complejo.ciudad}, {complejo.provincia}
          </p>
        </div>

        <div className="space-y-3 px-5 py-5 sm:px-7">
          {features.map((feature) => {
            const updatedAt = formatDateTime(feature.updatedAt);
            const isBusy = pending && busyKey === feature.key;

            return (
              <article
                key={feature.key}
                className="flex flex-col gap-3 rounded-2xl border border-content/10 bg-surface px-4 py-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-content">
                      {feature.label}
                    </h2>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        feature.isOverride
                          ? "bg-energy-orange/15 text-energy-orange"
                          : "bg-surface-soft text-content/60"
                      }`}
                    >
                      {feature.isOverride ? "Personalizado" : "Por defecto"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-content/70">
                    {feature.description}
                  </p>
                  {feature.isOverride && updatedAt ? (
                    <p className="mt-1 text-xs text-content/50">
                      Ultimo cambio: {updatedAt}
                      {feature.updatedByNombre
                        ? ` por ${feature.updatedByNombre}`
                        : ""}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-content/50">
                      Valor por defecto:{" "}
                      {feature.defaultEnabled ? "habilitada" : "deshabilitada"}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  {feature.isOverride ? (
                    <button
                      type="button"
                      onClick={() => handleReset(feature)}
                      disabled={isBusy}
                      className="rounded-full border border-content/20 bg-surface px-3 py-1.5 text-xs font-semibold text-content transition hover:bg-surface-soft disabled:opacity-50"
                    >
                      Volver al default
                    </button>
                  ) : null}
                  <FeatureToggle
                    checked={feature.enabled}
                    disabled={isBusy}
                    label={`${feature.enabled ? "Deshabilitar" : "Habilitar"} ${feature.label}`}
                    onChange={(next) => handleToggle(feature, next)}
                  />
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
