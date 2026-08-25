import Link from "next/link";

import type { PublicComplejoItem } from "@/actions/complejos";
import {
  buildMapsQuery,
  mapUrls,
  phoneHref,
} from "@/app/complejos/components/mapUtils";

type ComplejosPublicPageProps = {
  complejos: PublicComplejoItem[];
};

export default function ComplejosPublicPage({
  complejos,
}: ComplejosPublicPageProps) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
      <div className="overflow-hidden rounded-3xl border border-content/10 bg-surface shadow-sm">
        <div className="border-b border-content/10 bg-gradient-to-r from-padel-green/15 via-surface to-energy-orange/15 px-5 py-6 sm:px-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-content/60">
            Complejos
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-content sm:text-4xl">
            Clubes y complejos de padel
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-content/75 sm:text-base">
            Explora complejos activos con sus datos de contacto y ubicacion en
            Google Maps.
          </p>
        </div>

        <div className="px-5 py-5 sm:px-7 sm:py-7">
          {complejos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-content/20 bg-surface-soft px-5 py-8 text-center text-sm text-content/70">
              No hay complejos disponibles en este momento.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {complejos.map((complejo) => {
                const query = buildMapsQuery(complejo);
                const urls = mapUrls(query);
                const telHref = phoneHref(complejo.telefono);

                return (
                  <article
                    key={complejo.id}
                    className="overflow-hidden rounded-3xl border border-content/10 bg-surface shadow-sm transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]"
                  >
                    <div className="border-b border-content/10 bg-gradient-to-r from-surface-soft via-surface to-surface-soft px-5 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h2 className="text-2xl font-semibold leading-tight text-content">
                            <Link
                              href={`/complejos/${complejo.slug}`}
                              className="transition hover:text-padel-green"
                            >
                              {complejo.name}
                            </Link>
                          </h2>
                          <p className="mt-1 text-sm text-content/70">
                            {complejo.ciudad}, {complejo.provincia}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-padel-green/15 px-3 py-1 text-xs font-semibold text-content">
                            {complejo.canchasCount} canchas
                          </span>
                          <span className="rounded-full bg-energy-orange/15 px-3 py-1 text-xs font-semibold text-content">
                            {complejo.eventosCount} eventos
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 px-5 py-4">
                      <div className="rounded-2xl bg-surface-soft/75 px-4 py-3 text-sm text-content/80">
                        <p className="font-semibold text-content">
                          Direccion
                        </p>
                        <p className="mt-1">
                          {complejo.direccion
                            ? `${complejo.direccion}, ${complejo.ciudad}, ${complejo.provincia}`
                            : `${complejo.ciudad}, ${complejo.provincia}`}
                        </p>
                      </div>

                      <div className="grid gap-3 text-sm sm:grid-cols-2">
                        <div className="rounded-2xl border border-content/10 bg-surface px-4 py-3">
                          <p className="font-semibold text-content">
                            Telefono
                          </p>
                          {complejo.telefono ? (
                            telHref ? (
                              <a
                                href={telHref}
                                className="mt-1 block text-content/75 transition hover:text-padel-green"
                              >
                                {complejo.telefono}
                              </a>
                            ) : (
                              <p className="mt-1 text-content/75">
                                {complejo.telefono}
                              </p>
                            )
                          ) : (
                            <p className="mt-1 text-content/45">
                              No disponible
                            </p>
                          )}
                        </div>

                        <div className="rounded-2xl border border-content/10 bg-surface px-4 py-3">
                          <p className="font-semibold text-content">Email</p>
                          {complejo.email ? (
                            <a
                              href={`mailto:${complejo.email}`}
                              className="mt-1 block break-all text-content/75 transition hover:text-padel-green"
                            >
                              {complejo.email}
                            </a>
                          ) : (
                            <p className="mt-1 text-content/45">
                              No disponible
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-3 text-sm sm:grid-cols-2">
                        <div className="rounded-2xl border border-content/10 bg-surface px-4 py-3">
                          <p className="font-semibold text-content">Pais</p>
                          <p className="mt-1 text-content/75">
                            {complejo.pais}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-content/10 bg-surface px-4 py-3">
                          <p className="font-semibold text-content">
                            Zona horaria
                          </p>
                          <p className="mt-1 break-all text-content/75">
                            {complejo.timezone}
                          </p>
                        </div>
                      </div>

                      <div className="overflow-hidden rounded-2xl border border-content/10">
                        <iframe
                          title={`Mapa de ${complejo.name}`}
                          src={urls.embed}
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          className="h-56 w-full border-0"
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/complejos/${complejo.slug}`}
                          className="inline-flex rounded-full bg-padel-green px-4 py-2 text-sm font-semibold text-on-brand transition hover:brightness-95"
                        >
                          Ver complejo
                        </Link>
                        <a
                          href={urls.external}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex rounded-full border border-content/20 bg-surface px-4 py-2 text-sm font-semibold text-content transition hover:bg-surface-soft"
                        >
                          Abrir en Google Maps
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
