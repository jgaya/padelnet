"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PublicTorneoDetail } from "@/actions/torneos-public";
import TorneoMatchCard from "./TorneoMatchCard";
import Link from "next/link";

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

function torneoStatusLabel(status: PublicTorneoDetail["status"]) {
  switch (status) {
    case "PUBLISHED":
      return "Publicado";
    case "IN_PROGRESS":
      return "En progreso";
    case "FINISHED":
      return "Finalizado";
    case "ARCHIVED":
      return "Archivado";
    case "DRAFT":
    default:
      return "Borrador";
  }
}

type ActiveTab = "grupos" | "llave";
type PhaseRound = PublicTorneoDetail["llave"][number]["round"];
type PhaseTransitionDirection = "forward" | "backward";

type PhaseTransitionState = {
  id: number;
  from: PhaseRound;
  to: PhaseRound;
  direction: PhaseTransitionDirection;
};

type BracketLayout = {
  boardHeight: number;
  boardWidth: number;
  cardHeight: number;
  columnWidth: number;
  columnGap: number;
  outerPadding: number;
  connectorPaths: Array<{
    d: string;
    fromColumn: number;
  }>;
  getColumnLeft: (columnIndex: number) => number;
  getMatchCenterY: (columnMatches: number, matchIndex: number) => number;
};

function phaseShortLabel(round: PhaseRound) {
  switch (round) {
    case "DIECISEISAVOS":
      return "16F";
    case "OCTAVOS":
      return "8F";
    case "CUARTOS":
      return "4F";
    case "SEMIFINAL":
      return "SF";
    case "FINAL":
    default:
      return "F";
  }
}

function buildBracketLayout(
  columns: PublicTorneoDetail["llave"],
  options?: { minHeight?: number; alignTop?: boolean },
): BracketLayout {
  const columnWidth = 288;
  const columnGap = 56;
  const cardHeight = 136;
  const baseGap = 16;
  const outerPadding = 24;
  const minHeight = options?.minHeight ?? 560;
  const alignTop = options?.alignTop ?? true;

  const normalizedColumns = columns.length > 0 ? columns : [{ round: "FINAL", label: "Final", matches: [] }];
  const firstRoundMatches = Math.max(
    1,
    normalizedColumns[0].matches.length || 1,
  );
  const centerStep = cardHeight + baseGap;
  const contentHeight = outerPadding * 2 + firstRoundMatches * centerStep;
  const boardHeight = Math.max(minHeight, contentHeight);
  const verticalOffset = alignTop ? 0 : (boardHeight - contentHeight) / 2;

  const boardWidth =
    outerPadding * 2 +
    normalizedColumns.length * columnWidth +
    Math.max(0, normalizedColumns.length - 1) * columnGap;

  const getColumnLeft = (columnIndex: number) =>
    outerPadding + columnIndex * (columnWidth + columnGap);

  const getRoundStep = (columnMatches: number) => {
    if (columnMatches <= 0) {
      return centerStep;
    }
    return (firstRoundMatches / columnMatches) * centerStep;
  };

  const getMatchCenterY = (columnMatches: number, matchIndex: number) =>
    verticalOffset + outerPadding + getRoundStep(columnMatches) * (matchIndex + 0.5);

  const mapToNextIndex = (
    fromLength: number,
    toLength: number,
    fromIndex: number,
  ) => {
    if (toLength <= 1) return 0;
    if (fromLength >= toLength * 2) {
      return Math.min(toLength - 1, Math.floor(fromIndex / 2));
    }
    return Math.min(toLength - 1, Math.floor((fromIndex * toLength) / fromLength));
  };

  const connectorPaths: Array<{ d: string; fromColumn: number }> = [];

  for (let columnIndex = 0; columnIndex < normalizedColumns.length - 1; columnIndex += 1) {
    const fromMatches = normalizedColumns[columnIndex].matches;
    const toMatches = normalizedColumns[columnIndex + 1].matches;
    const fromLength = fromMatches.length;
    const toLength = toMatches.length;

    if (fromLength === 0 || toLength === 0) continue;

    const x1 = getColumnLeft(columnIndex) + columnWidth;
    const x2 = getColumnLeft(columnIndex + 1);
    const middleX = x1 + (x2 - x1) / 2;

    for (let fromIndex = 0; fromIndex < fromLength; fromIndex += 1) {
      const toIndex = mapToNextIndex(fromLength, toLength, fromIndex);
      const y1 = getMatchCenterY(fromLength, fromIndex);
      const y2 = getMatchCenterY(toLength, toIndex);
      connectorPaths.push({
        d: `M ${x1} ${y1} L ${middleX} ${y1} L ${middleX} ${y2} L ${x2} ${y2}`,
        fromColumn: columnIndex,
      });
    }
  }

  return {
    boardHeight,
    boardWidth,
    cardHeight,
    columnWidth,
    columnGap,
    outerPadding,
    connectorPaths,
    getColumnLeft,
    getMatchCenterY,
  };
}

