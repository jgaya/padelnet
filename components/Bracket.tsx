"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

export type BracketRound =
  | "DIECISEISAVOS"
  | "OCTAVOS"
  | "CUARTOS"
  | "SEMIFINAL"
  | "FINAL";

export type BracketMatchStatus =
  | "PENDING"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "FINISHED"
  | "WALKOVER"
  | "CANCELLED";

export type BracketMatch = {
  id: string | number;
  round: BracketRound;
  scheduledAt: string | null;
  cancha: string | null;
  status: BracketMatchStatus;
  pareja1: string;
  pareja2: string;
  score: string;
};

export type BracketColumn = {
  round: BracketRound;
  label: string;
  matches: BracketMatch[];
};

export type BracketProps = {
  columns: BracketColumn[];
  selectedPhase?: BracketRound | null;
  initialSelectedPhase?: BracketRound | null;
  onPhaseChange?: (round: BracketRound) => void;
  className?: string;
  style?: CSSProperties;
  transitionMs?: number;
};

type PhaseTransitionDirection = "forward" | "backward";

type PhaseTransitionState = {
  id: number;
  from: BracketRound;
  to: BracketRound;
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
    /** Indices dentro de su columna, para saber que partidos une cada linea. */
    fromIndex: number;
    toIndex: number;
  }>;
  getColumnLeft: (columnIndex: number) => number;
  getMatchCenterY: (columnMatches: number, matchIndex: number) => number;
};

type ParsedSet = {
  pareja1: number;
  pareja2: number;
};

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

function matchStatusLabel(status: BracketMatchStatus) {
  switch (status) {
    case "SCHEDULED":
      return "Programado";
    case "IN_PROGRESS":
      return "En juego";
    case "FINISHED":
      return "Finalizado";
    case "WALKOVER":
      return "Walkover";
    case "CANCELLED":
      return "Cancelado";
    case "PENDING":
    default:
      return "Pendiente";
  }
}

function matchStatusBadgeClass(status: BracketMatchStatus) {
  switch (status) {
    case "IN_PROGRESS":
      return "bg-energy-orange/20 text-energy-orange";
    case "FINISHED":
      return "bg-padel-green/20 text-padel-green";
    case "WALKOVER":
    case "CANCELLED":
      return "bg-danger/12 text-danger";
    case "SCHEDULED":
      return "bg-info/12 text-info";
    case "PENDING":
    default:
      return "bg-surface-soft text-content/70";
  }
}

function parseScoreSets(score: string) {
  if (!score || score === "-") {
    return [];
  }

  return score
    .split("|")
    .map((value) => value.trim())
    .map((setValue) => {
      const match = setValue.match(/^(\d+)\s*-\s*(\d+)$/);
      if (!match) return null;
      return {
        pareja1: Number(match[1]),
        pareja2: Number(match[2]),
      };
    })
    .filter((set): set is ParsedSet => set !== null);
}

function resolveWinner(sets: ParsedSet[]) {
  let pareja1Wins = 0;
  let pareja2Wins = 0;

  for (const set of sets) {
    if (set.pareja1 > set.pareja2) {
      pareja1Wins += 1;
    } else if (set.pareja2 > set.pareja1) {
      pareja2Wins += 1;
    }
  }

  if (pareja1Wins === pareja2Wins) {
    return null;
  }

  return pareja1Wins > pareja2Wins ? 1 : 2;
}

