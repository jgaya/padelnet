"use client";

import type { CSSProperties } from "react";
import type { PublicTorneoDetail } from "@/actions/torneos-public";

type TorneoMatch = PublicTorneoDetail["llave"][number]["matches"][number];

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

function matchStatusLabel(
  status:
    | "PENDING"
    | "SCHEDULED"
    | "IN_PROGRESS"
    | "FINISHED"
    | "WALKOVER"
    | "CANCELLED",
) {
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

function matchStatusBadgeClass(
  status:
    | "PENDING"
    | "SCHEDULED"
    | "IN_PROGRESS"
    | "FINISHED"
    | "WALKOVER"
    | "CANCELLED",
) {
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

type ParsedSet = {
  pareja1: number;
  pareja2: number;
};

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

export default function TorneoMatchCard({
  match,
  roundLabel,
  matchNumber,
  className,
  style,
}: {
  match: TorneoMatch;
  roundLabel: string;
  matchNumber: number;
  className?: string;
  style?: CSSProperties;
}) {
  const sets = parseScoreSets(match.score);
  const winner = resolveWinner(sets);
  const showFallbackScore =
    sets.length === 0 && match.score && match.score !== "-";

  const cardClassName =
    `overflow-hidden rounded-xl border border-content/10 bg-surface p-3 shadow-sm ${className ?? ""}`.trim();

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
        <div className="flex items-center justify-between gap-2">
          <p
            className={`truncate text-sm text-content ${winner === 1 ? "font-bold" : "font-medium"}`}
          >
            {match.pareja1}
          </p>
          <div className="flex items-center gap-1 text-xs font-semibold tabular-nums text-content/80">
            {sets.length > 0 ? (
              sets.map((set, index) => (
                <span
                  key={`p1-${match.id}-${index}`}
                  className="w-4 text-right"
                >
                  {set.pareja1}
                </span>
              ))
            ) : (
              <span className="w-4 text-right">-</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p
            className={`truncate text-sm text-content ${winner === 2 ? "font-bold" : "font-medium"}`}
          >
            {match.pareja2}
          </p>
          <div className="flex items-center gap-1 text-xs font-semibold tabular-nums text-content/80">
            {sets.length > 0 ? (
              sets.map((set, index) => (
                <span
                  key={`p2-${match.id}-${index}`}
                  className="w-4 text-right"
                >
                  {set.pareja2}
                </span>
              ))
            ) : (
              <span className="w-4 text-right">-</span>
            )}
          </div>
        </div>
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
