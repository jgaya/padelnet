"use client";

import { useEffect, useRef, useState } from "react";
import { useTema } from "@/hooks/useTema";
import { ETIQUETAS_MODO, MODOS } from "@/lib/tema";

const ICONOS: Record<string, string> = {
  light: "☀",
  dark: "☾",
  system: "◐",
};

type ThemeToggleProps = {
  /** Boton desplegable compacto para el header cuando no hay sesion. */
  compact?: boolean;
};

/**
 * Selector de tema claro / oscuro / sistema.
 *
 * La opcion activa se marca con CSS desde `[data-theme-mode]` (ver
 * `globals.css`), no con estado de React: el dropdown del avatar esta siempre
 * montado, asi que un check dibujado desde React se veria mal en el primer
 * paint. `aria-checked` si sale del estado, que se sincroniza un tick despues.
 */
export default function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { mode, setMode } = useTema();
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!compact || !abierto) return;

    const clickAfuera = (event: MouseEvent) => {
      if (
        contenedorRef.current &&
        !contenedorRef.current.contains(event.target as Node)
      ) {
        setAbierto(false);
      }
    };

    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAbierto(false);
    };

    document.addEventListener("mousedown", clickAfuera);
    document.addEventListener("keydown", escape);

    return () => {
      document.removeEventListener("mousedown", clickAfuera);
      document.removeEventListener("keydown", escape);
    };
  }, [compact, abierto]);

  if (compact) {
    return (
      <div ref={contenedorRef} className="relative">
        <button
          type="button"
          onClick={() => setAbierto((prev) => !prev)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-content/15 text-base text-content transition hover:bg-padel-green/10 hover:text-padel-green"
          aria-label="Cambiar tema"
          aria-expanded={abierto}
          aria-controls="menu-tema"
          title="Cambiar tema"
        >
          <span aria-hidden="true">{ICONOS[mode] ?? "◐"}</span>
        </button>

        <div
          id="menu-tema"
          role="radiogroup"
          aria-label="Tema"
          className={`absolute right-0 top-12 w-44 rounded-2xl border border-content/10 bg-surface p-2 shadow-[var(--shadow-lg)] transition duration-150 ${
            abierto
              ? "translate-y-0 opacity-100"
              : "pointer-events-none invisible -translate-y-1 opacity-0"
          }`}
        >
          <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-[0.16em] text-content/50">
            Tema
          </p>
          {MODOS.map((opcion) => (
            <button
              key={opcion}
              type="button"
              role="radio"
              data-mode={opcion}
              aria-checked={mode === opcion}
              onClick={() => {
                setMode(opcion);
                setAbierto(false);
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-content transition hover:bg-surface-soft"
            >
              <span aria-hidden="true" className="w-5 text-center text-base">
                {ICONOS[opcion]}
              </span>
              {ETIQUETAS_MODO[opcion]}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-1 border-t border-content/10 pt-2">
      <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-[0.16em] text-content/50">
        Tema
      </p>

      <div role="radiogroup" aria-label="Tema" className="flex flex-col">
        {MODOS.map((opcion) => (
          <button
            key={opcion}
            type="button"
            role="radio"
            data-mode={opcion}
            aria-checked={mode === opcion}
            onClick={() => setMode(opcion)}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-content transition hover:bg-surface-soft"
          >
            <span aria-hidden="true" className="w-4 text-center">
              {ICONOS[opcion]}
            </span>
            {ETIQUETAS_MODO[opcion]}
          </button>
        ))}
      </div>
    </div>
  );
}
