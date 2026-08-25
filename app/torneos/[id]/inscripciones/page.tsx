import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicTorneoInscripciones } from "@/actions/torneos-public";
import LinkJugador from "@/components/jugador/LinkJugador";

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
  torneoId,
  currentUserParejaId,
}: {
  title: string;
  rows: Array<{
    id: number;
    player1Id: number;
    player1Nombre: string;
    player2Id: number;
    player2Nombre: string;
    createdAt: string;
  }>;
  emptyText: string;
  torneoId: number;
  currentUserParejaId: number | null;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-content/10 bg-surface">
      <div className="border-b border-content/10 bg-surface-soft px-4 py-3">
        <h2 className="text-lg font-semibold text-content">{title}</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-surface text-content/70">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">#</th>
              <th className="px-3 py-2 text-left font-semibold">Pareja</th>
              <th className="px-3 py-2 text-left font-semibold">
                Fecha de inscripcion
              </th>
              <th className="px-3 py-2 text-left font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-4 text-center text-content/65"
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr
                  key={row.id}
                  className={`transition hover:bg-padel-green/10 ${
                    index % 2 === 0 ? "bg-surface" : "bg-surface-soft/50"
                  }`}
                >
                  <td className="px-3 py-2 font-semibold text-content">
                    {index + 1}
                  </td>
                  <td className="px-3 py-2 text-content">
                    <LinkJugador jugadorId={row.player1Id}>
                      {row.player1Nombre}
                    </LinkJugador>
                    {" / "}
                    <LinkJugador jugadorId={row.player2Id}>
                      {row.player2Nombre}
                    </LinkJugador>
                  </td>
                  <td className="px-3 py-2 text-content/80">
                    {formatDateTime(row.createdAt)}
                  </td>
                  <td className="px-3 py-2">
                    {row.id === currentUserParejaId ? (
                      <Link
                        href={`/torneos/${torneoId}/inscripciones/${row.id}/editar`}
                        className="inline-flex rounded-full bg-padel-green px-3 py-1 text-xs font-semibold text-on-brand transition hover:brightness-95"
                      >
                        Editar
                      </Link>
                    ) : null}
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
  searchParams: Promise<{ ok?: string }>;
}) {
  const { params, searchParams } = props;
  const { id } = await params;
  const query = await searchParams;
  const flashOk = query.ok?.trim() || "";

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
      <div className="overflow-hidden rounded-3xl border border-content/10 bg-surface shadow-sm">
        <div className="border-b border-content/10 bg-gradient-to-r from-padel-green/15 via-surface to-energy-orange/15 px-5 py-6 sm:px-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-content/60">
            Inscripciones
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-content sm:text-4xl">
            {data.torneo.nombre}
          </h1>
          <p className="mt-1 text-sm text-content/70">
            {data.torneo.eventoNombre} - {data.torneo.complejoNombre} (
            {data.torneo.complejoCiudad}, {data.torneo.complejoProvincia})
          </p>

          {flashOk ? (
            <p className="mt-3 rounded-xl border border-padel-green/25 bg-padel-green/10 px-4 py-2 text-sm text-padel-green">
              {flashOk}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-surface-soft px-3 py-1 text-content/80">
              Cupo: {data.torneo.inscriptosCount}/{data.torneo.capacidad}
            </span>
            <span className="rounded-full bg-surface-soft px-3 py-1 text-content/80">
              Suplentes: {data.torneo.suplentesCount}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/torneos"
              className="inline-flex rounded-full border border-content/20 bg-surface px-4 py-2 text-sm font-semibold text-content transition hover:bg-surface-soft"
            >
              Volver a torneos
            </Link>
            <Link
              href={`/torneos/${torneoId}`}
              className="inline-flex rounded-full bg-content px-4 py-2 text-sm font-semibold text-surface transition hover:bg-content/90"
            >
              Ver detalle del torneo
            </Link>
            <Link
              href={`/torneos/${torneoId}/registrarse`}
              className="inline-flex rounded-full bg-padel-green px-4 py-2 text-sm font-semibold text-on-brand transition hover:brightness-95"
            >
              Agregar pareja
            </Link>
          </div>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-7 sm:py-7">
          <TableSection
            title="Parejas inscriptas"
            rows={data.inscriptos}
            emptyText="No hay parejas inscriptas aun."
            torneoId={torneoId}
            currentUserParejaId={data.currentUserParejaId}
          />
          <TableSection
            title="Parejas suplentes"
            rows={data.suplentes}
            emptyText="No hay parejas suplentes registradas."
            torneoId={torneoId}
            currentUserParejaId={data.currentUserParejaId}
          />
        </div>
      </div>
    </section>
  );
}
