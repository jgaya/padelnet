import "server-only";

import { prisma } from "@/lib/prisma";
import { borrarArchivos } from "@/lib/imagenes-perfil";

/**
 * Cuanto se conserva una foto rechazada antes de borrarla.
 *
 * No es cero por una razon concreta: el motivo del rechazo se lo muestra
 * /perfil leyendo la ultima ImagenPerfil del usuario. Si la fila desapareciera
 * el mismo dia, quien no entro en el momento nunca se entera de por que su
 * foto no se publico, solo ve que no esta.
 */
const RETENCION_DIAS = 30;

/** Tope por corrida, para que una limpieza atrasada no bloquee la base. */
const BATCH_SIZE = 200;

export type LimpiarImagenesResult = {
  borradas: number;
  /** Quedan para la proxima corrida: se alcanzo el tope del lote. */
  pendientes: number;
};

/**
 * Borra las fotos de perfil rechazadas que ya pasaron la retencion.
 *
 * Se dispara desde /api/cron/imagenes una vez por dia, igual que las otras dos
 * tareas. Una foto rechazada no se publica nunca, asi que despues de que el
 * usuario tuvo tiempo de leer el motivo es solo disco ocupado.
 *
 * Las aprobadas y las pendientes no se tocan. Las anteriores de un usuario que
 * consiguio una aprobacion las borra `aprobarImagen` en el momento, asi que
 * esto se ocupa del caso que ese camino no cubre: el que subio una foto, se la
 * rechazaron y no volvio a intentar.
 */
export async function limpiarImagenesRechazadas(): Promise<LimpiarImagenesResult> {
  const limite = new Date();
  limite.setDate(limite.getDate() - RETENCION_DIAS);

  const where = {
    estado: "RECHAZADA" as const,
    // Por moderadaAt y no por createdAt: lo que se cuenta es el tiempo desde
    // que el usuario pudo ver el rechazo, no desde que subio la foto.
    moderadaAt: { lt: limite },
  };

  const vencidas = await prisma.imagenPerfil.findMany({
    where,
    take: BATCH_SIZE,
    orderBy: { moderadaAt: "asc" },
    select: {
      id: true,
      userId: true,
      archivoImagen: true,
      archivoAvatar: true,
    },
  });

  if (!vencidas.length) {
    return { borradas: 0, pendientes: 0 };
  }

  // Las filas primero: si el borrado de archivos falla a la mitad, lo que
  // queda es disco ocupado sin referencias, no filas apuntando a archivos que
  // no existen. Al reves seria peor.
  await prisma.imagenPerfil.deleteMany({
    where: { id: { in: vencidas.map((fila) => fila.id) } },
  });

  for (const fila of vencidas) {
    try {
      await borrarArchivos(fila.userId, [
        fila.archivoImagen,
        fila.archivoAvatar,
      ]);
    } catch (error) {
      // Un archivo que no se puede borrar no corta la limpieza del resto.
      console.error(
        `No se pudieron borrar los archivos de la imagen ${fila.id}`,
        error,
      );
    }
  }

  const pendientes = await prisma.imagenPerfil.count({ where });

  return { borradas: vencidas.length, pendientes };
}
