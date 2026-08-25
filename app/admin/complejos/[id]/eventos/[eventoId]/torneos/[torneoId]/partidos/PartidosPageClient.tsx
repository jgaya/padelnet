"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import TitleBar from "@/components/TitleBar";
import Tooltip from "@/components/Tooltip";
import { useSnackbar } from "@/context/SnackbarContext";
import {
  generateTorneoPartidosPreview,
  getTorneoPartidosSetupData,
  saveTorneoPartidosSetup,
  type SaveTorneoPartidosPayload,
  type TorneoPartidosPreview,
  type TorneoPartidosSetupData,
} from "@/actions/torneos-partidos";

type CourtWindows = Record<number, Array<{ start: string; end: string }>>;

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
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<TorneoPartidosPreview | null>(null);
  const [selectedCanchaIds, setSelectedCanchaIds] = useState<number[]>([]);
  const [canchaWindows, setCanchaWindows] = useState<CourtWindows>({});
  const [durationMin, setDurationMin] = useState(75);
  const [gapMultiplier, setGapMultiplier] = useState(1);
  const [allowExtraFirstDay, setAllowExtraFirstDay] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(1);

  const paramsAreValid =
    Number.isInteger(complejoId) &&
    complejoId > 0 &&
    Number.isInteger(eventoId) &&
    eventoId > 0 &&
    Number.isInteger(torneoId) &&
    torneoId > 0;

  const loadData = useCallback(async () => {
    if (!paramsAreValid) {
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
  }, [complejoId, eventoId, paramsAreValid, showSnackbar, torneoId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const days = useMemo(() => data?.torneo.days ?? [], [data]);

  useEffect(() => {
    if (!data) return;

    setSelectedCanchaIds(data.canchas.slice(0, 1).map((item) => item.id));
    setCanchaWindows(
      Object.fromEntries(
        data.canchas.map((cancha) => [
          cancha.id,
          days.map(() => ({ start: "09:00", end: "18:00" })),
        ]),
      ),
    );
    setPreview(null);
  }, [data, days]);

  const invalidatePreview = () => setPreview(null);

  const toggleCancha = (canchaId: number) => {
    setSelectedCanchaIds((prev) =>
      prev.includes(canchaId)
        ? prev.filter((id) => id !== canchaId)
        : [...prev, canchaId],
    );
    invalidatePreview();
  };

  const updateWindow = (
    canchaId: number,
    dayIndex: number,
    field: "start" | "end",
    value: string,
  ) => {
    setCanchaWindows((prev) => {
      const current =
        prev[canchaId] ?? days.map(() => ({ start: "09:00", end: "18:00" }));
      return {
        ...prev,
        [canchaId]: current.map((item, index) =>
          index === dayIndex ? { ...item, [field]: value } : item,
        ),
      };
    });
    invalidatePreview();
  };

  /**
   * Copia los horarios de la primera cancha seleccionada al resto. En la mayoria
   * de los torneos todas las canchas abren y cierran a la misma hora, y cargar
   * dia por dia en cada una es donde se cuelan los errores.
   */
  const copiarHorariosAlResto = () => {
    const [primeraId, ...resto] = selectedCanchaIds;
    if (primeraId === undefined || resto.length === 0) return;

    setCanchaWindows((prev) => {
      const origen =
        prev[primeraId] ?? days.map(() => ({ start: "09:00", end: "18:00" }));

      const next = { ...prev };
      for (const canchaId of resto) {
        // Se clona cada franja: si se comparte la referencia, editar una cancha
        // despues termina cambiando las otras.
        next[canchaId] = origen.map((window) => ({ ...window }));
      }

      return next;
    });

    invalidatePreview();
    showSnackbar(
      resto.length === 1
        ? "Horarios copiados a la otra cancha"
        : `Horarios copiados a las otras ${resto.length} canchas`,
      "success",
    );
  };

  const buildPayload = useCallback(
    (seed = shuffleSeed): SaveTorneoPartidosPayload | null => {
      if (!data) return null;

      return {
        durationMin,
        gapMultiplier,
        shuffleSeed: seed,
        allowExtraFirstDay,
        canchas: data.canchas
          .filter((cancha) => selectedCanchaIds.includes(cancha.id))
          .map((cancha) => ({
            canchaId: cancha.id,
            selected: true,
            dayWindows: (
              canchaWindows[cancha.id] ??
              days.map(() => ({ start: "09:00", end: "18:00" }))
            ).map((window) => ({
              start: window.start,
              end: window.end,
            })),
          })),
      };
    },
    [
      allowExtraFirstDay,
      canchaWindows,
      data,
      days,
      durationMin,
      gapMultiplier,
      selectedCanchaIds,
      shuffleSeed,
    ],
  );

  const handleGenerate = async (seed = shuffleSeed) => {
    const payload = buildPayload(seed);
    if (!payload) return;

    setGenerating(true);

    try {
      const result = await generateTorneoPartidosPreview(
        complejoId,
        eventoId,
        torneoId,
        payload,
      );
      setPreview(result);
      setShuffleSeed(seed);
      showSnackbar(
        `Vista previa generada (${result.matches.length} partidos)`,
        "success",
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo generar la vista previa";
      showSnackbar(message, "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    const payload = buildPayload();
    if (!payload || !preview) return;

    setSaving(true);

    try {
      const result = await saveTorneoPartidosSetup(
        complejoId,
        eventoId,
        torneoId,
        payload,
      );
      showSnackbar(
        result.partidosSinAgendar > 0
          ? `Partidos guardados: ${result.partidosGenerados} (${result.partidosSinAgendar} de llave sin horario)`
          : `Partidos guardados correctamente (${result.partidosGenerados})`,
        "success",
      );
      setPreview(null);
      await loadData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo guardar los partidos";
      showSnackbar(message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (!paramsAreValid) {
    return (
      <div className="container padel-complejos-list padel-partidos-page">
        <TitleBar title="Crear partidos" />
        <div className="rounded-2xl border border-content/10 bg-surface padel-data-card">
          <div className="p-4">Parametros invalidos.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container padel-complejos-list padel-partidos-page">
      <TitleBar title={`Crear partidos - ${data?.torneo.nombre ?? ""}`} />

      <div className="flex justify-between items-center mb-3">
        <div>
          <p className="mb-1">
            <strong>Evento:</strong> {data?.torneo.eventoNombre ?? "-"}
          </p>
          <p className="mb-0">
            <strong>Zonas:</strong> {data?.grupos.length ?? 0}{" "}
            <strong>Partidos existentes:</strong>{" "}
            {data?.torneo.partidoCount ?? 0}
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
        <div className="rounded-2xl border border-content/10 bg-surface padel-data-card">
          <div className="p-4">Cargando configuracion...</div>
        </div>
      ) : null}

      {!loading && error ? (
        <div className="rounded-2xl border border-content/10 bg-surface padel-data-card">
          <div className="p-4">{error}</div>
        </div>
      ) : null}

      {!loading && data ? (
        <>
          <div className="rounded-2xl border border-content/10 bg-surface padel-data-card mb-3">
            <div className="p-4">
              <h5 className="mb-3">1. Selecciona las canchas</h5>
              <div className="flex flex-wrap gap-2">
                {data.canchas.map((cancha) => (
                  <label
                    key={cancha.id}
                    className="btn btn-outline-secondary padel-court-option"
                    style={{ cursor: "pointer" }}
                  >
                    <input
                      type="checkbox"
                      className="me-2"
                      checked={selectedCanchaIds.includes(cancha.id)}
                      onChange={() => toggleCancha(cancha.id)}
                    />
                    {cancha.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {selectedCanchaIds.length > 0 ? (
            <div className="rounded-2xl border border-content/10 bg-surface padel-data-card mb-3">
              <div className="p-4">
                <h5 className="mb-3">2. Define los horarios por dia</h5>
                {selectedCanchaIds.map((canchaId, canchaIndex) => {
                  const cancha = data.canchas.find(
                    (item) => item.id === canchaId,
                  );
                  if (!cancha) return null;

                  const esPrimera = canchaIndex === 0;

                  return (
                    <div key={cancha.id} className="padel-schedule-court">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <h6 className="mb-0">{cancha.label}</h6>
                        {esPrimera && selectedCanchaIds.length > 1 ? (
                          <Tooltip label="Aplica estos horarios, dia por dia, a todas las demas canchas seleccionadas.">
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm"
                              onClick={copiarHorariosAlResto}
                            >
                              Copiar horarios al resto
                            </button>
                          </Tooltip>
                        ) : null}
                      </div>
                      {days.map((day, index) => (
                        <div
                          key={day.key}
                          className="grid items-end gap-3 padel-time-row md:grid-cols-12"
                        >
                          <div className="md:col-span-3">
                            <label className="padel-form-label">
                              {day.label}
                            </label>
                          </div>
                          <div className="md:col-span-4">
                            <label className="padel-form-label">Inicio</label>
                            <input
                              type="time"
                              className="padel-form-input"
                              value={
                                canchaWindows[cancha.id]?.[index]?.start ??
                                "09:00"
                              }
                              onChange={(event) =>
                                updateWindow(
                                  cancha.id,
                                  index,
                                  "start",
                                  event.target.value,
                                )
                              }
                            />
                          </div>
                          <div className="md:col-span-4">
                            <label className="padel-form-label">Fin</label>
                            <input
                              type="time"
                              className="padel-form-input"
                              value={
                                canchaWindows[cancha.id]?.[index]?.end ??
                                "18:00"
                              }
                              onChange={(event) =>
                                updateWindow(
                                  cancha.id,
                                  index,
                                  "end",
                                  event.target.value,
                                )
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

          <div className="rounded-2xl border border-content/10 bg-surface padel-data-card">
            <div className="p-4">
              <h5 className="mb-3">3. Configura la generacion</h5>
              <div className="mb-3 grid items-stretch gap-3 padel-config-grid md:grid-cols-12">
                <div className="md:col-span-3">
                  <div className="padel-config-field">
                    <label className="padel-form-label">
                      Duracion del partido
                    </label>
                    <select
                      className="padel-form-select"
                      value={durationMin}
                      onChange={(event) => {
                        setDurationMin(Number(event.target.value));
                        invalidatePreview();
                      }}
                    >
                      {[60, 75, 90, 105, 120].map((value) => (
                        <option key={value} value={value}>
                          {value} min
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="md:col-span-4">
                  <div className="padel-config-field">
                    <label className="padel-form-label">
                      Descanso misma pareja
                    </label>
                    <select
                      className="padel-form-select"
                      value={gapMultiplier}
                      onChange={(event) => {
                        setGapMultiplier(Number(event.target.value));
                        invalidatePreview();
                      }}
                    >
                      {[0, 0.5, 1, 1.5, 2, 2.5, 3].map((value) => (
                        <option key={value} value={value}>
                          {value}x duracion
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="md:col-span-5">
                  <div className="padel-form-check padel-config-check">
                    <input
                      id="extra-slot-dia1"
                      className="padel-form-check-input"
                      type="checkbox"
                      checked={allowExtraFirstDay}
                      onChange={(event) => {
                        setAllowExtraFirstDay(event.target.checked);
                        invalidatePreview();
                      }}
                    />
                    <label
                      className="padel-form-check-label"
                      htmlFor="extra-slot-dia1"
                    >
                      Permitir ultimo slot corto en el primer dia
                    </label>
                  </div>
                </div>
              </div>
              <Tooltip label="Arma una grilla tentativa con las canchas elegidas. No guarda nada todavia.">
                <button
                  className="btn btn-primary"
                  onClick={() => void handleGenerate()}
                  disabled={generating || selectedCanchaIds.length === 0}
                >
                  {generating ? "Generando..." : "Generar vista previa"}
                </button>
              </Tooltip>
            </div>
          </div>

          {preview ? (
            <div className="rounded-2xl border border-content/10 bg-surface padel-data-card mt-3">
              <div className="p-4">
                <div className="flex flex-wrap justify-between gap-2 mb-3">
                  <div>
                    <h5 className="mb-1">4. Revisar y guardar</h5>
                    <p className="mb-0">
                      Slots usados: {preview.slotsOcupados}/
                      {preview.slotsDisponibles} | Llave sin horario:{" "}
                      {preview.unassignedLlave.length}
                      {preview.unassignedZona.length > 0
                        ? ` | Zona sin horario: ${preview.unassignedZona.length}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-outline-secondary"
                      type="button"
                      onClick={() => void handleGenerate(shuffleSeed + 1)}
                      disabled={generating || saving}
                    >
                      Rehacer
                    </button>
                    <Tooltip label="Confirma esta grilla y crea los partidos. Reemplaza los que ya existan.">
                      <button
                        className="btn btn-primary"
                        type="button"
                        onClick={() => void handleSave()}
                        disabled={saving || preview.unassignedZona.length > 0}
                      >
                        {saving ? "Guardando..." : "Guardar en DB"}
                      </button>
                    </Tooltip>
                  </div>
                </div>

                {preview.unassignedZona.length > 0 ? (
                  <div className="rounded-xl border border-energy-orange/25 bg-energy-orange/10 px-4 py-3 text-sm text-energy-orange">
                    <strong>
                      Partidos de zona que no entran en la grilla:
                    </strong>
                    <p className="mb-0 mt-1">
                      Agrega canchas, dias u horarios para poder guardar.
                    </p>
                    <ul className="mb-0 mt-2">
                      {preview.unassignedZona.map((match) => (
                        <li key={match.key}>
                          {match.grupoNombre}: {match.pareja1Nombre} vs{" "}
                          {match.pareja2Nombre}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {preview.unassignedLlave.length > 0 ? (
                  <div className="rounded-xl border border-warning/35 bg-warning/12 px-4 py-3 text-sm text-warning">
                    <strong>Partidos de llave sin horario:</strong>
                    <p className="mb-0 mt-1">
                      Se guardan igual, sin horario ni cancha, para poder
                      agendarlos despues.
                    </p>
                    <ul className="mb-0 mt-2">
                      {preview.unassignedLlave.map((match) => (
                        <li key={match.key}>
                          {match.llave}: {match.pareja1Nombre} vs{" "}
                          {match.pareja2Nombre}
                          {match.conBye ? " (con Bye, no se juega)" : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="overflow-x-auto rounded-xl border border-content/10 bg-surface shadow-sm">
                  <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-content">
                    <thead className="bg-ink text-xs font-semibold uppercase tracking-wide text-on-ink">
                      <tr>
                        <th className="px-4 py-3">Dia</th>
                        <th className="px-4 py-3">Hora</th>
                        <th className="px-4 py-3">Cancha</th>
                        <th className="px-4 py-3">Instancia</th>
                        <th className="px-4 py-3">Partido</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-content/10">
                      {preview.matches.map((match) => (
                        <tr
                          key={match.key}
                          className="odd:bg-surface even:bg-surface-soft hover:bg-success/12"
                        >
                          <td className="whitespace-nowrap px-4 py-3 font-medium">
                            {match.dayLabel}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            {match.start} - {match.end}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            {match.canchaLabel}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            {match.llave ?? match.grupoNombre ?? "-"}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-content/55">{match.key}</span>{" "}
                            {match.pareja1Nombre} vs {match.pareja2Nombre}
                            {match.restricted ? (
                              <span className="ml-2 inline-flex rounded-full bg-warning/12 px-2 py-1 text-xs font-semibold text-warning">
                                Restriccion
                              </span>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
