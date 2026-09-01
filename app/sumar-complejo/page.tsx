import type { Metadata } from "next";

import SolicitudComplejoForm from "./components/SolicitudComplejoForm";

export const metadata: Metadata = {
  title: "Suma tu complejo | PadelNet",
  description:
    "Sos dueño o encargado de un complejo de padel? Contanos y un administrador se pone en contacto para sumarte a PadelNet.",
};

export default function SumarComplejoPage() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
      <div className="grid gap-5 md:grid-cols-2">
        {/* Panel `ink`: es oscuro a proposito y no se da vuelta con el tema. */}
        <article className="overflow-hidden rounded-3xl bg-ink p-5 text-on-ink shadow-[var(--shadow-lg)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-padel-green">
            Para clubes
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
            Suma tu complejo a PadelNet.
          </h1>
          <p className="mt-3 text-sm text-on-ink/80 sm:text-base">
            Dejanos tus datos y un administrador se pone en contacto para
            configurar tu club, tus canchas y tus torneos.
          </p>

          <ul className="mt-6 space-y-2 text-sm text-on-ink/80">
            <li>Inscripciones online y listados listos para imprimir</li>
            <li>Grilla de canchas y horarios de cada fecha</li>
            <li>Ranking y categorias de tus jugadores</li>
            <li>Avisos automaticos de partidos y cambios de horario</li>
          </ul>
        </article>

        <SolicitudComplejoForm />
      </div>
    </section>
  );
}
