"use client";

/**
 * La paleta de los graficos, en hex.
 *
 * Recharts pinta con atributos SVG (`fill`, `stroke`), no con clases, asi que no
 * puede leer las variables de `globals.css`. Estos valores son los mismos que
 * definen los tokens del tema; si cambian alla hay que cambiarlos aca.
 *
 * Como los graficos tienen que seguir el tema, la paleta se pide con
 * `usePaletaGraficos()` en lugar de importar constantes sueltas.
 */

import { useTemaResuelto } from "@/hooks/useTema";
import type { ResolvedTheme } from "@/lib/tema";

export type PaletaGraficos = {
  /** Ejes, grilla y texto: acompania a `--content`. */
  texto: string;
  padelGreen: string;
  energyOrange: string;
  /** Fondo de los tooltips: acompania a `--surface-raised`. */
  superficie: string;
  /** Serie para los graficos de varias categorias, como la dona. */
  serie: string[];
};

const PALETAS: Record<ResolvedTheme, PaletaGraficos> = {
  light: {
    texto: "#1c2526",
    padelGreen: "#00c853",
    energyOrange: "#ff4f00",
    superficie: "#ffffff",
    serie: [
      "#00c853",
      "#ff4f00",
      "#2196f3",
      "#9c27b0",
      "#ff9800",
      "#00897b",
      "#795548",
      "#607d8b",
    ],
  },
  dark: {
    texto: "#e3ebe9",
    padelGreen: "#00c853",
    energyOrange: "#ff4f00",
    superficie: "#232f2e",
    // Los tonos medios de la serie clara se pierden contra el fondo oscuro, asi
    // que en oscuro se usan las versiones claras de los mismos matices.
    serie: [
      "#2ee87a",
      "#ff8a52",
      "#64b5f6",
      "#ce93d8",
      "#ffb74d",
      "#4db6ac",
      "#bcaaa4",
      "#90a4ae",
    ],
  },
};

export function paletaDeTema(tema: ResolvedTheme): PaletaGraficos {
  return PALETAS[tema];
}

export function usePaletaGraficos(): PaletaGraficos {
  return PALETAS[useTemaResuelto()];
}

export function colorDeSerie(paleta: PaletaGraficos, indice: number) {
  return paleta.serie[indice % paleta.serie.length];
}