function getVisibleBoardWidth(layout: BracketLayout, columnCount: number) {
  if (columnCount <= 0) {
    return 0;
  }

  return (
    layout.outerPadding * 2 +
    columnCount * layout.columnWidth +
    Math.max(0, columnCount - 1) * layout.columnGap
  );
}

function DesktopBracketLayer({
  columns,
  layout,
  className,
  style,
}: {
  columns: PublicTorneoDetail["llave"];
  layout: BracketLayout;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={className} style={style}>
      <div
        className="relative mb-3"
        style={{ width: `${layout.boardWidth}px`, height: "28px" }}
      >
        {columns.map((column, columnIndex) => (
          <div
            key={`${column.round}-label`}
            className="absolute border-b border-deep-black/12 text-center transition-all duration-500 ease-in-out"
            style={{
              left: `${layout.getColumnLeft(columnIndex)}px`,
              width: `${layout.columnWidth}px`,
            }}
          >
            <h2 className="pb-1 text-xs font-semibold uppercase tracking-[0.1em] text-deep-black/70">
              {column.label}
            </h2>
          </div>
        ))}
      </div>

      <div
        className="relative"
        style={{
          width: `${layout.boardWidth}px`,
          height: `${layout.boardHeight}px`,
        }}
      >
        <div
          className="absolute inset-y-0 z-0 rounded-2xl bg-padel-green/10 transition-all duration-500 ease-in-out"
          style={{
            left: `${layout.getColumnLeft(0) - 8}px`,
            width: `${layout.columnWidth + 16}px`,
          }}
        />

        <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full">
          {layout.connectorPaths.map((connector, index) => (
            <path
              key={`${connector.d}-${index}`}
              d={connector.d}
              fill="none"
              stroke="rgba(28,37,38,0.2)"
              strokeWidth="2"
            />
          ))}
        </svg>

        {columns.map((column, columnIndex) =>
          column.matches.map((match, matchIndex) => {
            const top =
              layout.getMatchCenterY(column.matches.length, matchIndex) -
              layout.cardHeight / 2;

            return (
              <TorneoMatchCard
                key={match.id}
                match={match}
                roundLabel={column.label}
                matchNumber={matchIndex + 1}
                className="absolute z-20 h-[136px] transition-all duration-500 ease-in-out"
                style={{
                  left: `${layout.getColumnLeft(columnIndex)}px`,
                  top: `${top}px`,
                  width: `${layout.columnWidth}px`,
                }}
              />
            );
          }),
        )}
      </div>
    </div>
  );
}

