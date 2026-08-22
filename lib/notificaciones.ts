import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  NotificationCreateSchema,
  NotificationStatus,
  type NotificationCreate,
} from "@/types/notification";

/**
 * Alta de notificaciones en la cola.
 *
 * Vive aca y no en una server action a proposito: lo llaman los disparadores
 * internos (actions/notificaciones-eventos.ts) cuando se guarda un resultado, se
 * publica un torneo, etc. Como server action seria un endpoint POST publico y
 * cualquiera podria inyectar avisos en la cola de cualquier usuario.
 */

/**
 * Prisma no acepta `null` directo en una columna Json nullable: hay que pasarle
 * Prisma.JsonNull. Este helper hace esa traduccion en un solo lugar.
 */
export function toJsonInput(metadata: Record<string, unknown> | undefined) {
  return metadata === undefined
    ? Prisma.JsonNull
    : (metadata as Prisma.InputJsonValue);
}

export async function createBulkNotifications(
  notifications: NotificationCreate[],
) {
  try {
    const validatedNotifications = notifications.map((notif) =>
      NotificationCreateSchema.parse(notif),
    );

    const created = await prisma.notification.createMany({
      data: validatedNotifications.map((notif) => ({
        userId: notif.userId,
        type: notif.type,
        title: notif.title,
        body: notif.body,
        scheduledAt: notif.scheduledAt || null,
        status: NotificationStatus.PENDING,
        metadata: toJsonInput(notif.metadata),
      })),
      skipDuplicates: true,
    });

    return { success: true as const, created: created.count };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Error al crear notificaciones en masa",
    };
  }
}
