import { AsyncLocalStorage } from "node:async_hooks";

/**
 * De donde viene la escritura que se esta auditando.
 *
 * Nota de diseño: aca vivia tambien la transaccion en curso, para que la
 * extension de auditoria pudiera usar el cliente correcto. **No funciona**: los
 * hooks de una client extension corren en su propio contexto async y el
 * AsyncLocalStorage ya viene perdido en la primera linea del hook (medido, no
 * supuesto). Por eso las escrituras dentro de transaccion las intercepta un
 * Proxy sobre el `tx` (`auditarTx` en lib/auditoria.ts) y no la extension.
 *
 * El origen si funciona por aca porque lo consulta `datosDelActor`, que corre
 * en el mismo contexto que la ruta que lo marco.
 */

export type Origen = "web" | "cron" | "anonimo";

const almacen = new AsyncLocalStorage<{ origen: Origen }>();

/** El origen declarado, si alguien lo marco. */
export function origenActual(): Origen | null {
  return almacen.getStore()?.origen ?? null;
}

/**
 * Marca de donde vienen las escrituras de `fn`.
 *
 * Lo usan las rutas de /api/cron: entran por HTTP pero no tienen sesion, asi
 * que sin esto sus cambios quedarian registrados como si los hubiera hecho un
 * visitante anonimo.
 */
export function conOrigen<T>(origen: Origen, fn: () => Promise<T>): Promise<T> {
  return almacen.run({ origen }, fn);
}