const MOCK_GRUPOS: PublicTorneoDetail["grupos"] = [
  {
    id: -1,
    nombre: "Zona A",
    rows: [
      { parejaId: -11, parejaNombre: "Perez / Gomez", pts: 6, pg: 3, pp: 0, sg: 6, sp: 2, gg: 38, gp: 24 },
      { parejaId: -12, parejaNombre: "Lopez / Diaz", pts: 5, pg: 2, pp: 1, sg: 5, sp: 3, gg: 34, gp: 29 },
      { parejaId: -13, parejaNombre: "Sosa / Ruiz", pts: 4, pg: 1, pp: 2, sg: 3, sp: 5, gg: 27, gp: 33 },
      { parejaId: -14, parejaNombre: "Acosta / Medina", pts: 3, pg: 0, pp: 3, sg: 2, sp: 6, gg: 21, gp: 34 },
    ],
  },
  {
    id: -2,
    nombre: "Zona B",
    rows: [
      { parejaId: -21, parejaNombre: "Fernandez / Nunez", pts: 6, pg: 3, pp: 0, sg: 6, sp: 1, gg: 40, gp: 23 },
      { parejaId: -22, parejaNombre: "Rossi / Vidal", pts: 5, pg: 2, pp: 1, sg: 4, sp: 3, gg: 31, gp: 28 },
      { parejaId: -23, parejaNombre: "Molina / Silva", pts: 4, pg: 1, pp: 2, sg: 3, sp: 5, gg: 29, gp: 35 },
      { parejaId: -24, parejaNombre: "Ibarra / Torres", pts: 3, pg: 0, pp: 3, sg: 1, sp: 6, gg: 20, gp: 34 },
    ],
  },
];

function mockDate(dayOffset: number, hour: number) {
  return new Date(Date.UTC(2026, 3, 9 + dayOffset, hour, 0, 0)).toISOString();
}

const MOCK_LLAVE: PublicTorneoDetail["llave"] = [
  {
    round: "DIECISEISAVOS",
    label: "Dieciseisavos de final",
    matches: Array.from({ length: 16 }, (_, index) => ({
      id: -1000 - index,
      round: "DIECISEISAVOS" as const,
      scheduledAt: mockDate(0, 10 + (index % 8)),
      status: "FINISHED" as const,
      pareja1: `Pareja ${index * 2 + 1}`,
      pareja2: `Pareja ${index * 2 + 2}`,
      cancha: `Cancha ${(index % 3) + 1}`,
      score: "6-4 | 6-3",
    })),
  },
  {
    round: "OCTAVOS",
    label: "Octavos de final",
    matches: Array.from({ length: 8 }, (_, index) => ({
      id: -1100 - index,
      round: "OCTAVOS" as const,
      scheduledAt: mockDate(1, 10 + index),
      status: "FINISHED" as const,
      pareja1: `Ganador D${index * 2 + 1}`,
      pareja2: `Ganador D${index * 2 + 2}`,
      cancha: `Cancha ${(index % 3) + 1}`,
      score: "6-2 | 6-4",
    })),
  },
  {
    round: "CUARTOS",
    label: "Cuartos de final",
    matches: Array.from({ length: 4 }, (_, index) => ({
      id: -1200 - index,
      round: "CUARTOS" as const,
      scheduledAt: mockDate(2, 11 + index),
      status: "FINISHED" as const,
      pareja1: `Ganador O${index * 2 + 1}`,
      pareja2: `Ganador O${index * 2 + 2}`,
      cancha: `Cancha ${(index % 2) + 1}`,
      score: "7-5 | 6-4",
    })),
  },
  {
    round: "SEMIFINAL",
    label: "Semifinal",
    matches: Array.from({ length: 2 }, (_, index) => ({
      id: -1300 - index,
      round: "SEMIFINAL" as const,
      scheduledAt: mockDate(3, 18 + index),
      status: "FINISHED" as const,
      pareja1: `Ganador Q${index * 2 + 1}`,
      pareja2: `Ganador Q${index * 2 + 2}`,
      cancha: `Cancha ${index + 1}`,
      score: "6-4 | 7-6",
    })),
  },
  {
    round: "FINAL",
    label: "Final",
    matches: [
      {
        id: -1400,
        round: "FINAL",
        scheduledAt: mockDate(4, 19),
        status: "SCHEDULED",
        pareja1: "Ganador S1",
        pareja2: "Ganador S2",
        cancha: "Cancha Central",
        score: "-",
      },
    ],
  },
];

