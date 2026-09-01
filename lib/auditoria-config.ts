/**
 * Que se audita y como se comparan los valores.
 *
 * Modulo puro: sin prisma, sin "server-only". Lo importan la extension y
 * scripts/check-auditoria.ts, que corre con tsx fuera de Next.
 *
 * Al agregar un modelo al schema hay que ponerlo en una de las dos listas.
 * `npm run check:auditoria` falla si queda sin clasificar, justamente para que
 * no se quede sin auditar en silencio.
 */

/** Se registra fila por fila: son los datos que edita una persona. */
export const MODELOS_AUDITADOS = [
  "User",
  "Complejo",
  "ComplejoHorario",
  "ComplejoHorarioExcepcion",
  "ComplejoFeature",
  "ComplejoMembership",
  "PerfilJugadorComplejo",
  "Cancha",
  "Evento",
  "Torneo",
  "Pareja",
  "Partido",
  "PartidoSet",
  "Recategorizacion",
  "TurnoSerie",
  "TurnoSlot",
  "TurnoReserva",
  "Sponsor",
  "ComplejoSponsor",
  "ImagenPerfil",
  "Sancion",
  "Logro",
] as const;

/**
 * No se auditan, cada uno por su motivo:
 *
 * - `Ranking`, `Grupo`, `GrupoPareja`, `Ronda`: derivados. Se recalculan solos
 *   a partir de `PartidoSet` y `Pareja`, que si se auditan. Cargar un
 *   resultado hace un `deleteMany` + `createMany` del ranking entero; auditarlo
 *   serian decenas de filas de ruido tapando el cambio que si importa.
 * - `Notification`, `PushToken`: los escribe el cron de a cientos.
 * - `EmailVerification`: guarda tokens de un solo uso. No van a un log.
 * - `Generacion`: ya es, en si mismo, un registro de lo que se genero.
 * - `Auditoria`: auditarse a si misma es recursion infinita.
 */
export const MODELOS_EXCLUIDOS = [
  "Ranking",
  "Grupo",
  "GrupoPareja",
  "Ronda",
  "Notification",
  "PushToken",
  "EmailVerification",
  "Generacion",
  "Auditoria",
  // Lo escribe el motor de logros decenas de veces por torneo: auditar cada
  // incremento de progreso seria ruido puro. El catalogo (Logro) si se audita.
  "LogroUsuario",
] as const;

const AUDITADOS = new Set<string>(MODELOS_AUDITADOS);

export function seAudita(modelo: string | undefined): boolean {
  return Boolean(modelo) && AUDITADOS.has(modelo as string);
}

/**
 * Campos cuyo valor nunca se escribe en el log, aunque cambien. Se registra
 * que el campo cambio, con el valor reemplazado.
 */
const CAMPOS_OCULTOS = new Set([
  "passwordHash",
  "token",
  "firebaseUid",
  "notificationPreferences",
]);

/**
 * Campos de contabilidad que se ignoran al comparar.
 *
 * `updatedAt` lleva `@updatedAt`, asi que Prisma lo pisa en **todo** update.
 * Sin sacarlo de la comparacion, guardar un formulario sin cambiar nada
 * igual generaria una fila de auditoria, y cada entrada real vendria con un
 * cambio de fecha al lado que no le dice nada a nadie.
 */
const CAMPOS_IGNORADOS = new Set(["updatedAt", "createdAt"]);

export const VALOR_OCULTO = "[oculto]";

export type CambioCampo = { antes?: unknown; despues?: unknown };
export type Cambios = Record<string, CambioCampo>;

/**
 * Deja el valor listo para guardar en una columna Json.
 *
 * Las fechas van a ISO y los BigInt a texto: `JSON.stringify` no sabe
 * serializar ninguno de los dos y romperia el insert.
 */
function aJson(valor: unknown): unknown {
  if (valor instanceof Date) return valor.toISOString();
  if (typeof valor === "bigint") return valor.toString();
  return valor;
}

function sonIguales(a: unknown, b: unknown): boolean {
  // Dos Date con el mismo instante son objetos distintos: por identidad
  // TODA fecha figuraria como cambiada.
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  if (Object.is(a, b)) return true;

  // Json (como notificationPreferences) y arrays: comparacion estructural
  // barata. Son objetos chicos.
  if (a !== null && b !== null && typeof a === "object" && typeof b === "object") {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Campos que cambiaron entre dos versiones de la fila.
 *
 * Recorre las claves de las dos, para no perder un campo que paso a
 * `undefined`. Devuelve `{}` si no cambio nada: la extension usa eso para no
 * escribir una fila por un update que no modifico nada.
 */
export function diffCampos(
  antes: Record<string, unknown> | null,
  despues: Record<string, unknown> | null,
): Cambios {
  const cambios: Cambios = {};
  const claves = new Set([
    ...Object.keys(antes ?? {}),
    ...Object.keys(despues ?? {}),
  ]);

  for (const clave of claves) {
    if (CAMPOS_IGNORADOS.has(clave)) continue;

    const valorAntes = antes?.[clave];
    const valorDespues = despues?.[clave];

    if (antes && despues && sonIguales(valorAntes, valorDespues)) continue;

    if (CAMPOS_OCULTOS.has(clave)) {
      cambios[clave] = {
        ...(antes ? { antes: VALOR_OCULTO } : {}),
        ...(despues ? { despues: VALOR_OCULTO } : {}),
      };
      continue;
    }

    cambios[clave] = {
      ...(antes ? { antes: aJson(valorAntes) } : {}),
      ...(despues ? { despues: aJson(valorDespues) } : {}),
    };
  }

  return cambios;
}

/** Id de la fila como texto, para guardarlo en una sola columna. */
export function idDeRegistro(fila: unknown): string | null {
  if (!fila || typeof fila !== "object") return null;

  const id = (fila as { id?: unknown }).id;
  if (id === undefined || id === null) return null;

  return String(id);
}
