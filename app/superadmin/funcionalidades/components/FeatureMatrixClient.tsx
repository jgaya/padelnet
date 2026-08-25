"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import {
  setComplejoFeature,
  type ComplejoFeatureMatrixRow,
} from "@/actions/complejo-features";
import FeatureToggle from "@/app/superadmin/funcionalidades/components/FeatureToggle";
import TableWithPagination from "@/components/TableWithPagination";
import { useSnackbar } from "@/context/SnackbarContext";
import { COMPLEJO_FEATURES } from "@/lib/complejo-features";

const PAGE_SIZE = 10;

export default function FeatureMatrixClient({
  rows: initialRows,
}: {
  rows: ComplejoFeatureMatrixRow[];
}) {
  const showSnackbar = useSnackbar();
  const [rows, setRows] = useState(initialRows);
  const [page, setPage] = useState(1);
  const [pending, startTransition] = useTransition();
  const [busyCell, setBusyCell] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const applyLocal = (
    complejoId: number,
    featureKey: string,
    enabled: boolean,
    isOverride: boolean,
  ) => {
    setRows((prev) =>
      prev.map((row) =>
        row.complejoId === complejoId
          ? {
              ...row,
              features: row.features.map((feature) =>
                feature.key === featureKey
                  ? { ...feature, enabled, isOverride }
                  : feature,
              ),
            }
          : row,
      ),
    );
  };

  const handleToggle = (
    row: ComplejoFeatureMatrixRow,
    featureKey: string,
    current: { enabled: boolean; isOverride: boolean },
    next: boolean,
  ) => {
    const cellId = `${row.complejoId}:${featureKey}`;
    applyLocal(row.complejoId, featureKey, next, true);
    setBusyCell(cellId);

    startTransition(async () => {
      const res = await setComplejoFeature(row.complejoId, featureKey, next);
      setBusyCell(null);

      if (res.success) {
        showSnackbar(`${row.complejoNombre}: ${res.message}`, "success");
      } else {
        applyLocal(
          row.complejoId,
          featureKey,
          current.enabled,
          current.isOverride,
        );
        showSnackbar(res.error, "error");
      }
    });
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
      <div className="overflow-hidden rounded-3xl border border-content/10 bg-surface shadow-sm">
        <div className="border-b border-content/10 bg-gradient-to-r from-padel-green/15 via-surface to-energy-orange/15 px-5 py-6 sm:px-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-content/60">
            Superadmin
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-content sm:text-3xl">
            Funcionalidades por complejo
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-content/75">
            Habilita o quita funcionalidades a cada club. Sin excepcion
            definida, rige el valor por defecto de cada funcionalidad.
          </p>
        </div>

        <div className="px-5 py-5 sm:px-7">
          {rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-content/20 bg-surface-soft px-5 py-8 text-center text-sm text-content/70">
              No hay complejos cargados.
            </div>
          ) : (
            <TableWithPagination
              items={pageRows}
              page={safePage}
              total={rows.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              getRowKey={(row) => row.complejoId}
              renderHeader={() => (
                <tr>
                  <th>Complejo</th>
                  {COMPLEJO_FEATURES.map((feature) => (
                    <th key={feature.key}>{feature.label}</th>
                  ))}
                  <th>Detalle</th>
                </tr>
              )}
              renderRow={(row) => (
                <tr>
                  <td>
                    <span className="block font-semibold text-content">
                      {row.complejoNombre}
                    </span>
                    <span className="text-xs text-content/60">
                      {row.ciudad}, {row.provincia}
                    </span>
                  </td>
                  {COMPLEJO_FEATURES.map((definition) => {
                    const feature = row.features.find(
                      (item) => item.key === definition.key,
                    );
                    if (!feature) return <td key={definition.key}>-</td>;

                    const cellId = `${row.complejoId}:${definition.key}`;

                    return (
                      <td key={definition.key}>
                        <div className="flex items-center gap-2">
                          <FeatureToggle
                            checked={feature.enabled}
                            disabled={pending && busyCell === cellId}
                            label={`${feature.enabled ? "Deshabilitar" : "Habilitar"} ${definition.label} en ${row.complejoNombre}`}
                            onChange={(next) =>
                              handleToggle(
                                row,
                                definition.key,
                                {
                                  enabled: feature.enabled,
                                  isOverride: feature.isOverride,
                                },
                                next,
                              )
                            }
                          />
                          {feature.isOverride ? (
                            <span className="text-[10px] font-semibold uppercase text-energy-orange">
                              Custom
                            </span>
                          ) : null}
                        </div>
                      </td>
                    );
                  })}
                  <td>
                    <Link
                      href={`/superadmin/complejos/${row.complejoId}/funcionalidades`}
                      className="inline-flex rounded-full border border-content/20 bg-surface px-3 py-1.5 text-xs font-semibold text-content transition hover:bg-surface-soft"
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              )}
            />
          )}
        </div>
      </div>
    </section>
  );
}
