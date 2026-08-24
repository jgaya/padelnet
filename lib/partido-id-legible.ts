/**
 * Armado de `Partido.idLegible`: un identificador que el admin puede leer en la
 * planilla y tipear en el buscador de resultados, en vez del id numerico.
 *
 * El formato sale de la version del organizador:
 *
 *   Evento-Categoria-Zona_A-1        (partidos de zona)
 *   Evento-Categoria-Octavos-3       (partidos de llave)
 *   Evento-Categoria-SinZona-7       (partidos sin zona ni llave)
 *
 * Los separadores internos son `_` para que el `-` quede libre como separador de
 * tramos: asi el id se puede partir siempre en cuatro.
 *
 * El modulo es puro (no toca la base) para poder reusarlo desde el guardado de
 * la grilla y desde el backfill.
 */

/** Deja un tramo sin espacios ni guiones, que son los separadores del id. */
export function formatIdLegiblePart(value: string | number | null | undefined) {
  return (
    String(value ?? "")
      .trim()
      .replace(/\s+/g, "_")
      .replace(/-+/g, "_") || "SIN_DATO"
  );
}

/**
 * Compacta la categoria: "C 4" o "c-4" quedan "C4"; el resto de los codigos
 * (LIBRE, SUMA10) se usan tal cual, sin espacios.
 */
export function formatCategoriaLegible(categoria: string | null | undefined) {
  const normalized = String(categoria ?? "")
    .trim()
    .toUpperCase();
  const tipo = normalized.match(/[CD]/)?.[0] ?? "";
  const numero =
    normalized.match(/\d+(?:\s*-\s*\d+)*/)?.[0]?.replace(/\s+/g, "") ?? "";

  if (tipo && numero) return `${tipo}${numero}`;
  return normalized.replace(/\s+/g, "").replace(/-+/g, "_") || "SIN_CATEGORIA";
}

/** Nombre de zona normalizado: "A" y "Zona A" quedan los dos "Zona_A". */
function formatZonaLegible(grupoNombre: string) {
  const nombre = grupoNombre.trim();
  const conPrefijo = /^zona\b/i.test(nombre) ? nombre : `Zona ${nombre}`;
  return formatIdLegiblePart(conPrefijo);
}

export type PartidoIdLegibleInput = {
  eventoNombre: string | null | undefined;
  categoria: string | null | undefined;
  /** Nombre del grupo ("Zona A"); null en los partidos de llave. */
  grupoNombre: string | null | undefined;
  /** Valor de `Partido.llave` ("Octavos 3"); null en los partidos de zona. */
  llave: string | null | undefined;
  /** Orden del partido dentro de su zona. Se ignora en los de llave, que ya
   *  traen el numero de cruce en `llave`. */
  numero: number;
};

export function buildPartidoIdLegible({
  eventoNombre,
  categoria,
  grupoNombre,
  llave,
  numero,
}: PartidoIdLegibleInput) {
  const evento = formatIdLegiblePart(eventoNombre ?? "SIN_EVENTO");
  const cat = formatCategoriaLegible(categoria);

  // La llave ya identifica el cruce ("Octavos 3"), no hace falta contador.
  if (llave) {
    return `${evento}-${cat}-${formatIdLegiblePart(llave).replace(/_/g, "-")}`;
  }

  if (grupoNombre) {
    return `${evento}-${cat}-${formatZonaLegible(grupoNombre)}-${numero}`;
  }

  return `${evento}-${cat}-SinZona-${numero}`;
}
