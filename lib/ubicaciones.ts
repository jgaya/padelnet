/**
 * Provincias argentinas (23 + CABA) con el id de INDEC.
 *
 * Modulo puro (sin `use server`): lo importan las actions para normalizar lo que
 * llega del form, y el cliente para armar el combo.
 *
 * Las localidades NO viven aca: son casi 4000 y meterlas en un modulo TS las
 * mandaria al bundle de JS de toda pantalla que tenga el campo. Estan en
 * public/data/localidades-ar.json, indexadas por el id de provincia de esta
 * lista, y las baja hooks/useLocalidades.ts cuando hace falta.
 */
export type Provincia = {
  id: string;
  nombre: string;
};

export const PROVINCIAS: readonly Provincia[] = [
  { id: "06", nombre: "Buenos Aires" },
  { id: "10", nombre: "Catamarca" },
  { id: "22", nombre: "Chaco" },
  { id: "26", nombre: "Chubut" },
  { id: "02", nombre: "Ciudad Autónoma de Buenos Aires" },
  { id: "14", nombre: "Córdoba" },
  { id: "18", nombre: "Corrientes" },
  { id: "30", nombre: "Entre Ríos" },
  { id: "34", nombre: "Formosa" },
  { id: "38", nombre: "Jujuy" },
  { id: "42", nombre: "La Pampa" },
  { id: "46", nombre: "La Rioja" },
  { id: "50", nombre: "Mendoza" },
  { id: "54", nombre: "Misiones" },
  { id: "58", nombre: "Neuquén" },
  { id: "62", nombre: "Río Negro" },
  { id: "66", nombre: "Salta" },
  { id: "70", nombre: "San Juan" },
  { id: "74", nombre: "San Luis" },
  { id: "78", nombre: "Santa Cruz" },
  { id: "82", nombre: "Santa Fe" },
  { id: "86", nombre: "Santiago del Estero" },
  { id: "94", nombre: "Tierra del Fuego" },
  { id: "90", nombre: "Tucumán" },
];

/**
 * Se guarda el nombre y no el id: es lo que ya hace localidad, lo que usa
 * Complejo.provincia, y deja legibles el dashboard y cualquier export.
 */
export const PROVINCIA_OPTIONS = PROVINCIAS.map((provincia) => ({
  value: provincia.nombre,
  label: provincia.nombre,
}));

export const LOCALIDADES_URL = "/data/localidades-ar.json";

/** Localidades por id de provincia, tal como viene el JSON de public/data. */
export type LocalidadesPorProvincia = Record<string, string[]>;

/**
 * Minusculas y sin acentos, para comparar lo que escribio una persona contra el
 * dataset sin que "Cordoba" y "Córdoba" cuenten como distintas.
 */
export function normalizarTexto(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

export function provinciaPorNombre(
  value: string | null | undefined,
): Provincia | null {
  if (!value) return null;

  const buscado = normalizarTexto(value);
  return (
    PROVINCIAS.find(
      (provincia) => normalizarTexto(provincia.nombre) === buscado,
    ) ?? null
  );
}

/**
 * Devuelve el nombre canonico de la provincia, o null si no es una de las 24.
 * Las actions lo usan para no persistir cualquier cosa que llegue en el payload.
 */
export function normalizarProvincia(
  value: string | null | undefined,
): string | null {
  return provinciaPorNombre(value)?.nombre ?? null;
}

/** Busca una localidad dentro de una provincia y devuelve su grafia canonica. */
export function localidadCanonica(
  localidades: string[],
  value: string | null | undefined,
): string | null {
  if (!value) return null;

  const buscado = normalizarTexto(value);
  return (
    localidades.find((localidad) => normalizarTexto(localidad) === buscado) ??
    null
  );
}