function phaseShortLabel(round: BracketRound) {
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

/**
 * Si el slot tiene una pareja de verdad y no un placeholder.
 *
 * Los nombres de pareja vienen armados como "Nombre Apellido / Nombre Apellido"
 * (lib/torneo-vista-publica.ts), mientras que los slots sin resolver traen el
 * token de la planilla ("1A", "Bye") o "A definir". Sin este filtro, hacer clic
 * en un slot vacio "resaltaria el camino" de todos los slots vacios del cuadro.
 */
function esParejaSeleccionable(label: string) {
  return label.includes("/");
}

function matchTienePareja(
  match: BracketMatch | undefined,
  pareja: string | null,
) {
  if (!match || !pareja) return false;
  return match.pareja1 === pareja || match.pareja2 === pareja;
}

function buildBracketLayout(
  columns: BracketColumn[],
  options?: { minHeight?: number; alignTop?: boolean },
): BracketLayout {
  const columnWidth = 288;
  const columnGap = 56;
  const cardHeight = 136;
  const baseGap = 16;
  const outerPadding = 24;
  const minHeight = options?.minHeight ?? 560;
  const alignTop = options?.alignTop ?? true;

  const normalizedColumns =
    columns.length > 0
      ? columns
      : [{ round: "FINAL" as const, label: "Final", matches: [] }];
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
    verticalOffset +
    outerPadding +
    getRoundStep(columnMatches) * (matchIndex + 0.5);

  const mapToNextIndex = (
    fromLength: number,
    toLength: number,
    fromIndex: number,
  ) => {
    if (toLength <= 1) return 0;
    if (fromLength >= toLength * 2) {
      return Math.min(toLength - 1, Math.floor(fromIndex / 2));
    }
    return Math.min(
      toLength - 1,
      Math.floor((fromIndex * toLength) / fromLength),
    );
  };

  const connectorPaths: BracketLayout["connectorPaths"] = [];

  for (
    let columnIndex = 0;
    columnIndex < normalizedColumns.length - 1;
    columnIndex += 1
  ) {
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
        fromIndex,
        toIndex,
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

/**
 * Una de las dos parejas de un partido, con sus games.
 *
 * Es un boton cuando la pareja esta definida: al tocarla se resalta el camino
 * que hizo en el cuadro.
 */
function BracketPairRow({
  label,
  games,
  esGanador,
  seleccionada,
  onSelect,
}: {
  label: string;
  games: number[];
  esGanador: boolean;
  seleccionada: boolean;
  onSelect: ((pareja: string) => void) | undefined;
}) {
  const seleccionable = esParejaSeleccionable(label) && Boolean(onSelect);

  const nombreClassName = `truncate text-left text-sm ${
    seleccionada
      ? "font-bold text-padel-green"
      : `text-content ${esGanador ? "font-bold" : "font-medium"}`
  }`;

  return (
    <div className="flex items-center justify-between gap-2">
      {seleccionable ? (
        <button
          type="button"
          aria-pressed={seleccionada}
          title={
            seleccionada
              ? "Quitar el resaltado de esta pareja"
              : "Ver el camino de esta pareja en el cuadro"
          }
          onClick={() => onSelect?.(label)}
          className={`${nombreClassName} rounded transition hover:text-padel-green focus:outline-none focus-visible:ring-2 focus-visible:ring-padel-green/40`}
        >
          {label}
        </button>
      ) : (
        <p className={nombreClassName}>{label}</p>
      )}

      <div className="flex items-center gap-1 text-xs font-semibold tabular-nums text-content/80">
        {games.length > 0 ? (
          games.map((valor, index) => (
            <span key={index} className="w-4 text-right">
              {valor}
            </span>
          ))
        ) : (
          <span className="w-4 text-right">-</span>
        )}
      </div>
    </div>
  );
}

function BracketMatchCard({
  match,
  roundLabel,
  matchNumber,
  className,
  style,
  selectedPareja,
  onSelectPareja,
}: {
  match: BracketMatch;
  roundLabel: string;
  matchNumber: number;
  className?: string;
  style?: CSSProperties;
  selectedPareja?: string | null;
  onSelectPareja?: (pareja: string) => void;
}) {
  const sets = parseScoreSets(match.score);
  const winner = resolveWinner(sets);
  const showFallbackScore =
    sets.length === 0 && match.score && match.score !== "-";

  const seleccion = selectedPareja ?? null;
  const enCamino = matchTienePareja(match, seleccion);
  // Con una pareja elegida, los partidos ajenos a su camino se apagan para que
  // el recorrido se lea de un vistazo.
  //
  // El contorno de los que si jugo va con el mismo verde que las lineas, y el
  // grosor lo pone el ring y no el borde: el ring es un box-shadow, asi que no
  // corre el contenido dentro de la card, que tiene alto fijo. En mobile, donde
  // se ve una fase por vez y los conectores son apenas dos guiones, este
  // contorno es la senal principal.
  const resaltado = seleccion
    ? enCamino
      ? "border-padel-green ring-2 ring-padel-green"
      : "opacity-60"
    : "";

  const cardClassName =
    `overflow-hidden rounded-xl border border-content/10 bg-surface p-3 shadow-sm ${resaltado} ${className ?? ""}`.trim();

  return (
    <article className={cardClassName} style={style}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-content/50">
          {roundLabel} #{matchNumber}
        </p>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${matchStatusBadgeClass(match.status)}`}
        >
          {matchStatusLabel(match.status)}
        </span>
      </div>

      <div className="mt-2 space-y-1.5">
        <BracketPairRow
          label={match.pareja1}
          games={sets.map((set) => set.pareja1)}
          esGanador={winner === 1}
          seleccionada={seleccion === match.pareja1}
          onSelect={onSelectPareja}
        />
        <BracketPairRow
          label={match.pareja2}
          games={sets.map((set) => set.pareja2)}
          esGanador={winner === 2}
          seleccionada={seleccion === match.pareja2}
          onSelect={onSelectPareja}
        />
      </div>

      {showFallbackScore ? (
        <p className="mt-2 text-xs text-content/70">
          Resultado: {match.score}
        </p>
      ) : null}

      <p className="mt-2 text-xs text-content/70">
        Cancha: {match.cancha ?? "-"}
      </p>
      <p className="text-xs text-content/70">
        {formatDateTime(match.scheduledAt)}
      </p>
    </article>
  );
}

function DesktopBracketLayer({
  columns,
  layout,
  className,
  style,
  selectedPareja,
  onSelectPareja,
}: {
  columns: BracketColumn[];
  layout: BracketLayout;
  className?: string;
  style?: CSSProperties;
  selectedPareja?: string | null;
  onSelectPareja?: (pareja: string) => void;
}) {
  const seleccion = selectedPareja ?? null;

  // Una linea es parte del camino si la pareja elegida esta en los dos partidos
  // que une. Asi el recorrido se corta solo donde la pareja perdio: el cruce
  // siguiente ya no la tiene.
  const conectores = layout.connectorPaths.map((connector) => ({
    ...connector,
    enCamino:
      matchTienePareja(
        columns[connector.fromColumn]?.matches[connector.fromIndex],
        seleccion,
      ) &&
      matchTienePareja(
        columns[connector.fromColumn + 1]?.matches[connector.toIndex],
        seleccion,
      ),
  }));

  // Las resaltadas van despues para que queden por encima de las apagadas.
  const conectoresOrdenados = [
    ...conectores.filter((connector) => !connector.enCamino),
    ...conectores.filter((connector) => connector.enCamino),
  ];

  return (
    <div className={className} style={style}>
      <div
        className="relative mb-3"
        style={{ width: `${layout.boardWidth}px`, height: "28px" }}
      >
        {columns.map((column, columnIndex) => (
          <div
            key={`${column.round}-label`}
            className="absolute border-b border-content/12 text-center transition-all duration-500 ease-in-out"
            style={{
              left: `${layout.getColumnLeft(columnIndex)}px`,
              width: `${layout.columnWidth}px`,
            }}
          >
            <h2 className="pb-1 text-xs font-semibold uppercase tracking-[0.1em] text-content/70">
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
          {conectoresOrdenados.map((connector, index) => (
            <path
              key={`${connector.d}-${index}`}
              d={connector.d}
              fill="none"
              stroke={
                connector.enCamino
                  ? "var(--padel-green)"
                  : seleccion
                    ? "rgba(28,37,38,0.1)"
                    : "rgba(28,37,38,0.2)"
              }
              strokeWidth={connector.enCamino ? 3.5 : 2}
              className="transition-all duration-300"
            />
          ))}
        </svg>

        {columns.map((column, columnIndex) =>
          column.matches.map((match, matchIndex) => {
            const top =
              layout.getMatchCenterY(column.matches.length, matchIndex) -
              layout.cardHeight / 2;

            return (
              <BracketMatchCard
                key={match.id}
                match={match}
                roundLabel={column.label}
                matchNumber={matchIndex + 1}
                selectedPareja={seleccion}
                onSelectPareja={onSelectPareja}
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

export function Bracket({
  columns,
  selectedPhase,
  initialSelectedPhase,
  onPhaseChange,
  className,
  style,
  transitionMs = 560,
}: BracketProps) {
  const [internalSelectedPhase, setInternalSelectedPhase] =
    useState<BracketRound | null>(initialSelectedPhase ?? null);
  const [phaseTransition, setPhaseTransition] =
    useState<PhaseTransitionState | null>(null);
  // Pareja resaltada. Queda elegida al cambiar de fase; se suelta tocandola de
  // nuevo o eligiendo otra.
  const [selectedPareja, setSelectedPareja] = useState<string | null>(null);
  const transitionTimerRef = useRef<number | null>(null);
  const transitionCounterRef = useRef(0);

  const renderedColumns = useMemo(() => {
    const withMatches = columns.filter((column) => column.matches.length > 0);
    return withMatches.length > 0 ? withMatches : columns;
  }, [columns]);

  const controlledSelectedPhase = selectedPhase !== undefined;
  const currentSelectedPhase = controlledSelectedPhase
    ? selectedPhase
    : internalSelectedPhase;

  const fallbackPhase = renderedColumns[0]?.round ?? null;
  const effectiveSelectedPhase =
    currentSelectedPhase &&
    renderedColumns.some((column) => column.round === currentSelectedPhase)
      ? currentSelectedPhase
      : fallbackPhase;

  const selectedPhaseIndex = Math.max(
    0,
    renderedColumns.findIndex(
      (column) => column.round === effectiveSelectedPhase,
    ),
  );

  const handleParejaSelection = (pareja: string) => {
    setSelectedPareja((actual) => (actual === pareja ? null : pareja));
  };

  const handlePhaseSelection = (nextRound: BracketRound) => {
    if (nextRound === effectiveSelectedPhase) {
      return;
    }

    if (effectiveSelectedPhase) {
      const fromIndex = renderedColumns.findIndex(
        (column) => column.round === effectiveSelectedPhase,
      );
      const toIndex = renderedColumns.findIndex(
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
        }, transitionMs + 40);
      }
    }

    if (!controlledSelectedPhase) {
      setInternalSelectedPhase(nextRound);
    }
    onPhaseChange?.(nextRound);
  };

  // Si los datos se recargan y la pareja elegida ya no esta en el cuadro, la
  // seleccion se ignora en vez de resaltar la nada.
  const parejaResaltada = useMemo(() => {
    if (!selectedPareja) return null;

    const sigueEnElCuadro = renderedColumns.some((column) =>
      column.matches.some((match) => matchTienePareja(match, selectedPareja)),
    );

    return sigueEnElCuadro ? selectedPareja : null;
  }, [renderedColumns, selectedPareja]);

  const desktopVisibleColumns = useMemo(
    () => renderedColumns.slice(selectedPhaseIndex),
    [renderedColumns, selectedPhaseIndex],
  );

  const leavingDesktopColumns = useMemo(() => {
    if (!phaseTransition) {
      return [];
    }

    const fromIndex = renderedColumns.findIndex(
      (column) => column.round === phaseTransition.from,
    );

    return renderedColumns.slice(Math.max(0, fromIndex));
  }, [phaseTransition, renderedColumns]);

  const mobileSelectedColumn =
    renderedColumns[selectedPhaseIndex] ?? renderedColumns[0] ?? null;

  const desktopLayout = useMemo(
    () =>
      buildBracketLayout(desktopVisibleColumns, {
        minHeight: 560,
        alignTop: true,
      }),
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

    return getVisibleBoardWidth(
      leavingDesktopLayout,
      leavingDesktopColumns.length,
    );
  }, [leavingDesktopColumns.length, leavingDesktopLayout]);

  const desktopViewportWidth = Math.max(
    desktopVisibleWidth,
    leavingDesktopWidth,
  );
  const desktopViewportHeight =
    Math.max(
      desktopLayout.boardHeight,
      leavingDesktopLayout?.boardHeight ?? 0,
    ) + 40;

  const desktopEnterAnimation = phaseTransition
    ? phaseTransition.direction === "forward"
      ? `bracket-enter-forward ${transitionMs}ms cubic-bezier(0.22,1,0.36,1) both`
      : `bracket-enter-backward ${transitionMs}ms cubic-bezier(0.22,1,0.36,1) both`
    : undefined;

  const desktopLeaveAnimation = phaseTransition
    ? phaseTransition.direction === "forward"
      ? `bracket-leave-forward ${transitionMs}ms cubic-bezier(0.22,1,0.36,1) both`
      : `bracket-leave-backward ${transitionMs}ms cubic-bezier(0.22,1,0.36,1) both`
    : undefined;

  const mobileLayout = useMemo(
    () =>
      buildBracketLayout(mobileSelectedColumn ? [mobileSelectedColumn] : [], {
        minHeight: 360,
        alignTop: true,
      }),
    [mobileSelectedColumn],
  );

  const mobileEnterAnimation = phaseTransition
    ? phaseTransition.direction === "forward"
      ? `bracket-mobile-enter-forward ${transitionMs}ms cubic-bezier(0.22,1,0.36,1) both`
      : `bracket-mobile-enter-backward ${transitionMs}ms cubic-bezier(0.22,1,0.36,1) both`
    : undefined;

  const mobileStubPaths = useMemo(() => {
    if (!mobileSelectedColumn) return [];

    const hasPrev = selectedPhaseIndex > 0;
    const hasNext = selectedPhaseIndex < renderedColumns.length - 1;
    if (!hasPrev && !hasNext) return [];

    const xLeft = mobileLayout.getColumnLeft(0);
    const xRight = xLeft + mobileLayout.columnWidth;
    const stubLength = 22;
    const paths: Array<{ d: string; matchIndex: number }> = [];

    for (
      let index = 0;
      index < mobileSelectedColumn.matches.length;
      index += 1
    ) {
      const y = mobileLayout.getMatchCenterY(
        mobileSelectedColumn.matches.length,
        index,
      );
      if (hasPrev) {
        paths.push({
          d: `M ${xLeft} ${y} L ${xLeft - stubLength} ${y}`,
          matchIndex: index,
        });
      }
      if (hasNext) {
        paths.push({
          d: `M ${xRight} ${y} L ${xRight + stubLength} ${y}`,
          matchIndex: index,
        });
      }
    }

    return paths;
  }, [
    mobileLayout,
    mobileSelectedColumn,
    renderedColumns.length,
    selectedPhaseIndex,
  ]);

  useEffect(() => {
    return () => {
      if (
        typeof window !== "undefined" &&
        transitionTimerRef.current !== null
      ) {
        window.clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  if (renderedColumns.length === 0) {
    return null;
  }

  const rootClassName = `space-y-3 ${className ?? ""}`.trim();

  return (
    <div className={rootClassName} style={style}>
      <div className="flex w-full flex-wrap items-center justify-center gap-2">
        {renderedColumns.map((column) => {
          const isSelected = column.round === effectiveSelectedPhase;
          return (
            <button
              key={`phase-${column.round}`}
              type="button"
              onClick={() => handlePhaseSelection(column.round)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                isSelected
                  ? "border-padel-green bg-padel-green text-on-brand"
                  : "border-content/15 bg-surface text-content/70 hover:bg-surface-soft"
              }`}
            >
              {phaseShortLabel(column.round)}
            </button>
          );
        })}
      </div>

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
                selectedPareja={parejaResaltada}
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
              selectedPareja={parejaResaltada}
              onSelectPareja={handleParejaSelection}
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
                className="absolute border-b border-content/12 text-center"
                style={{
                  left: `${mobileLayout.getColumnLeft(0)}px`,
                  width: `${mobileLayout.columnWidth}px`,
                }}
              >
                <h2 className="pb-1 text-xs font-semibold uppercase tracking-[0.1em] text-content/70">
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
                {mobileStubPaths.map((stub, index) => {
                  const enCamino = matchTienePareja(
                    mobileSelectedColumn.matches[stub.matchIndex],
                    parejaResaltada,
                  );

                  return (
                    <path
                      key={`${stub.d}-${index}`}
                      d={stub.d}
                      fill="none"
                      stroke={
                        enCamino
                          ? "var(--padel-green)"
                          : parejaResaltada
                            ? "rgba(28,37,38,0.1)"
                            : "rgba(28,37,38,0.2)"
                      }
                      strokeWidth={enCamino ? 3.5 : 2}
                      className="transition-all duration-300"
                    />
                  );
                })}
              </svg>

              {mobileSelectedColumn.matches.map((match, matchIndex) => {
                const top =
                  mobileLayout.getMatchCenterY(
                    mobileSelectedColumn.matches.length,
                    matchIndex,
                  ) -
                  mobileLayout.cardHeight / 2;

                return (
                  <BracketMatchCard
                    key={`mobile-${match.id}`}
                    match={match}
                    roundLabel={mobileSelectedColumn.label}
                    matchNumber={matchIndex + 1}
                    selectedPareja={parejaResaltada}
                    onSelectPareja={handleParejaSelection}
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

export default Bracket;
