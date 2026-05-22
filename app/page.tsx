import Link from "next/link";

const stats = [
  { label: "Partidos activos", value: "128" },
  { label: "Jugadores online", value: "742" },
  { label: "Clubes verificados", value: "31" },
];

const nextMatches = [
  { court: "Cancha Central", time: "18:30", level: "Intermedio" },
  { court: "Cancha Norte", time: "19:10", level: "Avanzado" },
  { court: "Cancha Sur", time: "20:00", level: "Mixto" },
];

export default function Home() {
  return (
    <section id="inicio" className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
      <div className="overflow-hidden rounded-3xl bg-deep-black p-5 text-white shadow-[0_18px_32px_rgba(28,37,38,0.2)] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-padel-green">
          Comunidad oficial
        </p>
        <h1 className="mt-3 max-w-xl text-3xl font-semibold leading-tight sm:text-4xl">
          Tu red de padel en un solo lugar.
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-white/80 sm:text-base">
          Organiza partidos, encuentra jugadores por nivel y segui el ranking de tu club.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/partidos/nuevo"
            className="rounded-full bg-padel-green px-5 py-3 text-sm font-semibold text-deep-black transition hover:brightness-95"
          >
            Crear partido
          </Link>
          <Link
            href="/torneos"
            className="rounded-full border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Ver torneos publicos
          </Link>
        </div>
      </div>

      <div id="torneos" className="mt-6 grid gap-4 sm:grid-cols-3">
        {stats.map((item) => (
          <article key={item.label} className="rounded-2xl border border-deep-black/10 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.16em] text-deep-black/60">{item.label}</p>
            <p className="mt-2 text-3xl font-bold text-deep-black">{item.value}</p>
          </article>
        ))}
      </div>

      <div id="partidos" className="mt-6 rounded-2xl border border-deep-black/10 bg-white p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-deep-black">Proximos partidos</h2>
        <div className="mt-4 space-y-3">
          {nextMatches.map((match) => (
            <article
              key={`${match.court}-${match.time}`}
              className="flex items-center justify-between rounded-xl bg-surface-soft px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-deep-black">{match.court}</p>
                <p className="text-xs text-deep-black/70">Nivel: {match.level}</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-energy-orange">
                {match.time}
              </span>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-deep-black/10 bg-white p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-deep-black">
          Torneos para todos los jugadores
        </h2>
        <p className="mt-2 text-sm text-deep-black/70">
          Explora los torneos publicados, revisa reglas de inscripción por sexo y
          categoría, y anotate si cumplís condiciones.
        </p>
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
