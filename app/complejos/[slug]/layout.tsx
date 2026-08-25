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
        <div className="overflow-hidden rounded-3xl border border-content/10 bg-gradient-to-r from-padel-green/15 via-surface to-energy-orange/15 px-5 py-6 shadow-sm sm:px-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-content/60">
            Complejo
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-content sm:text-4xl">
            {complejo.name}
          </h1>
          <p className="mt-1 text-sm text-content/70">
            {complejo.direccion ? `${complejo.direccion}, ` : ""}
            {complejo.ciudad}, {complejo.provincia}
          </p>

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-surface-soft px-3 py-1 text-content/80">
              {complejo.canchasCount} canchas
            </span>
            <span className="rounded-full bg-surface-soft px-3 py-1 text-content/80">
              {complejo.eventosCount} eventos
            </span>
            <span className="rounded-full bg-surface-soft px-3 py-1 text-content/80">
              {complejo.jugadoresCount} jugadores
            </span>
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
