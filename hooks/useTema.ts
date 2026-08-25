"use client";

import { useSyncExternalStore } from "react";
import {
  fijarModo,
  snapshotTema,
  snapshotTemaServidor,
  suscribirTema,
  type EstadoTema,
  type ResolvedTheme,
  type ThemeMode,
} from "@/lib/tema";

export type UseTema = EstadoTema & {
  setMode: (mode: ThemeMode) => void;
};

/**
 * El tema actual y como cambiarlo.
 *
 * No hay provider: la preferencia vive en localStorage y en
 * `prefers-color-scheme`, no en el arbol de React, asi que se lee del store de
 * `lib/tema.ts`. Se puede usar desde cualquier client component.
 */
export function useTema(): UseTema {
  const estado = useSyncExternalStore(
    suscribirTema,
    snapshotTema,
    snapshotTemaServidor,
  );

  return { ...estado, setMode: fijarModo };
}

/** Para los graficos, que necesitan el hex y no la clase. */
export function useTemaResuelto(): ResolvedTheme {
  return useTema().resolved;
}
