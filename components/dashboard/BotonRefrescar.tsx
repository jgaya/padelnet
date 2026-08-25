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
      className="rounded-full border border-content/20 bg-surface px-4 py-2 text-sm font-semibold text-content transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-60"
    >
      {refrescando ? "Actualizando..." : "Actualizar"}
    </button>
  );
}
