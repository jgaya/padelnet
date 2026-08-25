import Link from "next/link";
import {
  getHomeSummary,
  type HomePartidoItem,
  type HomeTorneoItem,
} from "@/actions/home";

export const dynamic = "force-dynamic";

function formatDateTime(value: string | null) {
  if (!value) return "Sin horario";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin horario";

  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatTime(value: string | null) {
  if (!value) return "--:--";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";

  return date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function categoriaLabel(torneo: HomeTorneoItem) {
  switch (torneo.categoriaRegla) {
    case "MAYOR_IGUAL":
      return `Categoria ${torneo.categoriaN}+`;
    case "MENOR_IGUAL":
      return `Categoria ${torneo.categoriaN}-`;
    case "IGUAL":
      return `Categoria ${torneo.categoriaN}`;
    case "SUMA":
      return `Suma ${torneo.categoriaN}`;
    case "LIBRE":
    default:
      return "Categoria libre";
  }
}

function partidoStatusLabel(status: HomePartidoItem["status"]) {
  return status === "IN_PROGRESS" ? "En juego" : "Programado";
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-content/20 bg-surface-soft px-5 py-8 text-center text-sm text-content/70">
      {children}
    </div>
  );
}

export default async function Home() {
  const { stats, proximosPartidos, proximosTorneos } = await getHomeSummary();

  const statCards = [
    { label: "Partidos programados", value: stats.partidosProgramados },
    { label: "Torneos abiertos", value: stats.torneosAbiertos },
    { label: "Jugadores registrados", value: stats.jugadoresRegistrados },
    { label: "Clubes activos", value: stats.clubesActivos },
  ];

  return (
    <section
      id="inicio"
      className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8"
    >
      {/* Panel `ink`: es oscuro a proposito y no se da vuelta con el tema. */}
      <div className="overflow-hidden rounded-3xl bg-ink p-5 text-on-ink shadow-[var(--shadow-lg)] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-padel-green">
          Comunidad oficial
        </p>
        <h1 className="mt-3 max-w-xl text-3xl font-semibold leading-tight sm:text-4xl">
          Tu red de padel en un solo lugar.
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-on-ink/80 sm:text-base">
          Organiza partidos, encuentra jugadores por nivel y segui el ranking de
          tu club.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/torneos"
            className="rounded-full bg-padel-green px-5 py-3 text-sm font-semibold text-on-brand transition hover:brightness-95"
          >
            Ver torneos publicos
          </Link>
          <Link
            href="/complejos"
            className="rounded-full border border-on-ink/30 px-5 py-3 text-sm font-semibold text-on-ink transition hover:bg-on-ink/10"
          >
            Ver clubes
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((item) => (
          <article
            key={item.label}
            className="rounded-2xl border border-content/10 bg-surface p-4 shadow-sm"
          >
            <p className="text-xs uppercase tracking-[0.16em] text-content/60">
              {item.label}
            </p>
            <p className="mt-2 text-3xl font-bold text-content">
              {item.value}
            </p>
          </article>
        ))}
      </div>

      <div
        id="partidos"
        className="mt-6 rounded-2xl border border-content/10 bg-surface p-4 sm:p-6"
      >
        <h2 className="text-lg font-semibold text-content">
          Proximos partidos
        </h2>
        <div className="mt-4 space-y-3">
          {proximosPartidos.length === 0 ? (
            <EmptyState>
              No hay partidos programados por el momento. Cuando los clubes
              publiquen la grilla de sus torneos, los vas a ver aca.
            </EmptyState>
          ) : (
            proximosPartidos.map((partido) => (
              <article
                key={partido.id}
                className="flex flex-col gap-2 rounded-xl bg-surface-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-content">
                    {partido.pareja1Nombre} vs {partido.pareja2Nombre}
                  </p>
                  <p className="truncate text-xs text-content/70">
                    {partido.torneoNombre} - {partido.complejoNombre} -{" "}
                    {partido.canchaLabel}
                  </p>
                  <p className="text-xs text-content/60">
                    {formatDateTime(partido.scheduledAt)} -{" "}
                    {partidoStatusLabel(partido.status)}
                  </p>
                </div>
                <span className="shrink-0 self-start rounded-full bg-surface px-3 py-1 text-sm font-semibold text-energy-orange sm:self-auto">
                  {formatTime(partido.scheduledAt)}
                </span>
              </article>
            ))
          )}
        </div>
      </div>

      <div
        id="torneos"
        className="mt-6 rounded-2xl border border-content/10 bg-surface p-4 sm:p-6"
      >
        <h2 className="text-lg font-semibold text-content">
          Torneos para todos los jugadores
        </h2>
        <p className="mt-2 text-sm text-content/70">
          Explora los torneos publicados, revisa reglas de inscripción por sexo
          y categoría, y anotate si cumplís condiciones.
        </p>

        <div className="mt-4 space-y-3">
          {proximosTorneos.length === 0 ? (
            <EmptyState>
              Todavia no hay torneos publicados. Volve pronto o segui a tu club
              para enterarte de las novedades.
            </EmptyState>
          ) : (
            proximosTorneos.map((torneo) => (
              <Link
                key={torneo.id}
                href={`/torneos/${torneo.id}`}
                className="flex flex-col gap-2 rounded-xl bg-surface-soft px-4 py-3 transition hover:bg-padel-green/10 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-content">
                    {torneo.nombre}
                  </p>
                  <p className="truncate text-xs text-content/70">
                    {torneo.complejoNombre} - {torneo.complejoCiudad},{" "}
                    {torneo.complejoProvincia}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-surface px-3 py-1 text-content/80">
                    {torneo.sexo}
                  </span>
                  <span className="rounded-full bg-surface px-3 py-1 text-content/80">
                    {categoriaLabel(torneo)}
                  </span>
                  <span className="rounded-full bg-surface px-3 py-1 text-energy-orange">
                    {torneo.inicio
                      ? formatDateTime(torneo.inicio)
                      : "Sin fecha"}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>

        <div className="mt-4">
          <Link
            href="/torneos"
            className="inline-flex rounded-full bg-energy-orange px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-95"
          >
            Ir a torneos
          </Link>
        </div>
      </div>
    </section>
  );
}
