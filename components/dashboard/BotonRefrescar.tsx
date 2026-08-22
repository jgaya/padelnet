"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

/**
 * Vuelve a pedir los datos sin recargar la pagina entera.
 *
 * Las dos paginas son dinamicas, asi que `router.refresh()` alcanza: reejecuta
 * el server component y reemplaza el arbol. El `useTransition` es para poder
 * mostrar que esta trabajando sin bloquear la pantalla.
 */
export default function BotonRefrescar() {
  const router = useRouter();
  const [refrescando, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={refrescando}
      className="rounded-full border border-deep-black/20 bg-white px-4 py-2 text-sm font-semibold text-deep-black transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-60"
    >
      {refrescando ? "Actualizando..." : "Actualizar"}
    </button>
  );
}
