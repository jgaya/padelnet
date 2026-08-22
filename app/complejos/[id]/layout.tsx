import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { getPublicComplejo } from "@/actions/complejos-public";
import ComplejoTabs from "@/app/complejos/[id]/components/ComplejoTabs";

export default async function ComplejoPublicLayout(props: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const complejoId = Number(id);
  const complejo = await getPublicComplejo(complejoId);

  if (!complejo) {
    notFound();
  }

  return (
    <>
      <section className="mx-auto w-full max-w-6xl px-4 pt-5 sm:px-6 sm:pt-8">
        <div className="overflow-hidden rounded-3xl border border-deep-black/10 bg-gradient-to-r from-padel-green/15 via-white to-energy-orange/15 px-5 py-6 shadow-sm sm:px-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-deep-black/60">
            Complejo
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-deep-black sm:text-4xl">
            {complejo.name}
          </h1>
          <p className="mt-1 text-sm text-deep-black/70">
            {complejo.direccion ? `${complejo.direccion}, ` : ""}
            {complejo.ciudad}, {complejo.provincia}
          </p>

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-surface-soft px-3 py-1 text-deep-black/80">
              {complejo.canchasCount} canchas
            </span>
            <span className="rounded-full bg-surface-soft px-3 py-1 text-deep-black/80">
              {complejo.eventosCount} eventos
            </span>
            <span className="rounded-full bg-surface-soft px-3 py-1 text-deep-black/80">
              {complejo.jugadoresCount} jugadores
            </span>
          </div>
        </div>
      </section>

      <div className="mt-5">
        <ComplejoTabs complejoId={complejo.id} />
      </div>

      <section className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
        {props.children}
      </section>
    </>
  );
}
