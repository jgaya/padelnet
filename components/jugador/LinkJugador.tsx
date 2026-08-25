import Link from "next/link";
import type { ReactNode } from "react";

type LinkJugadorProps = {
  jugadorId: number;
  children: ReactNode;
};

/**
 * Link al perfil publico de un jugador.
 *
 * Existe para que los listados que muestran nombres no repitan cinco veces la
 * misma ruta y el mismo estilo. Si el id no es valido (una pareja con un lugar
 * todavia sin asignar) muestra el texto sin link, no un link roto.
 */
export default function LinkJugador({ jugadorId, children }: LinkJugadorProps) {
  if (!Number.isInteger(jugadorId) || jugadorId <= 0) {
    return <>{children}</>;
  }

  return (
    <Link
      href={`/jugadores/${jugadorId}`}
      className="font-medium text-content underline decoration-padel-green decoration-2 underline-offset-2 transition hover:text-padel-green"
    >
      {children}
    </Link>
  );
}
