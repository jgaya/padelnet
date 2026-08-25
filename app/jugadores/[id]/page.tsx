import { notFound } from "next/navigation";

import { getPerfilPublicoJugador } from "@/actions/jugadores-public";
import EstadisticasJugador from "@/components/jugador/EstadisticasJugador";

export const dynamic = "force-dynamic";

export default async function JugadorPublicoPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const perfil = await getPerfilPublicoJugador(Number(id));

  if (!perfil) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-content/60">
        Jugador
      </p>
      <h1 className="mt-1 mb-5 text-3xl font-semibold text-content sm:text-4xl">
        Estadisticas
      </h1>

      <EstadisticasJugador perfil={perfil} />
    </div>
  );
}
