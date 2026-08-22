/**
 * La paleta, en hex, para Recharts.
 *
 * Recharts pinta con atributos SVG (`fill`, `stroke`), no con clases, asi que
 * las variables de `globals.css` no le sirven. Estos valores son los mismos que
 * definen `--padel-green` y compania; si cambian alla hay que cambiarlos aca.
 */

export const PADEL_GREEN = "#00c853";
export const ENERGY_ORANGE = "#ff4f00";
export const DEEP_BLACK = "#1c2526";
export const SURFACE_SOFT = "#eef2f1";

/** Serie para los graficos de varias categorias, como la dona. */
export const SERIE = [
  PADEL_GREEN,
  ENERGY_ORANGE,
  "#2196f3",
  "#9c27b0",
  "#ff9800",
  "#00897b",
  "#795548",
  "#607d8b",
];

export function colorDeSerie(indice: number) {
  return SERIE[indice % SERIE.length];
}
