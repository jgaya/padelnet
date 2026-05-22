import type { PublicComplejoItem } from "@/actions/complejos";

type ComplejosPublicPageProps = {
  complejos: PublicComplejoItem[];
};

function buildMapsQuery(complejo: PublicComplejoItem) {
  const pieces = [
    complejo.name,
    complejo.direccion,
    complejo.ciudad,
    complejo.provincia,
    complejo.pais,
  ]
    .map((piece) => piece?.trim())
    .filter((piece): piece is string => Boolean(piece));

  return pieces.join(", ");
}

function mapUrls(query: string) {
  const encoded = encodeURIComponent(query);
  return {
    embed: `https://www.google.com/maps?q=${encoded}&output=embed`,
    external: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
  };
}

function phoneHref(phone: string | null) {
  if (!phone) {
    return null;
  }

  const normalized = phone.replace(/[^\d+]/g, "");
  if (!normalized) {
    return null;
  }

  return `tel:${normalized}`;
}

export default function ComplejosPublicPage({
  complejos,
}: ComplejosPublicPageProps) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
      <div className="overflow-hidden rounded-3xl border border-deep-black/10 bg-white shadow-sm">
        <div className="border-b border-deep-black/10 bg-gradient-to-r from-padel-green/15 via-white to-energy-orange/15 px-5 py-6 sm:px-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-deep-black/60">
            Complejos
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-deep-black sm:text-4xl">
            Clubes y complejos de padel
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-deep-black/75 sm:text-base">
            Explora complejos activos con sus datos de contacto y ubicacion en
            Google Maps.
          </p>
        </div>

        <div className="px-5 py-5 sm:px-7 sm:py-7">
          {complejos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-deep-black/20 bg-surface-soft px-5 py-8 text-center text-sm text-deep-black/70">
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
                    className="overflow-hidden rounded-3xl border border-deep-black/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_18px_32px_rgba(28,37,38,0.14)]"
                  >
                    <div className="border-b border-deep-black/10 bg-gradient-to-r from-surface-soft via-white to-surface-soft px-5 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h2 className="text-2xl font-semibold leading-tight text-deep-black">
                            {complejo.name}
                          </h2>
                          <p className="mt-1 text-sm text-deep-black/70">
                            {complejo.ciudad}, {complejo.provincia}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-padel-green/15 px-3 py-1 text-xs font-semibold text-deep-black">
                            {complejo.canchasCount} canchas
                          </span>
                          <span className="rounded-full bg-energy-orange/15 px-3 py-1 text-xs font-semibold text-deep-black">
                            {complejo.eventosCount} eventos
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 px-5 py-4">
                      <div className="rounded-2xl bg-surface-soft/75 px-4 py-3 text-sm text-deep-black/80">
                        <p className="font-semibold text-deep-black">Direccion</p>
                        <p className="mt-1">
                          {complejo.direccion
                            ? `${complejo.direccion}, ${complejo.ciudad}, ${complejo.provincia}`
                            : `${complejo.ciudad}, ${complejo.provincia}`}
                        </p>
                      </div>

                      <div className="grid gap-3 text-sm sm:grid-cols-2">
                        <div className="rounded-2xl border border-deep-black/10 bg-white px-4 py-3">
                          <p className="font-semibold text-deep-black">Telefono</p>
                          {complejo.telefono ? (
                            telHref ? (
                              <a
                                href={telHref}
                                className="mt-1 block text-deep-black/75 transition hover:text-padel-green"
                              >
                                {complejo.telefono}
                              </a>
                            ) : (
                              <p className="mt-1 text-deep-black/75">{complejo.telefono}</p>
                            )
                          ) : (
                            <p className="mt-1 text-deep-black/45">No disponible</p>
                          )}
                        </div>

                        <div className="rounded-2xl border border-deep-black/10 bg-white px-4 py-3">
                          <p className="font-semibold text-deep-black">Email</p>
                          {complejo.email ? (
                            <a
                              href={`mailto:${complejo.email}`}
                              className="mt-1 block break-all text-deep-black/75 transition hover:text-padel-green"
                            >
                              {complejo.email}
                            </a>
                          ) : (
                            <p className="mt-1 text-deep-black/45">No disponible</p>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-3 text-sm sm:grid-cols-2">
                        <div className="rounded-2xl border border-deep-black/10 bg-white px-4 py-3">
                          <p className="font-semibold text-deep-black">Pais</p>
                          <p className="mt-1 text-deep-black/75">{complejo.pais}</p>
                        </div>
                        <div className="rounded-2xl border border-deep-black/10 bg-white px-4 py-3">
                          <p className="font-semibold text-deep-black">Zona horaria</p>
                          <p className="mt-1 break-all text-deep-black/75">{complejo.timezone}</p>
                        </div>
                      </div>

                      <div className="overflow-hidden rounded-2xl border border-deep-black/10">
                        <iframe
                          title={`Mapa de ${complejo.name}`}
                          src={urls.embed}
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          className="h-56 w-full border-0"
                        />
                      </div>

                      <a
                        href={urls.external}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex rounded-full border border-deep-black/20 bg-white px-4 py-2 text-sm font-semibold text-deep-black transition hover:bg-surface-soft"
                      >
                        Abrir en Google Maps
                      </a>
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
