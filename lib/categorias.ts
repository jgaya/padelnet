/**
 * Categorias de juego que ofrece el sitio.
 *
 * Estaban hardcodeadas dentro de app/registrarse/page.tsx; se movieron aca
 * porque ahora las necesita tambien la pantalla de completar perfil, y dos
 * copias se desincronizan sole.
 */
export const CATEGORIA_OPTIONS = [
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
  { value: "6", label: "6" },
  { value: "7", label: "7" },
  { value: "8", label: "8" },
];

export const CATEGORIA_VALUES = CATEGORIA_OPTIONS.map(
  (categoria) => categoria.value,
);

const ORDINALES: Record<string, string> = {
  "1": "1ra",
  "2": "2da",
  "3": "3ra",
  "4": "4ta",
  "5": "5ta",
  "6": "6ta",
  "7": "7ma",
  "8": "8va",
};

/** Como se nombra una categoria al hablar: "4" -> "4ta". */
export function categoriaOrdinal(categoria: string | number) {
  const clave = String(categoria);
  return ORDINALES[clave] ?? clave;
}

/** Los rankings del club van separados por genero: Caballeros y Damas. */
export const SEXO_RANKING_OPTIONS = [
  { value: "M", label: "Caballeros" },
  { value: "F", label: "Damas" },
] as const;

export type SexoRanking = (typeof SEXO_RANKING_OPTIONS)[number]["value"];

export function esSexoRanking(value: unknown): value is SexoRanking {
  return value === "M" || value === "F";
}

/** "Caballeros 4ta". */
export function rankingLabel(sexo: SexoRanking, categoria: string) {
  const sexoLabel =
    SEXO_RANKING_OPTIONS.find((opcion) => opcion.value === sexo)?.label ??
    "Caballeros";

  return `${sexoLabel} ${categoriaOrdinal(categoria)}`;
}
