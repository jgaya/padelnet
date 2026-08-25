import { Suspense } from "react";

import VersusJugadores from "@/components/jugador/VersusJugadores";

export const dynamic = "force-dynamic";

export default function VersusJugadoresPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-content/60">
        Jugadores
      </p>
      <h1 className="mt-1 mb-5 text-3xl font-semibold text-content sm:text-4xl">
        Comparativa
      </h1>

      {/* VersusJugadores lee ?left= y ?right= con useSearchParams, que necesita
          un limite de Suspense para poder prerenderizar el resto. */}
      <Suspense fallback={null}>
        <VersusJugadores />
      </Suspense>
    </div>
  );
}
