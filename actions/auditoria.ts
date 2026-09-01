"use server";

import { assertSuperadmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { MODELOS_AUDITADOS } from "@/lib/auditoria-config";
import type { AuditoriaAccion } from "@/lib/generated/prisma/client";
import type { ListOpts } from "@/types/ui";

export type CambioVisible = {
  campo: string;
  antes: string | null;
  despues: string | null;
};

export type AuditoriaItem = {
  /** BigInt en la base. Viaja como texto: JSON no serializa BigInt. */
  id: string;
  tabla: string;
  accion: AuditoriaAccion;
  registroId: string | null;
  actor: string;
  origen: string;
  createdAt: Date;
  cambios: CambioVisible[];
};

const ACCIONES: AuditoriaAccion[] = [
  "CREAR",
  "ACTUALIZAR",
  "BORRAR",
  "MASIVA",
];

function comoTexto(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === "string") return valor;
  return JSON.stringify(valor);
}

/**
 * Aplana el Json de `cambios` a una lista para la tabla.
 *
 * En las masivas el Json no tiene la forma `{ campo: { antes, despues } }` sino
 * el filtro y el count, asi que cada clave se muestra como un valor suelto.
 */
function aCambiosVisibles(cambios: unknown): CambioVisible[] {
  if (!cambios || typeof cambios !== "object") return [];

  return Object.entries(cambios as Record<string, unknown>).map(
    ([campo, valor]) => {
      if (valor && typeof valor === "object" && !Array.isArray(valor)) {
        const par = valor as { antes?: unknown; despues?: unknown };

        if ("antes" in par || "despues" in par) {
          return {
            campo,
            antes: comoTexto(par.antes),
            despues: comoTexto(par.despues),
          };
        }
      }

      return { campo, antes: null, despues: comoTexto(valor) };
    },
  );
}

export async function listarAuditoria(
  opts: ListOpts & {
    tabla?: string;
    accion?: string;
    registroId?: string;
    actorId?: number;
    desde?: string;
    hasta?: string;
  } = {},
) {
  await assertSuperadmin();

  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 25));
  const searchBy = opts.searchBy?.trim() ?? "";

  const accion = ACCIONES.includes(opts.accion as AuditoriaAccion)
    ? (opts.accion as AuditoriaAccion)
    : undefined;

  const tabla = MODELOS_AUDITADOS.includes(
    opts.tabla as (typeof MODELOS_AUDITADOS)[number],
  )
    ? opts.tabla
    : undefined;

  const desde = opts.desde ? new Date(opts.desde) : null;
  const hasta = opts.hasta ? new Date(opts.hasta) : null;
  // `hasta` viene como fecha sin hora: se corre al final del dia para que
  // filtrar "hasta hoy" incluya lo de hoy.
  if (hasta) hasta.setHours(23, 59, 59, 999);

  const where = {
    ...(tabla ? { tabla } : {}),
    ...(accion ? { accion } : {}),
    ...(opts.registroId ? { registroId: opts.registroId } : {}),
    ...(opts.actorId ? { actorId: opts.actorId } : {}),
    ...(desde && !Number.isNaN(desde.getTime())
      ? { createdAt: { gte: desde, ...(hasta ? { lte: hasta } : {}) } }
      : hasta && !Number.isNaN(hasta.getTime())
        ? { createdAt: { lte: hasta } }
        : {}),
    ...(searchBy
      ? {
          OR: [
            { actorNombre: { contains: searchBy } },
            { actorEmail: { contains: searchBy } },
            { registroId: { contains: searchBy } },
          ],
        }
      : {}),
  };

  const [filas, total] = await Promise.all([
    prisma.auditoria.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { id: "desc" },
      select: {
        id: true,
        tabla: true,
        accion: true,
        registroId: true,
        actorNombre: true,
        actorEmail: true,
        origen: true,
        cambios: true,
        createdAt: true,
      },
    }),
    prisma.auditoria.count({ where }),
  ]);

  const items: AuditoriaItem[] = filas.map((fila) => ({
    id: fila.id.toString(),
    tabla: fila.tabla,
    accion: fila.accion,
    registroId: fila.registroId,
    actor:
      fila.actorNombre ??
      fila.actorEmail ??
      (fila.origen === "cron" ? "Sistema (cron)" : "Anonimo"),
    origen: fila.origen,
    createdAt: fila.createdAt,
    cambios: aCambiosVisibles(fila.cambios),
  }));

  return { items, total, page, pageSize };
}
