"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

/**
 * El admin tipea el id de la planilla de memoria: "zona a 3" tiene que
 * encontrar "Verano-C4-Zona_A-3". Se ignoran mayusculas y los separadores.
 */
function normalizeSearch(value: string) {
  return value.toLowerCase().replace(/[\s_-]+/g, "");
}

const SETS_POR_PARTIDO = 3;

/**
 * Resultados validos de un set, ordenados de mejor a peor para la pareja 1.
 * Al elegirlos de una lista cerrada no se pueden cargar sets imposibles
 * (por ejemplo 4-3 o 6-6).
 */
const SET_SCORE_PAIRS: Array<[number, number]> = [
  [6, 0],
  [6, 1],
  [6, 2],
  [6, 3],
  [6, 4],
  [7, 5],
  [7, 6],
  [6, 7],
  [5, 7],
  [4, 6],
  [3, 6],
  [2, 6],
  [1, 6],
  [0, 6],
];

const SET_SCORE_OPTIONS = SET_SCORE_PAIRS.map(
  ([gamesPareja1, gamesPareja2]) => ({
    value: `${gamesPareja1}-${gamesPareja2}`,
    gamesPareja1,
    gamesPareja2,
  }),
);

const EMPTY_SET_SCORES: string[] = Array.from(
  { length: SETS_POR_PARTIDO },
  () => "",
);

function setsToScores(sets: TorneoPartidoSetItem[]): string[] {
  return EMPTY_SET_SCORES.map((_, index) => {
    const set = sets.find((item) => item.numero === index + 1);
    if (!set) return "";

    const value = `${set.gamesPareja1}-${set.gamesPareja2}`;
    return SET_SCORE_OPTIONS.some((option) => option.value === value)
      ? value
      : "";
  });
}

function scoresToSets(scores: string[]): TorneoPartidoSetItem[] {
  return scores.flatMap((score, index) => {
    const option = SET_SCORE_OPTIONS.find((item) => item.value === score);
    if (!option) return [];

    return [
      {
        numero: index + 1,
        gamesPareja1: option.gamesPareja1,
        gamesPareja2: option.gamesPareja2,
        tiebreakP1: null,
        tiebreakP2: null,
      },
    ];
  });
}

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
  const [setScores, setSetScores] = useState<string[]>(EMPTY_SET_SCORES);
  const [walkover, setWalkover] = useState(false);
  const [search, setSearch] = useState("");

  const filteredMatches = useMemo(() => {
    const term = normalizeSearch(search);
    if (!term) return matches;

    return matches.filter((match) =>
      normalizeSearch(match.idLegible ?? "").includes(term),
    );
  }, [matches, search]);

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
    setSetScores(setsToScores(match.sets));
    setWalkover(match.walkover);
    setShowResultModal(true);
  };

  const handleSetScoreChange = (index: number, value: string) => {
    setSetScores((prev) =>
      prev.map((score, i) => (i === index ? value : score)),
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

    // El walkover no se jugo: se guarda solo el ganador, sin sets.
    const sets = walkover ? [] : scoresToSets(setScores);
    if (!walkover && sets.length === 0) {
      showSnackbar("Debe cargar el resultado de al menos un set", "error");
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
        walkover,
      );
      showSnackbar(
        walkover
          ? "Walkover guardado correctamente"
          : "Resultado guardado correctamente",
        "success",
      );
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
            {search
              ? `${filteredMatches.length} de ${matches.length}`
              : matches.length}{" "}
            partidos
          </span>
        </div>
        <div className="p-4">
          <div className="mb-4 max-w-md">
            <label
              className="mb-1.5 block text-sm font-semibold text-deep-black"
              htmlFor="buscador-id-partido"
            >
              Buscar por ID de partido
            </label>
            <div className="flex items-center gap-2">
              <input
                id="buscador-id-partido"
                type="search"
                className="w-full rounded-xl border border-deep-black/20 bg-white px-3 py-2.5 text-sm text-deep-black focus:border-padel-green focus:outline-none focus:ring-2 focus:ring-padel-green/20"
                placeholder="Ej: Zona A 3 u Octavos 2"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              {search ? (
                <button
                  type="button"
                  className="whitespace-nowrap rounded-full border border-deep-black/20 bg-white px-3 py-2 text-sm font-semibold text-deep-black transition hover:bg-surface-soft"
                  onClick={() => setSearch("")}
                >
                  Limpiar
                </button>
              ) : null}
            </div>
          </div>

          {loading ? (
            <p>Cargando partidos...</p>
          ) : matches.length === 0 ? (
            <p>No hay partidos disponibles para este torneo.</p>
          ) : filteredMatches.length === 0 ? (
            <p>Ningun partido coincide con &quot;{search}&quot;.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-slate-800">
                <thead className="bg-slate-900 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                  <tr>
                    <th className="px-4 py-3">ID</th>
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
                  {filteredMatches.map((match) => {
                    const status = statusBadge(match.status);
                    return (
                      <tr
                        key={match.id}
                        className="odd:bg-white even:bg-slate-50 hover:bg-emerald-50"
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-deep-black/80">
                          {match.idLegible ?? "-"}
                        </td>
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
            setSetScores(EMPTY_SET_SCORES);
            setWalkover(false);
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
                {saving
                  ? "Guardando..."
                  : walkover
                    ? "Guardar walkover"
                    : "Guardar resultado"}
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
              {selectedMatch.idLegible ? (
                <p className="mt-1 font-mono text-xs text-deep-black/70">
                  {selectedMatch.idLegible}
                </p>
              ) : null}
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
              {walkover
                ? "El partido no se jugo: elegi la pareja que gana por walkover. No se cargan sets."
                : "Selecciona el ganador y el resultado de cada set jugado. Los sets sin resultado no se guardan."}
            </p>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-energy-orange/30 bg-energy-orange/10 p-4">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-energy-orange"
                checked={walkover}
                onChange={(event) => setWalkover(event.target.checked)}
              />
              <span>
                <span className="block text-sm font-semibold text-deep-black">
                  Ganado por walkover (W.O.)
                </span>
                <span className="block text-xs text-deep-black/70">
                  La pareja rival no se presento. El partido cuenta como ganado
                  y perdido, pero sin sets ni games.
                </span>
              </span>
            </label>

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

            <div className={`space-y-3 ${walkover ? "hidden" : ""}`}>
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-deep-black/60">
                Sets
              </h3>
              {setScores.map((score, index) => (
                <div
                  key={index + 1}
                  className="rounded-2xl border border-deep-black/10 bg-surface-soft p-4"
                >
                  <label
                    className="mb-1.5 block text-sm font-semibold text-deep-black"
                    htmlFor={`set-${index + 1}-resultado`}
                  >
                    Set {index + 1}
                  </label>
                  <p className="mb-2 truncate text-xs font-semibold text-deep-black/60">
                    {selectedMatch.pareja1Nombre} -{" "}
                    {selectedMatch.pareja2Nombre}
                  </p>
                  <select
                    id={`set-${index + 1}-resultado`}
                    className="w-full rounded-xl border border-deep-black/20 bg-white px-3 py-2.5 text-sm text-deep-black focus:border-padel-green focus:outline-none focus:ring-2 focus:ring-padel-green/20"
                    value={score}
                    onChange={(event) =>
                      handleSetScoreChange(index, event.target.value)
                    }
                  >
                    <option value="">Sin jugar</option>
                    {SET_SCORE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.gamesPareja1} - {option.gamesPareja2}
                      </option>
                    ))}
                  </select>
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
