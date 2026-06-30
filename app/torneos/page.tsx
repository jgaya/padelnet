import Link from "next/link";
import { listPublicTorneos } from "@/actions/torneos-public";
import TorneoCard from "@/app/torneos/components/TorneoCard";

export default async function TorneosPublicPage() {
  const data = await listPublicTorneos();

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
      <div className="overflow-hidden rounded-3xl border border-deep-black/10 bg-white shadow-sm">
        <div className="border-b border-deep-black/10 bg-gradient-to-r from-padel-green/15 via-white to-energy-orange/15 px-5 py-6 sm:px-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-deep-black/60">
            Torneos Publicos
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-deep-black sm:text-4xl">
            Encontrá tu próximo torneo
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-deep-black/75 sm:text-base">
            Lista pública de torneos publicados con su estado actual. Si estás
            logueado como jugador y cumplís reglas de sexo/categoría, vas a ver
            el botón de inscripción.
          </p>

          {!data.viewer.isLoggedIn && (
            <div className="mt-4">
              <Link
                href="/login"
                className="inline-flex rounded-full bg-deep-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-deep-black/90"
              >
                Iniciar sesión
              </Link>
            </div>
          )}
        </div>

        <div className="px-5 py-5 sm:px-7 sm:py-7">
          {data.items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-deep-black/20 bg-surface-soft px-5 py-8 text-center text-sm text-deep-black/70">
              No hay torneos públicos disponibles en este momento.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data.items.map((torneo) => (
                <TorneoCard
                  key={torneo.id}
                  torneo={torneo}
                  canShowInscription={
                    data.viewer.isJugador && torneo.canInscribirse
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
