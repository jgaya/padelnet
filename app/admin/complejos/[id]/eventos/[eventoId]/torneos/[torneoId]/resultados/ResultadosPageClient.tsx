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
  {
    numero: 1,
    gamesPareja1: 0,
    gamesPareja2: 0,
    tiebreakP1: null,
    tiebreakP2: null,
  },
  {
    numero: 2,
    gamesPareja1: 0,
    gamesPareja2: 0,
    tiebreakP1: null,
    tiebreakP2: null,
  },
  {
    numero: 3,
    gamesPareja1: 0,
    gamesPareja2: 0,
    tiebreakP1: null,
    tiebreakP2: null,
  },
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
  const [selectedMatch, setSelectedMatch] =
    useState<TorneoPartidoListItem | null>(null);
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
      prev.map((set, i) => (i === index ? { ...set, [field]: value } : set)),
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

      <div className="rounded-2xl border border-deep-black/10 bg-white padel-data-card">
        <div className="flex flex-col items-start justify-between gap-2 border-b border-deep-black/10 px-4 py-3 md:flex-row md:items-center">
          <div>
            <h2 className="text-base font-semibold mb-1">Partidos</h2>
            <p className="text-deep-black/60 mb-0">
              Listado de partidos del torneo y estado de resultados.
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-deep-black/60 px-2.5 py-1 text-xs font-semibold text-white">
            {matches.length} partidos
          </span>
        </div>
        <div className="p-4">
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
                            className="btn btn-primary btn-sm"
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
        footer={
          selectedMatch ? (
            <>
              <button
                type="button"
                className="inline-flex items-center rounded-full border border-deep-black/20 bg-white px-4 py-2.5 text-sm font-semibold text-deep-black transition hover:bg-surface-soft"
                onClick={() => setShowResultModal(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="inline-flex items-center rounded-full bg-padel-green px-4 py-2.5 text-sm font-semibold text-deep-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => void handleSaveResult()}
                disabled={saving || winnerId === null}
              >
                {saving ? "Guardando..." : "Guardar resultado"}
              </button>
            </>
          ) : undefined
        }
      >
        {selectedMatch ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-deep-black/10 bg-gradient-to-r from-padel-green/15 via-white to-energy-orange/15 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-deep-black/60">
                Partido
              </p>
              <p className="mt-1 text-base font-semibold text-deep-black">
                {selectedMatch.pareja1Nombre} vs {selectedMatch.pareja2Nombre}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
                <Badge
                  text={statusBadge(selectedMatch.status).label}
                  variant={statusBadge(selectedMatch.status).variant}
                  className="uppercase"
                />
                <span className="rounded-full bg-surface-soft px-3 py-1 text-deep-black/80">
                  {formatDateTime(selectedMatch.scheduledAt)}
                </span>
                <span className="rounded-full bg-surface-soft px-3 py-1 text-deep-black/80">
                  {selectedMatch.canchaLabel}
                </span>
                {selectedMatch.llave ? (
                  <span className="rounded-full bg-surface-soft px-3 py-1 text-deep-black/80">
                    Llave: {selectedMatch.llave}
                  </span>
                ) : null}
              </div>
            </div>

            <p className="text-sm text-deep-black/70">
              Ingresa el ganador y los juegos por set para el partido.
            </p>

            <div className="rounded-2xl border border-deep-black/10 bg-surface-soft p-4">
              <label
                className="mb-2 block text-sm font-semibold text-deep-black"
                htmlFor="resultado-ganador"
              >
                Ganador
              </label>
              <select
                id="resultado-ganador"
                className="w-full rounded-xl border border-deep-black/20 bg-white px-3 py-2.5 text-sm text-deep-black focus:border-padel-green focus:outline-none focus:ring-2 focus:ring-padel-green/20"
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

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-deep-black/60">
                Sets
              </h3>
              {sets.map((set, index) => (
                <div
                  key={set.numero}
                  className="rounded-2xl border border-deep-black/10 bg-surface-soft p-4"
                >
                  <p className="mb-3 text-sm font-semibold text-deep-black">
                    Set {set.numero}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label
                        className="mb-1.5 block truncate text-xs font-semibold text-deep-black/70"
                        htmlFor={`set-${set.numero}-games-1`}
                      >
                        Games {selectedMatch.pareja1Nombre}
                      </label>
                      <input
                        id={`set-${set.numero}-games-1`}
                        type="number"
                        min={0}
                        className="w-full rounded-xl border border-deep-black/20 bg-white px-3 py-2.5 text-sm text-deep-black focus:border-padel-green focus:outline-none focus:ring-2 focus:ring-padel-green/20"
                        value={set.gamesPareja1}
                        onChange={(event) =>
                          handleSetChange(
                            index,
                            "gamesPareja1",
                            Number(event.target.value),
                          )
                        }
                      />
                    </div>
                    <div>
                      <label
                        className="mb-1.5 block truncate text-xs font-semibold text-deep-black/70"
                        htmlFor={`set-${set.numero}-games-2`}
                      >
                        Games {selectedMatch.pareja2Nombre}
                      </label>
                      <input
                        id={`set-${set.numero}-games-2`}
                        type="number"
                        min={0}
                        className="w-full rounded-xl border border-deep-black/20 bg-white px-3 py-2.5 text-sm text-deep-black focus:border-padel-green focus:outline-none focus:ring-2 focus:ring-padel-green/20"
                        value={set.gamesPareja2}
                        onChange={(event) =>
                          handleSetChange(
                            index,
                            "gamesPareja2",
                            Number(event.target.value),
                          )
                        }
                      />
                    </div>
                    <div>
                      <label
                        className="mb-1.5 block truncate text-xs font-semibold text-deep-black/70"
                        htmlFor={`set-${set.numero}-tiebreak-1`}
                      >
                        Tiebreak {selectedMatch.pareja1Nombre}
                      </label>
                      <input
                        id={`set-${set.numero}-tiebreak-1`}
                        type="number"
                        min={0}
                        placeholder="-"
                        className="w-full rounded-xl border border-deep-black/20 bg-white px-3 py-2.5 text-sm text-deep-black placeholder:text-deep-black/40 focus:border-padel-green focus:outline-none focus:ring-2 focus:ring-padel-green/20"
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
                    </div>
                    <div>
                      <label
                        className="mb-1.5 block truncate text-xs font-semibold text-deep-black/70"
                        htmlFor={`set-${set.numero}-tiebreak-2`}
                      >
                        Tiebreak {selectedMatch.pareja2Nombre}
                      </label>
                      <input
                        id={`set-${set.numero}-tiebreak-2`}
                        type="number"
                        min={0}
                        placeholder="-"
                        className="w-full rounded-xl border border-deep-black/20 bg-white px-3 py-2.5 text-sm text-deep-black placeholder:text-deep-black/40 focus:border-padel-green focus:outline-none focus:ring-2 focus:ring-padel-green/20"
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-deep-black/70">
            No hay partido seleccionado.
          </p>
        )}
      </Modal>
    </div>
  );
}
