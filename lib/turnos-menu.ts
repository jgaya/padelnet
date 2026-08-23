/**
 * Parte pura del item "Turnos" del menu: a donde apunta segun cuantos
 * complejos tengan la funcionalidad.
 *
 * Vive separado de `lib/turnos-acceso.ts` porque ese modulo arrastra prisma y
 * la sesion; aca no hay imports, asi que se puede probar y usar desde
 * cualquier lado.
 */

export type ComplejoConTurnos = { id: number; name: string };

/**
 * Null si no hay ningun complejo con turnos: en ese caso el item no se dibuja.
 *
 * Con un solo complejo entra directo a su calendario; con varios pasa por la
 * selectora, porque no existe una pantalla de turnos que cruce complejos.
 */
export function hrefTurnos(complejos: ComplejoConTurnos[]): string | null {
  if (complejos.length === 0) return null;
  if (complejos.length === 1) {
    return `/admin/complejos/${complejos[0].id}/turnos`;
  }

  return "/admin/turnos";
}
