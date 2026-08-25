"use client";

import { useTema } from "@/hooks/useTema";
import { ETIQUETAS_MODO, MODOS } from "@/lib/tema";

const ICONOS: Record<string, string> = {
  light: "☀",
  dark: "☾",
  system: "◐",
};

type ThemeToggleProps = {
  /** Solo los iconos, para el header cuando no hay sesion. */
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

  if (compact) {
    return (
      <div
        role="radiogroup"
        aria-label="Tema"
        className="flex items-center gap-0.5 rounded-full border border-content/10 bg-surface-soft p-0.5"
      >
        {MODOS.map((opcion) => (
          <button
            key={opcion}
            type="button"
            role="radio"
            data-mode={opcion}
            aria-checked={mode === opcion}
            title={ETIQUETAS_MODO[opcion]}
            aria-label={ETIQUETAS_MODO[opcion]}
            onClick={() => setMode(opcion)}
            className="flex h-7 w-7 items-center justify-center rounded-full text-sm text-content/60 transition hover:bg-surface"
          >
            {ICONOS[opcion]}
          </button>
        ))}
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
