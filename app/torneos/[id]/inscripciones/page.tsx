import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicTorneoInscripciones } from "@/actions/torneos-public";

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TableSection({
  title,
  rows,
  emptyText,
}: {
  title: string;
  rows: Array<{
    id: number;
    parejaNombre: string;
    createdAt: string;
  }>;
  emptyText: string;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-deep-black/10 bg-white">
      <div className="border-b border-deep-black/10 bg-surface-soft px-4 py-3">
        <h2 className="text-lg font-semibold text-deep-black">{title}</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-white text-deep-black/70">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">#</th>
              <th className="px-3 py-2 text-left font-semibold">Pareja</th>
              <th className="px-3 py-2 text-left font-semibold">
                Fecha de inscripcion
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-3 py-4 text-center text-deep-black/65"
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr
                  key={row.id}
                  className={`transition hover:bg-padel-green/10 ${
                    index % 2 === 0 ? "bg-white" : "bg-surface-soft/50"
                  }`}
                >
                  <td className="px-3 py-2 font-semibold text-deep-black">
                    {index + 1}
                  </td>
                  <td className="px-3 py-2 text-deep-black">
                    {row.parejaNombre}
                  </td>
                  <td className="px-3 py-2 text-deep-black/80">
                    {formatDateTime(row.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}

export default async function TorneoPublicInscripcionesPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { params } = props;
  const { id } = await params;

  const torneoId = Number(id);
  if (!Number.isInteger(torneoId) || torneoId <= 0) {
    notFound();
  }

  const data = await getPublicTorneoInscripciones(torneoId);
  if (!data) {
    notFound();
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
      <div className="overflow-hidden rounded-3xl border border-deep-black/10 bg-white shadow-sm">
        <div className="border-b border-deep-black/10 bg-gradient-to-r from-padel-green/15 via-white to-energy-orange/15 px-5 py-6 sm:px-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-deep-black/60">
            Inscripciones
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-deep-black sm:text-4xl">
            {data.torneo.nombre}
          </h1>
          <p className="mt-1 text-sm text-deep-black/70">
            {data.torneo.eventoNombre} - {data.torneo.complejoNombre} (
            {data.torneo.complejoCiudad}, {data.torneo.complejoProvincia})
          </p>

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-surface-soft px-3 py-1 text-deep-black/80">
              Cupo: {data.torneo.inscriptosCount}/{data.torneo.capacidad}
            </span>
            <span className="rounded-full bg-surface-soft px-3 py-1 text-deep-black/80">
              Suplentes: {data.torneo.suplentesCount}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/torneos"
              className="inline-flex rounded-full border border-deep-black/20 bg-white px-4 py-2 text-sm font-semibold text-deep-black transition hover:bg-surface-soft"
            >
              Volver a torneos
            </Link>
            <Link
              href={`/torneos/${torneoId}`}
              className="inline-flex rounded-full bg-deep-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-deep-black/90"
            >
              Ver detalle del torneo
            </Link>
          </div>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-7 sm:py-7">
          <TableSection
            title="Parejas inscriptas"
            rows={data.inscriptos}
            emptyText="No hay parejas inscriptas aun."
          />
          <TableSection
            title="Parejas suplentes"
            rows={data.suplentes}
            emptyText="No hay parejas suplentes registradas."
          />
        </div>
      </div>
    </section>
  );
}
