"use client";

import { useMemo, useState } from "react";
import type { PublicTorneoDetail } from "@/actions/torneos-public";
import Bracket from "@/components/Bracket";
import TorneoZonasTablas from "@/components/TorneoZonasTablas";
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

export default function TorneoDetailTabs({
  detail,
}: {
  detail: PublicTorneoDetail;
}) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("grupos");

  const locationLabel = useMemo(
    () =>
      `${detail.complejoNombre} - ${detail.complejoCiudad}, ${detail.complejoProvincia}`,
    [detail.complejoCiudad, detail.complejoNombre, detail.complejoProvincia],
  );

  const hayLlave = detail.llave.some((column) => column.matches.length > 0);

  return (
    <div className="space-y-5">
      <header className="rounded-3xl border border-content/10 bg-surface p-5 shadow-sm sm:p-7">
        <div className="flex justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-content/60">
            {locationLabel}
          </p>

          <Link
            href="/torneos"
            className="inline-flex rounded-full border border-content/15 bg-surface px-4 py-2 text-sm font-semibold text-content transition hover:bg-surface-soft"
          >
            Volver a torneos
          </Link>
        </div>
        <h1 className="mt-2 text-3xl font-semibold text-content sm:text-4xl">
          {detail.nombre}
        </h1>
        <p className="mt-1 text-sm text-content/70">
          Evento: {detail.eventoNombre}
        </p>
        {detail.comentario ? (
          <p className="mt-3 text-sm text-content/75">{detail.comentario}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-padel-green/20 px-3 py-1 text-padel-green">
            {torneoStatusLabel(detail.status)}
          </span>
          <span className="rounded-full bg-surface-soft px-3 py-1 text-content/80">
            Sexo: {detail.sexo}
          </span>
          <span className="rounded-full bg-surface-soft px-3 py-1 text-content/80">
            Capacidad: {detail.capacidad} parejas
          </span>
          <span className="rounded-full bg-surface-soft px-3 py-1 text-content/80">
            Inicio: {formatDateTime(detail.inicio)}
          </span>
        </div>
      </header>

      <div className="rounded-3xl border border-content/10 bg-surface shadow-sm">
        <div className="flex gap-2 border-b border-content/10 px-4 pt-4 sm:px-6">
          <button
            type="button"
            onClick={() => setActiveTab("grupos")}
            className={`rounded-t-2xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === "grupos"
                ? "bg-padel-green/15 text-padel-green"
                : "text-content/70 hover:bg-surface-soft"
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
                : "text-content/70 hover:bg-surface-soft"
            }`}
          >
            Llave
          </button>
        </div>

        <div className="p-1 sm:p-4">
          {activeTab === "grupos" ? (
            <TorneoZonasTablas
              grupos={detail.grupos}
              emptyMessage="Todavia no hay zonas publicadas. Se publican cuando el complejo las arma."
            />
          ) : (
            <div className="space-y-3">
              {hayLlave ? (
                <Bracket columns={detail.llave} />
              ) : (
                <p className="rounded-2xl border border-content/10 bg-surface-soft px-4 py-6 text-center text-sm text-content/70">
                  El cuadro se publica cuando terminen los partidos de zona.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
