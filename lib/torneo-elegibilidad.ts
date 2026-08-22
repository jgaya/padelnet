/**
 * Reglas de inscripcion a un torneo: elegibilidad del jugador (sexo y
 * categoria) y ventana de inscripcion.
 *
 * Vivian como funciones locales de actions/torneos-public.ts, que al ser
 * "use server" no puede exportar funciones sincronas. Se movieron aca para que
 * la vista publica y la generacion de notificaciones usen exactamente el mismo
 * criterio.
 */

export type TorneoSexo = "MASCULINO" | "FEMENINO" | "MIXTO";
export type TorneoCategoriaRegla =
  | "LIBRE"
  | "MAYOR_IGUAL"
  | "MENOR_IGUAL"
  | "IGUAL"
  | "SUMA";

/**
 * Extrae el numero de una categoria escrita libre: "7", "7ma" y "Septima 7"
 * devuelven 7. Los datos cargados mezclan formatos.
 */
export function parseCategoriaNumber(
  categoria: string | null | undefined,
): number | null {
  if (!categoria) {
    return null;
  }

  const matched = categoria.match(/\d+/);
  if (!matched) {
    return null;
  }

  const value = Number(matched[0]);
  if (!Number.isInteger(value) || value <= 0) {
    return null;
  }

  return value;
}

export function categoriaLabel(
  regla: TorneoCategoriaRegla,
  categoriaN: number | null,
) {
  switch (regla) {
    case "MAYOR_IGUAL":
      return `Categoria ${categoriaN}+`;
    case "MENOR_IGUAL":
      return `Categoria ${categoriaN}-`;
    case "IGUAL":
      return `Categoria ${categoriaN}`;
    case "SUMA":
      return `Suma categorias = ${categoriaN}`;
    case "LIBRE":
    default:
      return "Libre";
  }
}

export function cumpleSexo(
  torneoSexo: TorneoSexo,
  genero: "M" | "F" | "X" | null,
) {
  if (torneoSexo === "MIXTO") {
    return true;
  }

  if (!genero || genero === "X") {
    return false;
  }

  if (torneoSexo === "MASCULINO") {
    return genero === "M";
  }

  if (torneoSexo === "FEMENINO") {
    return genero === "F";
  }

  return false;
}

export function cumpleCategoria(
  regla: TorneoCategoriaRegla,
  categoriaN: number | null,
  categoriaJugador: number | null,
) {
  if (regla === "LIBRE") {
    return true;
  }

  if (!categoriaN || !categoriaJugador) {
    return false;
  }

  switch (regla) {
    case "MAYOR_IGUAL":
      return categoriaJugador >= categoriaN;
    case "MENOR_IGUAL":
      return categoriaJugador <= categoriaN;
    case "IGUAL":
      return categoriaJugador === categoriaN;
    case "SUMA":
      // Sin compañero definido, validamos que exista alguna combinación posible.
      return categoriaJugador <= categoriaN;
    default:
      return true;
  }
}

/**
 * Un torneo tiene las inscripciones abiertas mientras este publicado, en
 * PUBLISHED, y no se hayan armado las zonas. Una vez armadas, la pareja ya esta
 * en el cuadro y en los partidos: sacarla dejaria un hueco, asi que la baja
 * pasa a ser cosa del admin.
 *
 * Unica definicion de la regla: la usan el resumen que mira la UI y el guard de
 * cancelPublicTorneoPair.
 */
export function inscripcionesAbiertas(torneo: {
  status: string;
  publicado: boolean;
  zonaCerrada: boolean;
  zonaGenerada: boolean;
}) {
  return (
    torneo.publicado &&
    torneo.status === "PUBLISHED" &&
    !torneo.zonaCerrada &&
    !torneo.zonaGenerada
  );
}
