"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import TitleBar from "@/components/TitleBar";
import { useSnackbar } from "@/context/SnackbarContext";
import {
  getTorneoPartidosSetupData,
  saveTorneoPartidosSetup,
  type TorneoPartidosSetupData,
  type SaveTorneoPartidosPayload,
} from "@/actions/torneos-partidos";

export default function PartidosPageClient() {
  const params = useParams<{
    id: string;
    eventoId: string;
    torneoId: string;
  }>();
  const showSnackbar = useSnackbar();

  const complejoId = Number(params.id);
  const eventoId = Number(params.eventoId);
  const torneoId = Number(params.torneoId);

  const [data, setData] = useState<TorneoPartidosSetupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (
      !Number.isInteger(complejoId) ||
      complejoId <= 0 ||
      !Number.isInteger(eventoId) ||
      eventoId <= 0 ||
      !Number.isInteger(torneoId) ||
      torneoId <= 0
    ) {
      setError("Parametros invalidos");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getTorneoPartidosSetupData(
        complejoId,
        eventoId,
        torneoId,
      );
      setData(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo cargar la informacion";
      setError(message);
      showSnackbar(message, "error");
    } finally {
      setLoading(false);
    }
  }, [complejoId, eventoId, torneoId, showSnackbar]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const days = useMemo(() => data?.torneo.days ?? [], [data]);

  const [selectedCanchaIds, setSelectedCanchaIds] = useState<number[]>([]);
  const [canchaWindows, setCanchaWindows] = useState<Record<number, Array<{ start: string; end: string }>>>({});

  useEffect(() => {
    if (!data) {
      return;
    }

    const nextSelected = data.canchas.slice(0, 1).map((item) => item.id);
    const initialWindows = Object.fromEntries(
      data.canchas.map((cancha) => [
        cancha.id,
        days.map(() => ({ start: "09:00", end: "18:00" })),
      ]),
    );

    setSelectedCanchaIds(nextSelected);
    setCanchaWindows(initialWindows);
  }, [data, days]);

  const toggleCancha = (canchaId: number) => {
    setSelectedCanchaIds((prev) => {
      if (prev.includes(canchaId)) {
        return prev.filter((id) => id !== canchaId);
      }
      return [...prev, canchaId];
    });
  };

  const updateWindow = (
    canchaId: number,
    dayIndex: number,
    field: "start" | "end",
    value: string,
  ) => {
    setCanchaWindows((prev) => {
      const current = prev[canchaId] ?? days.map(() => ({ start: "09:00", end: "18:00" }));
      const next = current.map((item, index) =>
        index === dayIndex ? { ...item, [field]: value } : item,
      );
      return { ...prev, [canchaId]: next };
    });
  };

  const handleSave = async () => {
    if (!data) {
      return;
    }

    const payload: SaveTorneoPartidosPayload = {
      canchas: data.canchas
        .filter((cancha) => selectedCanchaIds.includes(cancha.id))
        .map((cancha) => ({
          canchaId: cancha.id,
          selected: true,
          dayWindows: (canchaWindows[cancha.id] ?? days.map(() => ({ start: "09:00", end: "18:00" }))).map((window) => ({
            start: window.start,
            end: window.end,
          })),
        })),
    };

    setSaving(true);

    try {
      const result = await saveTorneoPartidosSetup(
        complejoId,
        eventoId,
        torneoId,
        payload,
      );
      showSnackbar(
        `Partidos generados correctamente (${result.partidosGenerados})`,
        "success",
      );
      await loadData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo generar los partidos";
      showSnackbar(message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (
    !Number.isInteger(complejoId) ||
    complejoId <= 0 ||
    !Number.isInteger(eventoId) ||
    eventoId <= 0 ||
    !Number.isInteger(torneoId) ||
    torneoId <= 0
  ) {
    return (
      <div className="container padel-complejos-list">
        <TitleBar title="Crear partidos" />
        <div className="card padel-data-card">
          <div className="card-body">Parametros invalidos.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container padel-complejos-list">
      <TitleBar title={`Crear partidos - ${data?.torneo.nombre ?? ""}`} />

      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <p className="mb-1">
            <strong>Evento:</strong> {data?.torneo.eventoNombre ?? "-"}
          </p>
          <p className="mb-0">
            <strong>Zonas:</strong> {data?.grupos.length ?? 0} • <strong>Partidos existentes:</strong> {data?.torneo.partidoCount ?? 0}
          </p>
        </div>
        <Link
          href={`/admin/complejos/${complejoId}/eventos/${eventoId}/torneos/${torneoId}/zonas`}
          className="btn btn-outline-secondary btn-sm"
        >
          Volver a zonas
        </Link>
      </div>

      {loading ? (
        <div className="card padel-data-card">
          <div className="card-body">Cargando configuracion...</div>
        </div>
      ) : null}

      {!loading && error ? (
        <div className="card padel-data-card">
          <div className="card-body">{error}</div>
        </div>
      ) : null}

      {!loading && data ? (
        <>
          <div className="card padel-data-card mb-3">
            <div className="card-body">
              <h5 className="mb-3">1. Selecciona las canchas</h5>
              <div className="d-flex flex-wrap gap-2">
                {data.canchas.map((cancha) => {
                  const selected = selectedCanchaIds.includes(cancha.id);
                  return (
                    <label key={cancha.id} className="btn btn-primary mx-2" style={{ cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        className="me-2"
                        checked={selected}
                        onChange={() => toggleCancha(cancha.id)}
                      />
                      {cancha.label}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {selectedCanchaIds.length > 0 ? (
            <div className="card padel-data-card mb-3">
              <div className="card-body">
                <h5 className="mb-3">2. Define los horarios por dia</h5>
                {selectedCanchaIds.map((canchaId) => {
                  const cancha = data.canchas.find((item) => item.id === canchaId);
                  if (!cancha) {
                    return null;
                  }

                  return (
                    <div key={cancha.id} className="border rounded p-3 mb-3">
                      <h6 className="mb-3">{cancha.label}</h6>
                      {days.map((day, index) => (
                        <div key={day.key} className="row g-2 align-items-end mb-2">
                          <div className="col-md-3">
                            <label className="form-label">{day.label}</label>
                          </div>
                          <div className="col-md-4">
                            <label className="form-label">Inicio</label>
                            <input
                              type="time"
                              className="form-control"
                              value={canchaWindows[cancha.id]?.[index]?.start ?? "09:00"}
                              onChange={(event) =>
                                updateWindow(cancha.id, index, "start", event.target.value)
                              }
                            />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label">Fin</label>
                            <input
                              type="time"
                              className="form-control"
                              value={canchaWindows[cancha.id]?.[index]?.end ?? "18:00"}
                              onChange={(event) =>
                                updateWindow(cancha.id, index, "end", event.target.value)
                              }
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="card padel-data-card">
            <div className="card-body">
              <h5 className="mb-3">3. Generar partidos</h5>
              <p className="mb-3">
                Se crearán partidos por zona usando los horarios seleccionados. Si ya existían partidos, serán reemplazados por esta configuración.
              </p>
              <button
                className="btn btn-primario"
                onClick={handleSave}
                disabled={saving || selectedCanchaIds.length === 0}
              >
                {saving ? "Generando..." : "Generar partidos"}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
