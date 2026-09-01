import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";

import { getSession } from "@/lib/session";
import { origenActual } from "@/lib/auditoria-contexto";
import {
  diffCampos,
  idDeRegistro,
  seAudita,
  type Cambios,
} from "@/lib/auditoria-config";

/**
 * Registro automatico de quien cambio que.
 *
 * Son dos piezas porque las escrituras llegan por dos caminos distintos y
 * Prisma los trata distinto:
 *
 * 1. **Fuera de transaccion** las intercepta `extensionAuditoria`, una client
 *    extension enchufada en lib/prisma.ts. Es lo soportado y no requiere tocar
 *    ningun punto de escritura.
 *
 * 2. **Dentro de una transaccion interactiva** las intercepta `auditarTx`, un
 *    Proxy sobre el `tx`. Hace falta porque los hooks de una extension corren
 *    en su propio contexto async y **no tienen forma soportada de llegar al
 *    cliente de la transaccion** (prisma/prisma#17948): se probo pasarlo por
 *    AsyncLocalStorage y el contexto ya viene perdido en la primera linea del
 *    hook. Si el hook usara el cliente base, su insert quedaria fuera de la
 *    transaccion —sobreviviria a un rollback— y bajo presion de pool puede
 *    colgarse hasta el `P2028`.
 *
 * Para que una escritura dentro de transaccion no quede registrada dos veces,
 * la extension se hace a un lado cuando detecta que esta en una `itx`. Esa
 * deteccion es lo unico que depende de un campo interno de Prisma
 * (`__internalParams.transaction`); si algun dia cambia de nombre, el sintoma
 * es una entrada duplicada, no una perdida ni una caida.
 */

const OPERACIONES_AUDITADAS = new Set([
  "create",
  "createMany",
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
]);

type Accion = "CREAR" | "ACTUALIZAR" | "BORRAR" | "MASIVA";

type Delegado = Record<string, (args: unknown) => Promise<unknown>>;
type ClienteCrudo = Record<string, unknown> & {
  auditoria: { create: (args: unknown) => Promise<unknown> };
};

/** "partidoSet" -> "PartidoSet", que es como se llama el modelo en el schema. */
function nombreModelo(delegado: string) {
  return delegado.charAt(0).toUpperCase() + delegado.slice(1);
}

/** "PartidoSet" -> "partidoSet", que es como se llama el delegado en el cliente. */
function nombreDelegado(modelo: string) {
  return modelo.charAt(0).toLowerCase() + modelo.slice(1);
}

async function datosDelActor() {
  const origenMarcado = origenActual();

  try {
    const session = await getSession();

    if (session) {
      return {
        actorId: session.userId,
        actorNombre: `${session.name} ${session.lastname}`.trim() || null,
        actorEmail: session.email,
        origen: origenMarcado ?? "web",
      };
    }
  } catch {
    // Fuera de un request no hay cookies que leer, asi que no hay actor.
  }

  return {
    actorId: null,
    actorNombre: null,
    actorEmail: null,
    origen: origenMarcado ?? "anonimo",
  };
}

/**
 * El nucleo: corre la operacion y deja el registro, usando SIEMPRE el cliente
 * por el que vino la escritura. Si es el `tx`, el registro es atomico con ella.
 */
