"use client";

import { useRouter } from "next/navigation";
import type { PublicTorneoItem } from "@/actions/torneos-public";

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

function statusLabel(status: PublicTorneoItem["status"]) {
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

function statusClasses(status: PublicTorneoItem["status"]) {
  switch (status) {
    case "IN_PROGRESS":
      return "bg-energy-orange/20 text-energy-orange";
    case "PUBLISHED":
      return "bg-padel-green/20 text-padel-green";
    case "FINISHED":
      return "bg-deep-black/15 text-deep-black";
    case "ARCHIVED":
      return "bg-deep-black/10 text-deep-black/70";
    case "DRAFT":
    default:
      return "bg-surface-soft text-deep-black/70";
  }
}

function categoriaLabel(torneo: PublicTorneoItem) {
  switch (torneo.categoriaRegla) {
    case "MAYOR_IGUAL":
      return `Categoria ${torneo.categoriaN}+`;
    case "MENOR_IGUAL":
      return `Categoria ${torneo.categoriaN}-`;
    case "IGUAL":
      return `Categoria ${torneo.categoriaN}`;
    case "SUMA":
      return `Suma categorias = ${torneo.categoriaN}`;
    case "LIBRE":
    default:
      return "Libre";
  }
}

export default function TorneoCard({
  torneo,
  canShowInscription,
}: {
  torneo: PublicTorneoItem;
  canShowInscription: boolean;
}) {
  const router = useRouter();

  const openDetail = () => {
    router.push(`/torneos/${torneo.id}`);
  };

  const handleInscripcion = () => {
    router.push(`/torneos/${torneo.id}/registrarse`);
  };

  const handleViewInscriptions = () => {
    router.push(`/torneos/${torneo.id}/inscripciones`);
  };

  return (
    <article
      className="group cursor-pointer overflow-hidden rounded-3xl border border-deep-black/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(28,37,38,0.12)]"
      role="button"
      tabIndex={0}
      onClick={openDetail}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openDetail();
        }
      }}
      aria-label={`Ver detalle del torneo ${torneo.nombre}`}
    >
      <div className="flex flex-col md:flex-row">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="relative overflow-hidden border-b border-deep-black/10 bg-gradient-to-r from-padel-green/15 via-white to-energy-orange/15 px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-deep-black/60">
                  {torneo.complejoNombre} - {torneo.complejoCiudad},{" "}
                  {torneo.complejoProvincia}
                </p>
                <h3 className="mt-2 text-xl font-semibold leading-tight text-deep-black">
                  {torneo.nombre}
                </h3>
                <p className="mt-1 text-sm text-deep-black/70">
                  {torneo.eventoNombre}
                </p>
              </div>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(
                  torneo.status,
                )}`}
              >
                {statusLabel(torneo.status)}
              </span>
            </div>
          </div>

          <div className="space-y-4 px-5 py-4">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-surface-soft px-3 py-1 text-xs font-semibold text-deep-black/80">
                Sexo: {torneo.sexo}
              </span>
              <span className="rounded-full bg-surface-soft px-3 py-1 text-xs font-semibold text-deep-black/80">
                {categoriaLabel(torneo)}
              </span>
              <span className="rounded-full bg-surface-soft px-3 py-1 text-xs font-semibold text-deep-black/80">
                Cupo: {torneo.capacidad} parejas
              </span>
              {torneo.valorInsc && (
                <span className="rounded-full bg-energy-orange/15 px-3 py-1 text-xs font-semibold text-energy-orange">
                  Inscripcion: {torneo.valorInsc}
                </span>
              )}
            </div>

            {torneo.comentario && (
              <p className="text-sm leading-relaxed text-deep-black/75">
                {torneo.comentario}
              </p>
            )}

            <div className="grid gap-2 text-sm text-deep-black/75">
              <p>
                <span className="font-semibold text-deep-black">Inicio:</span>{" "}
                {formatDateTime(torneo.inicio)}
              </p>
              <p>
                <span className="font-semibold text-deep-black">Fin:</span>{" "}
                {formatDateTime(torneo.fin)}
              </p>
            </div>

            <div className="pt-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                {canShowInscription ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleInscripcion();
                    }}
                    className="w-full rounded-full bg-padel-green px-4 py-2.5 text-sm font-semibold text-deep-black transition hover:brightness-95 sm:flex-1"
                  >
                    Inscribirme
                  </button>
                ) : (
                  <p className="w-full rounded-xl border border-deep-black/10 bg-surface-soft px-3 py-2 text-xs text-deep-black/70 sm:flex-1">
                    {torneo.isAlreadyRegistered
                      ? torneo.isAlreadyWaitlist
                        ? "Ya estas en lista de suplentes."
                        : "Ya estas inscripto."
                      : torneo.motivoNoInscripcion ||
                        "No disponible para inscripcion"}
                  </p>
                )}

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleViewInscriptions();
                  }}
                  className="w-full rounded-full border border-deep-black/20 bg-white px-4 py-2.5 text-sm font-semibold text-deep-black transition hover:bg-surface-soft sm:w-auto"
                >
                  Ver inscripciones
                </button>
              </div>
            </div>
          </div>
        </div>

        {torneo.imagenUrl && (
          <div className="relative h-48 w-full shrink-0 overflow-hidden border-t border-deep-black/10 bg-surface-soft md:h-auto md:w-56 md:border-l md:border-t-0">
            <img
              src={torneo.imagenUrl}
              alt={`Imagen del torneo ${torneo.nombre}`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        )}
      </div>
    </article>
  );
}
