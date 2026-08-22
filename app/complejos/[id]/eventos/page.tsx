import Link from "next/link";

import { listPublicComplejoEventos } from "@/actions/complejos-public";
import {
  EmptyState,
  SectionCard,
} from "@/app/complejos/[id]/components/Section";
import {
  categoriaLabel,
  formatDate,
  sexoLabel,
} from "@/app/complejos/[id]/components/format";
import Badge from "@/app/components/UI/Badge";

export const dynamic = "force-dynamic";

export default async function ComplejoEventosPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const eventos = await listPublicComplejoEventos(Number(id));

  return (
    <SectionCard
      title="Eventos"
      description="Eventos publicados por el club y sus torneos abiertos."
    >
      {eventos.length === 0 ? (
        <EmptyState>
          Este complejo todavia no publico eventos. Cuando publique uno, lo vas
          a ver aca.
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {eventos.map((evento) => (
            <article
              key={evento.id}
              className="rounded-2xl border border-deep-black/10 bg-white px-4 py-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-deep-black">
                    {evento.nombre}
                  </h3>
                  <p className="mt-1 text-sm text-deep-black/70">
                    {formatDate(evento.inicio)} - {formatDate(evento.fin)}
                  </p>
                </div>
                <Badge
                  text={
                    evento.isFinished
                      ? "Finalizado"
                      : evento.isOpen
                        ? "Abierto"
                        : "Cerrado"
                  }
                  variant={
                    evento.isFinished
                      ? "muted"
                      : evento.isOpen
                        ? "success"
                        : "warning"
                  }
                  size="sm"
                  className="uppercase"
                />
              </div>

              {evento.descripcion ? (
                <p className="mt-2 text-sm text-deep-black/75">
                  {evento.descripcion}
                </p>
              ) : null}

              <div className="mt-4">
                {evento.torneos.length === 0 ? (
                  <p className="rounded-xl bg-surface-soft px-4 py-3 text-sm text-deep-black/70">
                    Este evento todavia no tiene torneos publicados.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {evento.torneos.map((torneo) => (
                      <Link
                        key={torneo.id}
                        href={`/torneos/${torneo.id}`}
                        className="flex flex-col gap-2 rounded-xl bg-surface-soft px-4 py-3 transition hover:bg-padel-green/10 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-deep-black">
                            {torneo.nombre}
                          </p>
                          <p className="text-xs text-deep-black/70">
                            {formatDate(torneo.inicio)}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2 text-xs font-semibold">
                          <span className="rounded-full bg-white px-3 py-1 text-deep-black/80">
                            {sexoLabel(torneo.sexo)}
                          </span>
                          <span className="rounded-full bg-white px-3 py-1 text-deep-black/80">
                            {categoriaLabel(torneo)}
                          </span>
                          <span className="rounded-full bg-white px-3 py-1 text-energy-orange">
                            {torneo.inscriptos}/{torneo.capacidad} parejas
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
