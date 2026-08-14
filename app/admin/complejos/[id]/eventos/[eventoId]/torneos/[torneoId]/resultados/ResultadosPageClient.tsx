"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import TitleBar from "@/components/TitleBar";
import Modal from "@/components/Modal";
import Badge from "@/app/components/UI/Badge";
import { useSnackbar } from "@/context/SnackbarContext";
import {
  listTorneoPartidosByTorneo,
  saveTorneoPartidoResultado,
  type TorneoPartidoListItem,
  type TorneoPartidoSetItem,
} from "@/actions/torneos-partidos";

function formatDateTime(value: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const DEFAULT_SETS = [
  { numero: 1, gamesPareja1: 0, gamesPareja2: 0, tiebreakP1: null, tiebreakP2: null },
  { numero: 2, gamesPareja1: 0, gamesPareja2: 0, tiebreakP1: null, tiebreakP2: null },
  { numero: 3, gamesPareja1: 0, gamesPareja2: 0, tiebreakP1: null, tiebreakP2: null },
];

export default function ResultadosPageClient() {
  const params = useParams<{
    id: string;
    eventoId: string;
    torneoId: string;
  }>();
  const showSnackbar = useSnackbar();

  const complejoId = Number(params.id);
  const eventoId = Number(params.eventoId);
  const torneoId = Number(params.torneoId);

  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<TorneoPartidoListItem[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<TorneoPartidoListItem | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [winnerId, setWinnerId] = useState<number | null>(null);
  const [sets, setSets] = useState<TorneoPartidoSetItem[]>(DEFAULT_SETS);

  const paramsAreValid =
    Number.isInteger(complejoId) &&
    complejoId > 0 &&
    Number.isInteger(eventoId) &&
    eventoId > 0 &&
    Number.isInteger(torneoId) &&
    torneoId > 0;

  const loadMatches = useCallback(async () => {
    if (!paramsAreValid) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const data = await listTorneoPartidosByTorneo(
        complejoId,
        eventoId,
        torneoId,
      );
      setMatches(data);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo cargar la lista de partidos";
      showSnackbar(message, "error");
    } finally {
      setLoading(false);
    }
  }, [complejoId, eventoId, paramsAreValid, showSnackbar, torneoId]);

  useEffect(() => {
    void loadMatches();
  }, [loadMatches]);

  const openResultModal = (match: TorneoPartidoListItem) => {
    setSelectedMatch(match);
    setWinnerId(match.ganadorId ?? match.pareja1Id ?? match.pareja2Id ?? null);
    setSets(match.sets.length > 0 ? match.sets : DEFAULT_SETS);
    setShowResultModal(true);
  };

  const handleSetChange = (
    index: number,
    field: keyof Omit<TorneoPartidoSetItem, "numero">,
    value: number | null,
  ) => {
    setSets((prev) =>
      prev.map((set, i) =>
        i === index ? { ...set, [field]: value } : set,
      ),
    );
  };

  const getLoserId = () => {
    if (!selectedMatch || winnerId === null) return null;
    return selectedMatch.pareja1Id === winnerId
      ? selectedMatch.pareja2Id
      : selectedMatch.pareja1Id;
  };

  const handleSaveResult = async () => {
    if (!selectedMatch || winnerId === null) return;

    const loserId = getLoserId();
    if (!loserId) {
      showSnackbar("Debe seleccionar un ganador valido", "error");
      return;
    }

    setSaving(true);

    try {
      await saveTorneoPartidoResultado(
        complejoId,
        eventoId,
        torneoId,
        selectedMatch.id,
        winnerId,
        loserId,
        sets,
        false,
      );
      showSnackbar("Resultado guardado correctamente", "success");
      setShowResultModal(false);
      void loadMatches();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo guardar el resultado";
      showSnackbar(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const matchWinnerLabel = (match: TorneoPartidoListItem): string => {
    if (!match.ganadorId) return "-";
    return match.ganadorId === match.pareja1Id
      ? match.pareja1Nombre
      : match.ganadorId === match.pareja2Id
      ? match.pareja2Nombre
      : "-";
  };

  const statusBadge = (status: TorneoPartidoListItem["status"]) => {
    switch (status) {
      case "FINISHED":
        return { label: "Finalizado", variant: "success" as const };
      case "IN_PROGRESS":
        return { label: "En juego", variant: "info" as const };
      case "WALKOVER":
        return { label: "Walkover", variant: "warning" as const };
      case "CANCELLED":
        return { label: "Cancelado", variant: "danger" as const };
      case "SCHEDULED":
        return { label: "Programado", variant: "default" as const };
      case "PENDING":
      default:
        return { label: "Pendiente", variant: "muted" as const };
    }
  };

  return (
    <div className="container padel-complejos-list">
      <TitleBar
        title="Resultados"
        backURL={`/admin/complejos/${complejoId}/eventos/${eventoId}/torneos`}
      />

      <div className="card padel-data-card">
        <div className="card-header d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-2">
          <div>
            <h2 className="h5 mb-1">Partidos</h2>
            <p className="text-muted mb-0">Listado de partidos del torneo y estado de resultados.</p>
          </div>
          <span className="badge bg-secondary">{matches.length} partidos</span>
        </div>
        <div className="card-body">
          {loading ? (
            <p>Cargando partidos...</p>
          ) : matches.length === 0 ? (
            <p>No hay partidos disponibles para este torneo.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-slate-800">
                <thead className="bg-slate-900 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Hora</th>
                    <th className="px-4 py-3">Cancha</th>
                    <th className="px-4 py-3">Llave</th>
                    <th className="px-4 py-3">Partido</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Ganador</th>
                    <th className="px-4 py-3">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {matches.map((match) => {
                    const status = statusBadge(match.status);
                    return (
                      <tr
                        key={match.id}
                        className="odd:bg-white even:bg-slate-50 hover:bg-emerald-50"
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-sm">
                          {formatDateTime(match.scheduledAt)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                          {match.scheduledAt
                            ? new Date(match.scheduledAt).toLocaleTimeString(
                                "es-AR",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )
                            : "Sin horario"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                          {match.canchaLabel}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                          {match.llave ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {match.pareja1Nombre} vs {match.pareja2Nombre}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                          <Badge
                            text={status.label}
                            variant={status.variant}
                            size="sm"
                            className="uppercase"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {matchWinnerLabel(match)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                          <button
                            type="button"
                            className="btn btn-primario btn-sm"
                            onClick={() => openResultModal(match)}
                          >
                            Cargar resultado
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal
        showModal={showResultModal}
        setShowModal={(open) => {
          if (!open) {
            setSelectedMatch(null);
            setWinnerId(null);
            setSets(DEFAULT_SETS);
          }
          setShowResultModal(open);
        }}
        title="Cargar resultado"
        size="lg"
      >
        {selectedMatch ? (
          <div>
            <div className="mb-4">
              <p className="mb-2 text-sm text-muted">
                Ingresa el ganador y los juegos por set para el partido.
              </p>
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label">Ganador</label>
                  <select
                    className="form-select"
                    value={winnerId ?? ""}
                    onChange={(event) => {
                      setWinnerId(Number(event.target.value) || null);
                    }}
                  >
                    <option value="">Seleccionar ganador</option>
                    {selectedMatch.pareja1Id ? (
                      <option value={selectedMatch.pareja1Id}>
                        {selectedMatch.pareja1Nombre}
                      </option>
                    ) : null}
                    {selectedMatch.pareja2Id ? (
                      <option value={selectedMatch.pareja2Id}>
                        {selectedMatch.pareja2Nombre}
                      </option>
                    ) : null}
                  </select>
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Estado del partido</label>
                  <input
                    readOnly
                    className="form-control bg-light"
                    value={selectedMatch.status}
                  />
                </div>
              </div>
            </div>

            <div className="card padel-data-card mb-3">
              <div className="card-header">
                <h3 className="h6 mb-0">Sets</h3>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-bordered mb-0">
                    <thead className="table-light">
                      <tr>
                        <th scope="col">Set</th>
                        <th scope="col">{selectedMatch.pareja1Nombre}</th>
                        <th scope="col">{selectedMatch.pareja2Nombre}</th>
                        <th scope="col">Tiebreak {selectedMatch.pareja1Nombre}</th>
                        <th scope="col">Tiebreak {selectedMatch.pareja2Nombre}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sets.map((set, index) => (
                        <tr key={set.numero}>
                          <th scope="row">{set.numero}</th>
                          <td>
                            <input
                              type="number"
                              min={0}
                              className="form-control"
                              value={set.gamesPareja1}
                              onChange={(event) =>
                                handleSetChange(
                                  index,
                                  "gamesPareja1",
                                  Number(event.target.value),
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min={0}
                              className="form-control"
                              value={set.gamesPareja2}
                              onChange={(event) =>
                                handleSetChange(
                                  index,
                                  "gamesPareja2",
                                  Number(event.target.value),
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min={0}
                              className="form-control"
                              value={set.tiebreakP1 ?? ""}
                              onChange={(event) =>
                                handleSetChange(
                                  index,
                                  "tiebreakP1",
                                  event.target.value === ""
                                    ? null
                                    : Number(event.target.value),
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min={0}
                              className="form-control"
                              value={set.tiebreakP2 ?? ""}
                              onChange={(event) =>
                                handleSetChange(
                                  index,
                                  "tiebreakP2",
                                  event.target.value === ""
                                    ? null
                                    : Number(event.target.value),
                                )
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowResultModal(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primario"
                onClick={() => void handleSaveResult()}
                disabled={saving || winnerId === null}
              >
                {saving ? "Guardando..." : "Guardar resultado"}
              </button>
            </div>
          </div>
        ) : (
          <p>No hay partido seleccionado.</p>
        )}
      </Modal>
    </div>
  );
}
