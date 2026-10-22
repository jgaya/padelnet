import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { getPublicComplejo } from "@/actions/complejos-public";
import ComplejoTabs from "@/app/complejos/[slug]/components/ComplejoTabs";

export default async function ComplejoPublicLayout(props: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  // El layout no redirige a la URL canonica aunque hayan entrado por id: se
  // renderiza en paralelo con la pagina y no sabe en que seccion esta, asi que
  // el redirect perderia el tramo final. De eso se ocupa cada pagina con
  // requireComplejoPublico().
  const complejo = await getPublicComplejo(slug);

  if (!complejo) {
    notFound();
  }

  return (
    <>
      <section className="mx-auto w-full max-w-6xl px-4 pt-5 sm:px-6 sm:pt-8">
        <div
          className={`relative overflow-hidden rounded-3xl border border-content/10 px-5 py-6 shadow-sm sm:px-7 ${
            complejo.bannerUrl
              ? "bg-cover bg-center"
              : "bg-gradient-to-r from-padel-green/15 via-surface to-energy-orange/15"
          }`}
          style={
            complejo.bannerUrl
              ? { backgroundImage: `url(${complejo.bannerUrl})` }
              : undefined
          }
        >
          {complejo.bannerUrl ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/75 via-black/55 to-black/40"
            />
          ) : null}
          <div className="relative z-10">
            <p
              className={`text-xs font-semibold uppercase tracking-[0.16em] ${
                complejo.bannerUrl ? "text-white/80" : "text-content/60"
              }`}
            >
              Complejo
            </p>
            <div className="mt-2 flex items-center gap-3">
              {complejo.logoUrl ? (
                <img
                  src={complejo.logoUrl}
                  alt={`Logo de ${complejo.name}`}
                  className="h-14 w-14 rounded-xl bg-surface object-contain p-1 ring-1 ring-content/10"
                />
              ) : null}
              <h1
                className={`text-3xl font-semibold sm:text-4xl ${
                  complejo.bannerUrl ? "text-white drop-shadow-sm" : "text-content"
                }`}
              >
                {complejo.name}
              </h1>
            </div>
            <p
              className={`mt-1 text-sm ${
                complejo.bannerUrl ? "text-white/85" : "text-content/70"
              }`}
            >
              {complejo.direccion ? `${complejo.direccion}, ` : ""}
              {complejo.ciudad}, {complejo.provincia}
            </p>

            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
              <span
                className={`rounded-full px-3 py-1 ${
                  complejo.bannerUrl
                    ? "border border-white/20 bg-black/45 text-white backdrop-blur-sm"
                    : "bg-surface-soft text-content/80"
                }`}
              >
                {complejo.canchasCount} canchas
              </span>
              <span
                className={`rounded-full px-3 py-1 ${
                  complejo.bannerUrl
                    ? "border border-white/20 bg-black/45 text-white backdrop-blur-sm"
                    : "bg-surface-soft text-content/80"
                }`}
              >
                {complejo.eventosCount} eventos
              </span>
              <span
                className={`rounded-full px-3 py-1 ${
                  complejo.bannerUrl
                    ? "border border-white/20 bg-black/45 text-white backdrop-blur-sm"
                    : "bg-surface-soft text-content/80"
                }`}
              >
                {complejo.jugadoresCount} jugadores
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-5">
        <ComplejoTabs complejoSlug={complejo.slug} />
      </div>

      <section className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
        {props.children}
      </section>
    </>
  );
}