async function auditar(opciones: {
  cliente: ClienteCrudo;
  modelo: string;
  operacion: string;
  args: { where?: unknown; data?: unknown } | undefined;
  ejecutar: () => Promise<unknown>;
}): Promise<unknown> {
  const { cliente, modelo, operacion, args, ejecutar } = opciones;

  const registrar = async (
    accion: Accion,
    registroId: string | null,
    cambios: Cambios | Record<string, unknown>,
  ) => {
    try {
      // Un update que no modifico nada no es un evento.
      if (Object.keys(cambios).length === 0) return;

      const actor = await datosDelActor();

      await cliente.auditoria.create({
        data: { tabla: modelo, accion, registroId, cambios, ...actor },
      });
    } catch (error) {
      // Que falle la auditoria nunca puede voltear la operacion: la escritura
      // ya ocurrio y el usuario no tiene por que perderla por el log.
      console.error("[auditoria] no se pudo registrar", modelo, accion, error);
    }
  };

  const leerAntes = async () => {
    try {
      const delegado = cliente[nombreDelegado(modelo)] as Delegado | undefined;
      if (!delegado?.findFirst) return null;
      return (await delegado.findFirst({
        where: args?.where,
      })) as Record<string, unknown> | null;
    } catch (error) {
      // Mejor un registro sin el "antes" que ningun registro.
      console.error("[auditoria] no se pudo leer el estado previo", modelo, error);
      return null;
    }
  };

  // Las masivas se registran como un solo evento con el filtro y cuantas filas
  // toco: sacar el diff por fila obligaria a traerlas todas antes y despues,
  // que es justo lo que las hace masivas.
  if (operacion.endsWith("Many")) {
    const resultado = await ejecutar();

    await registrar("MASIVA", null, {
      operacion,
      ...(args?.where ? { filtro: args.where } : {}),
      ...(operacion === "updateMany" && args?.data ? { data: args.data } : {}),
      filas: (resultado as { count?: number })?.count ?? 0,
    });

    return resultado;
  }

  if (operacion === "create") {
    const resultado = await ejecutar();
    const fila = resultado as Record<string, unknown>;
    await registrar("CREAR", idDeRegistro(fila), diffCampos(null, fila));
    return resultado;
  }

  // update, upsert y delete necesitan el estado previo, y hay que leerlo antes
  // de tocar la fila.
  const antes = await leerAntes();
  const resultado = await ejecutar();
  const fila = resultado as Record<string, unknown>;

  if (operacion === "delete") {
    await registrar(
      "BORRAR",
      idDeRegistro(antes) ?? idDeRegistro(fila),
      diffCampos(antes, null),
    );
    return resultado;
  }

  await registrar(
    operacion === "upsert" && !antes ? "CREAR" : "ACTUALIZAR",
    idDeRegistro(fila) ?? idDeRegistro(antes),
    diffCampos(antes, fila),
  );

  return resultado;
}

/**
 * Envuelve el cliente de una transaccion para que sus escrituras se auditen
 * contra esa misma transaccion.
 *
 * Solo intercepta las operaciones de escritura de los modelos auditados; todo
 * lo demas (lecturas, modelos excluidos, metodos `$...`) pasa derecho.
 */
export function auditarTx<C extends object>(tx: C): C {
  const crudo = tx as unknown as ClienteCrudo;

  return new Proxy(tx, {
    get(target, prop, receiver) {
      const valor = Reflect.get(target, prop, receiver);

      if (typeof prop !== "string" || prop.startsWith("$")) return valor;
      if (!valor || typeof valor !== "object") return valor;

      const modelo = nombreModelo(prop);
      if (!seAudita(modelo)) return valor;

      return new Proxy(valor, {
        get(delegado, operacion, receptor) {
          const fn = Reflect.get(delegado, operacion, receptor);

          if (
            typeof operacion !== "string" ||
            typeof fn !== "function" ||
            !OPERACIONES_AUDITADAS.has(operacion)
          ) {
            return fn;
          }

          return (args: { where?: unknown; data?: unknown }) =>
            auditar({
              cliente: crudo,
              modelo,
              operacion,
              args,
              ejecutar: () => fn.call(delegado, args),
            });
        },
      });
    },
  }) as C;
}

/**
 * Detecta si la operacion viene de una transaccion interactiva.
 *
 * Es el unico punto que mira un campo interno de Prisma. Falla hacia el lado
 * seguro: si el campo no esta, se asume que no hay transaccion y la extension
 * registra como siempre.
 */
function esTransaccionInteractiva(params: unknown) {
  const interno = (params as { __internalParams?: { transaction?: { kind?: string } } })
    ?.__internalParams;

  return interno?.transaction?.kind === "itx";
}

export const extensionAuditoria = Prisma.defineExtension((cliente) => {
  const crudo = cliente as unknown as ClienteCrudo;

  return cliente.$extends({
    name: "auditoria",
    query: {
      $allModels: {
        async $allOperations(params) {
          const { model, operation, args, query } = params;

          if (!OPERACIONES_AUDITADAS.has(operation) || !seAudita(model)) {
            return query(args);
          }

          // Dentro de una transaccion ya se encargo auditarTx, con el cliente
          // correcto. Registrar aca seria duplicar y ademas quedaria fuera de
          // la transaccion.
          if (esTransaccionInteractiva(params)) {
            return query(args);
          }

          return auditar({
            cliente: crudo,
            modelo: model,
            operacion: operation,
            args: args as { where?: unknown; data?: unknown },
            ejecutar: () => query(args),
          });
        },
      },
    },
  });
});
