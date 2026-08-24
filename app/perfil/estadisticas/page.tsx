import { redirect } from "next/navigation";

import { getPerfilPublicoJugador } from "@/actions/jugadores-public";
import EstadisticasJugador from "@/components/jugador/EstadisticasJugador";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PerfilEstadisticasPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // Es la misma vista que ve un tercero en /jugadores/[id]: asi lo que uno mira
  // de si mismo es exactamente lo que se publica.
  const perfil = await getPerfilPublicoJugador(session.userId);

  if (!perfil) {
    redirect("/login");
  }

  return <EstadisticasJugador perfil={perfil} />;
}