export default function TorneoDetailTabs({
  detail,
}: {
  detail: PublicTorneoDetail;
}) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("grupos");
  const [selectedPhase, setSelectedPhase] = useState<PhaseRound | null>(null);
  const [phaseTransition, setPhaseTransition] =
    useState<PhaseTransitionState | null>(null);
  const transitionTimerRef = useRef<number | null>(null);
  const transitionCounterRef = useRef(0);
  const PHASE_TRANSITION_MS = 560;

  const locationLabel = useMemo(
    () => `${detail.complejoNombre} - ${detail.complejoCiudad}, ${detail.complejoProvincia}`,
    [detail.complejoCiudad, detail.complejoNombre, detail.complejoProvincia],
  );

  const hasRealGrupos = detail.grupos.length > 0;
  const hasRealLlave = detail.llave.some((column) => column.matches.length > 0);
  const gruposToRender = hasRealGrupos ? detail.grupos : MOCK_GRUPOS;
  const llaveToRender = hasRealLlave ? detail.llave : MOCK_LLAVE;

  const renderedLlaveColumns = useMemo(() => {
    const withMatches = llaveToRender.filter((column) => column.matches.length > 0);
    return withMatches.length > 0 ? withMatches : llaveToRender;
  }, [llaveToRender]);

  const fallbackPhase = renderedLlaveColumns[0]?.round ?? null;
  const effectiveSelectedPhase =
    selectedPhase && renderedLlaveColumns.some((column) => column.round === selectedPhase)
      ? selectedPhase
      : fallbackPhase;

  const selectedPhaseIndex = Math.max(
    0,
    renderedLlaveColumns.findIndex((column) => column.round === effectiveSelectedPhase),
  );

  const handlePhaseSelection = (nextRound: PhaseRound) => {
    if (nextRound === effectiveSelectedPhase) {
      return;
    }

    if (effectiveSelectedPhase) {
      const fromIndex = renderedLlaveColumns.findIndex(
        (column) => column.round === effectiveSelectedPhase,
      );
      const toIndex = renderedLlaveColumns.findIndex(
        (column) => column.round === nextRound,
      );

      const direction: PhaseTransitionDirection =
        toIndex >= fromIndex ? "forward" : "backward";

      transitionCounterRef.current += 1;
      setPhaseTransition({
        id: transitionCounterRef.current,
        from: effectiveSelectedPhase,
        to: nextRound,
        direction,
      });

      if (typeof window !== "undefined") {
        if (transitionTimerRef.current !== null) {
          window.clearTimeout(transitionTimerRef.current);
        }

        transitionTimerRef.current = window.setTimeout(() => {
          setPhaseTransition(null);
          transitionTimerRef.current = null;
        }, PHASE_TRANSITION_MS + 40);
      }
    }

    setSelectedPhase(nextRound);
  };

  const desktopVisibleColumns = useMemo(
    () => renderedLlaveColumns.slice(selectedPhaseIndex),
    [renderedLlaveColumns, selectedPhaseIndex],
  );

  const leavingDesktopColumns = useMemo(() => {
    if (!phaseTransition) {
      return [];
    }

    const fromIndex = renderedLlaveColumns.findIndex(
      (column) => column.round === phaseTransition.from,
    );

    return renderedLlaveColumns.slice(Math.max(0, fromIndex));
  }, [phaseTransition, renderedLlaveColumns]);

  const mobileSelectedColumn = renderedLlaveColumns[selectedPhaseIndex] ?? renderedLlaveColumns[0] ?? null;

  const desktopLayout = useMemo(
    () => buildBracketLayout(desktopVisibleColumns, { minHeight: 560, alignTop: true }),
    [desktopVisibleColumns],
  );

  const leavingDesktopLayout = useMemo(() => {
    if (leavingDesktopColumns.length === 0) {
      return null;
    }

    return buildBracketLayout(leavingDesktopColumns, {
      minHeight: 560,
      alignTop: true,
    });
  }, [leavingDesktopColumns]);

  const desktopVisibleWidth = useMemo(
    () => getVisibleBoardWidth(desktopLayout, desktopVisibleColumns.length),
    [desktopLayout, desktopVisibleColumns.length],
  );

  const leavingDesktopWidth = useMemo(() => {
    if (!leavingDesktopLayout) {
      return 0;
    }

    return getVisibleBoardWidth(leavingDesktopLayout, leavingDesktopColumns.length);
  }, [leavingDesktopColumns.length, leavingDesktopLayout]);

  const desktopViewportWidth = Math.max(desktopVisibleWidth, leavingDesktopWidth);
  const desktopViewportHeight =
    Math.max(desktopLayout.boardHeight, leavingDesktopLayout?.boardHeight ?? 0) + 40;

  const desktopEnterAnimation = phaseTransition
    ? phaseTransition.direction === "forward"
      ? `bracket-enter-forward ${PHASE_TRANSITION_MS}ms cubic-bezier(0.22,1,0.36,1) both`
      : `bracket-enter-backward ${PHASE_TRANSITION_MS}ms cubic-bezier(0.22,1,0.36,1) both`
    : undefined;

  const desktopLeaveAnimation = phaseTransition
    ? phaseTransition.direction === "forward"
      ? `bracket-leave-forward ${PHASE_TRANSITION_MS}ms cubic-bezier(0.22,1,0.36,1) both`
      : `bracket-leave-backward ${PHASE_TRANSITION_MS}ms cubic-bezier(0.22,1,0.36,1) both`
    : undefined;

  const mobileLayout = useMemo(
    () =>
      buildBracketLayout(
        mobileSelectedColumn ? [mobileSelectedColumn] : [],
        { minHeight: 360, alignTop: true },
      ),
    [mobileSelectedColumn],
  );

  const mobileEnterAnimation = phaseTransition
    ? phaseTransition.direction === "forward"
      ? `bracket-mobile-enter-forward ${PHASE_TRANSITION_MS}ms cubic-bezier(0.22,1,0.36,1) both`
      : `bracket-mobile-enter-backward ${PHASE_TRANSITION_MS}ms cubic-bezier(0.22,1,0.36,1) both`
    : undefined;

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  const mobileStubPaths = useMemo(() => {
    if (!mobileSelectedColumn) return [];

    const hasPrev = selectedPhaseIndex > 0;
    const hasNext = selectedPhaseIndex < renderedLlaveColumns.length - 1;
    if (!hasPrev && !hasNext) return [];

    const xLeft = mobileLayout.getColumnLeft(0);
    const xRight = xLeft + mobileLayout.columnWidth;
    const stubLength = 22;
    const paths: string[] = [];

    for (let index = 0; index < mobileSelectedColumn.matches.length; index += 1) {
      const y = mobileLayout.getMatchCenterY(mobileSelectedColumn.matches.length, index);
      if (hasPrev) {
        paths.push(`M ${xLeft} ${y} L ${xLeft - stubLength} ${y}`);
      }
      if (hasNext) {
        paths.push(`M ${xRight} ${y} L ${xRight + stubLength} ${y}`);
      }
    }

    return paths;
  }, [mobileLayout, mobileSelectedColumn, renderedLlaveColumns.length, selectedPhaseIndex]);

  return (
    <div className="space-y-5">
      <header className="rounded-3xl border border-deep-black/10 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-deep-black/60">
            {locationLabel}
          </p>

          <Link
            href="/torneos"
            className="inline-flex rounded-full border border-deep-black/15 bg-white px-4 py-2 text-sm font-semibold text-deep-black transition hover:bg-surface-soft"
          >
            Volver a torneos
          </Link>
        </div>
        <h1 className="mt-2 text-3xl font-semibold text-deep-black sm:text-4xl">
          {detail.nombre}
        </h1>
        <p className="mt-1 text-sm text-deep-black/70">
          Evento: {detail.eventoNombre}
        </p>
        {detail.comentario ? (
          <p className="mt-3 text-sm text-deep-black/75">{detail.comentario}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-padel-green/20 px-3 py-1 text-padel-green">
            {torneoStatusLabel(detail.status)}
          </span>
          <span className="rounded-full bg-surface-soft px-3 py-1 text-deep-black/80">
            Sexo: {detail.sexo}
          </span>
          <span className="rounded-full bg-surface-soft px-3 py-1 text-deep-black/80">
            Capacidad: {detail.capacidad} parejas
          </span>
          <span className="rounded-full bg-surface-soft px-3 py-1 text-deep-black/80">
            Inicio: {formatDateTime(detail.inicio)}
          </span>
        </div>
      </header>

      <div className="rounded-3xl border border-deep-black/10 bg-white shadow-sm">
        <div className="flex gap-2 border-b border-deep-black/10 px-4 pt-4 sm:px-6">
          <button
            type="button"
            onClick={() => setActiveTab("grupos")}
            className={`rounded-t-2xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === "grupos"
                ? "bg-padel-green/15 text-padel-green"
                : "text-deep-black/70 hover:bg-surface-soft"
            }`}
          >
            Grupos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("llave")}
            className={`rounded-t-2xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === "llave"
                ? "bg-padel-green/15 text-padel-green"
                : "text-deep-black/70 hover:bg-surface-soft"
            }`}
          >
            Llave
          </button>
        </div>

        <div className="p-1 sm:p-4">
          {activeTab === "grupos" ? (
            <div className="space-y-4">
              {!hasRealGrupos ? (
                <p className="rounded-xl border border-energy-orange/25 bg-energy-orange/10 px-4 py-2 text-xs font-semibold text-energy-orange">
                  Mostrando datos de ejemplo para zonas.
                </p>
              ) : null}

              {gruposToRender.map((grupo) => (
                <article
                  key={grupo.id}
                  className="overflow-hidden rounded-2xl border border-deep-black/10"
                >
                  <div className="border-b border-deep-black/10 bg-gradient-to-r from-padel-green/15 via-white to-energy-orange/15 px-4 py-3">
                    <h2 className="text-lg font-semibold text-deep-black">
                      {grupo.nombre}
                    </h2>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-surface-soft text-deep-black/80">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold">Pareja</th>
                          <th className="px-3 py-2 text-right font-semibold">Pts</th>
                          <th className="px-3 py-2 text-right font-semibold">PG</th>
                          <th className="px-3 py-2 text-right font-semibold">PP</th>
                          <th className="px-3 py-2 text-right font-semibold">SG</th>
                          <th className="px-3 py-2 text-right font-semibold">SP</th>
                          <th className="px-3 py-2 text-right font-semibold">GG</th>
                          <th className="px-3 py-2 text-right font-semibold">GP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grupo.rows.map((row, index) => (
                          <tr
                            key={row.parejaId}
                            className={`transition hover:bg-padel-green/10 ${
                              index % 2 === 0 ? "bg-white" : "bg-surface-soft/50"
                            }`}
                          >
                            <td className="px-3 py-2 font-medium text-deep-black">
                              {row.parejaNombre}
                            </td>
                            <td className="px-3 py-2 text-right">{row.pts}</td>
                            <td className="px-3 py-2 text-right">{row.pg}</td>
                            <td className="px-3 py-2 text-right">{row.pp}</td>
                            <td className="px-3 py-2 text-right">{row.sg}</td>
                            <td className="px-3 py-2 text-right">{row.sp}</td>
                            <td className="px-3 py-2 text-right">{row.gg}</td>
                            <td className="px-3 py-2 text-right">{row.gp}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {!hasRealLlave ? (
                <p className="rounded-xl border border-energy-orange/25 bg-energy-orange/10 px-4 py-2 text-xs font-semibold text-energy-orange">
                  Mostrando datos de ejemplo para la llave.
                </p>
              ) : null}

              {renderedLlaveColumns.length > 0 ? (
                <div className="flex w-full flex-wrap items-center justify-center gap-2">
                  {renderedLlaveColumns.map((column) => {
                    const isSelected = column.round === effectiveSelectedPhase;
                    return (
                      <button
                        key={`phase-${column.round}`}
                        type="button"
                        onClick={() => handlePhaseSelection(column.round)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          isSelected
                            ? "border-padel-green bg-padel-green text-deep-black"
                            : "border-deep-black/15 bg-white text-deep-black/70 hover:bg-surface-soft"
                        }`}
                      >
                        {phaseShortLabel(column.round)}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <div className="hidden overflow-x-auto pb-2 md:block">
                <div className="w-full">
                  <div
                    className="relative overflow-hidden rounded-2xl transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    style={{
                      width: `${desktopViewportWidth}px`,
                      height: `${desktopViewportHeight}px`,
                    }}
                  >
                    {phaseTransition && leavingDesktopLayout ? (
                      <DesktopBracketLayer
                        key={`desktop-leaving-${phaseTransition.id}`}
                        columns={leavingDesktopColumns}
                        layout={leavingDesktopLayout}
                        className="absolute left-0 top-0"
                        style={{
                          animation: desktopLeaveAnimation,
                        }}
                      />
                    ) : null}

                    <DesktopBracketLayer
                      key={`desktop-current-${effectiveSelectedPhase ?? "default"}`}
                      columns={desktopVisibleColumns}
                      layout={desktopLayout}
                      className="absolute left-0 top-0"
                      style={
                        desktopEnterAnimation
                          ? {
                              animation: desktopEnterAnimation,
                            }
                          : undefined
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto pb-2 md:hidden">
                {mobileSelectedColumn ? (
                  <div
                    key={`mobile-layer-${effectiveSelectedPhase ?? "default"}-${phaseTransition?.id ?? "stable"}`}
                    className="min-w-max"
                    style={
                      mobileEnterAnimation
                        ? {
                            animation: mobileEnterAnimation,
                          }
                        : undefined
                    }
                  >
                    <div
                      className="relative mb-3"
                      style={{ width: `${mobileLayout.boardWidth}px`, height: "28px" }}
                    >
                      <div
                        className="absolute border-b border-deep-black/12 text-center"
                        style={{
                          left: `${mobileLayout.getColumnLeft(0)}px`,
                          width: `${mobileLayout.columnWidth}px`,
                        }}
                      >
                        <h2 className="pb-1 text-xs font-semibold uppercase tracking-[0.1em] text-deep-black/70">
                          {mobileSelectedColumn.label}
                        </h2>
                      </div>
                    </div>

                    <div
                      className="relative"
                      style={{
                        width: `${mobileLayout.boardWidth}px`,
                        height: `${mobileLayout.boardHeight}px`,
                      }}
                    >
                      <div
                        className="absolute inset-y-0 z-0 rounded-2xl bg-padel-green/10 transition-all duration-500 ease-in-out"
                        style={{
                          left: `${mobileLayout.getColumnLeft(0) - 8}px`,
                          width: `${mobileLayout.columnWidth + 16}px`,
                        }}
                      />

                      <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full">
                        {mobileStubPaths.map((path, index) => (
                          <path
                            key={`${path}-${index}`}
                            d={path}
                            fill="none"
                            stroke="rgba(28,37,38,0.2)"
                            strokeWidth="2"
                          />
                        ))}
                      </svg>

                      {mobileSelectedColumn.matches.map((match, matchIndex) => {
                        const top =
                          mobileLayout.getMatchCenterY(mobileSelectedColumn.matches.length, matchIndex) -
                          mobileLayout.cardHeight / 2;

                        return (
                          <TorneoMatchCard
                            key={`mobile-${match.id}`}
                            match={match}
                            roundLabel={mobileSelectedColumn.label}
                            matchNumber={matchIndex + 1}
                            className="absolute z-20 h-[136px] transition-all duration-500 ease-in-out"
                            style={{
                              left: `${mobileLayout.getColumnLeft(0)}px`,
                              top: `${top}px`,
                              width: `${mobileLayout.columnWidth}px`,
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        @keyframes bracket-enter-forward {
          from {
            opacity: 0;
            transform: translateX(48px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        @keyframes bracket-leave-forward {
          from {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateX(-48px) scale(0.985);
          }
        }

        @keyframes bracket-enter-backward {
          from {
            opacity: 0;
            transform: translateX(-48px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        @keyframes bracket-leave-backward {
          from {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateX(48px) scale(0.985);
          }
        }

        @keyframes bracket-mobile-enter-forward {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes bracket-mobile-enter-backward {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
