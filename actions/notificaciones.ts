"use server";

import { assertSuperadmin } from "@/lib/authz";
import { createBulkNotifications, toJsonInput } from "@/lib/notificaciones";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Prisma } from "@/lib/generated/prisma/client";
import { isComplejoFeatureEnabled } from "@/actions/complejo-features";
import {
    NotificationCreateSchema,
    NotificationUpdateSchema,
    NotificationFilterSchema,
    NotificationStatus,
    NotificationType,
    type NotificationCreate,
    type NotificationUpdate,
    type NotificationFilter,
} from "@/types/notification";

/**
 * Corta la generacion de notificaciones si el complejo dueño del torneo no
 * tiene habilitada la funcionalidad NOTIFICACIONES. No es un error: la
 * funcionalidad simplemente esta apagada para ese club.
 */
async function assertNotificacionesHabilitadas(torneoId: number): Promise<
    | { enabled: true }
    | {
          enabled: false;
          response: {
              success: true;
              notificationsCreated: 0;
              message: string;
          };
      }
> {
    const torneo = await prisma.torneo.findUnique({
        where: { id: torneoId },
        select: { evento: { select: { complejoId: true } } },
    });

    if (!torneo) {
        return {
            enabled: false,
            response: {
                success: true,
                notificationsCreated: 0,
                message: "El torneo no existe",
            },
        };
    }

    const habilitado = await isComplejoFeatureEnabled(
        torneo.evento.complejoId,
        "NOTIFICACIONES",
    );

    if (habilitado) return { enabled: true };

    return {
        enabled: false,
        response: {
            success: true,
            notificationsCreated: 0,
            message: "El complejo no tiene habilitadas las notificaciones",
        },
    };
}


// ========================================
// CREATE - Crear una nueva notificación
// ========================================
export async function createNotification(data: NotificationCreate) {
    // Administracion de la cola de notificaciones: solo superadmin. Sin esto la
    // action queda expuesta como endpoint POST publico.
    await assertSuperadmin();
    try {
        const validatedData = NotificationCreateSchema.parse(data);

        const notification = await prisma.notification.create({
            data: {
                userId: validatedData.userId,
                type: validatedData.type,
                title: validatedData.title,
                body: validatedData.body,
                scheduledAt: validatedData.scheduledAt || null,
                status: NotificationStatus.PENDING,
                metadata: toJsonInput(validatedData.metadata),
            },
            include: {
                user: true,
            },
        });

        return {
            success: true,
            notification,
        };
    } catch (error) {
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Error al crear la notificación",
        };
    }
}

// ========================================
// READ - Obtener una notificación por ID
// ========================================
export async function getNotificationById(id: string) {
    // Administracion de la cola de notificaciones: solo superadmin. Sin esto la
    // action queda expuesta como endpoint POST publico.
    await assertSuperadmin();
    try {
        const notification = await prisma.notification.findUnique({
            where: { id },
            include: {
                user: true,
            },
        });

        if (!notification) {
            return {
                success: false,
                error: "Notificación no encontrada",
            };
        }

        return {
            success: true,
            notification,
        };
    } catch (error) {
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Error al obtener la notificación",
        };
    }
}

// ========================================
// READ - Obtener notificaciones por usuario
// ========================================
/**
 * Notificaciones del usuario logueado.
 *
 * El userId sale de la sesion, no del parametro: antes cualquiera podia leer la
 * bandeja de cualquier otro. `userIdAjeno` existe para un futuro panel de
 * soporte y solo lo puede usar un superadmin.
 */
export async function getUserNotifications(
    limit: number = 50,
    offset: number = 0,
    userIdAjeno?: number,
) {
    try {
        const session = await getSession();
        if (!session) {
            return { success: false, error: "No autorizado" };
        }

        let userId = session.userId;
        if (userIdAjeno !== undefined && userIdAjeno !== session.userId) {
            if (session.platformRole !== "SUPERADMIN") {
                return { success: false, error: "No autorizado" };
            }
            userId = userIdAjeno;
        }

        const [notifications, total] = await Promise.all([
            prisma.notification.findMany({
                where: { userId },
                orderBy: { createdAt: "desc" },
                take: limit,
                skip: offset,
                include: {
                    user: true,
                },
            }),
            prisma.notification.count({
                where: { userId },
            }),
        ]);

        return {
            success: true,
            notifications,
            total,
            limit,
            offset,
        };
    } catch (error) {
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Error al obtener las notificaciones",
        };
    }
}

// ========================================
// READ - Filtrar notificaciones
// ========================================
export async function filterNotifications(filters: NotificationFilter) {
    // Administracion de la cola de notificaciones: solo superadmin. Sin esto la
    // action queda expuesta como endpoint POST publico.
    await assertSuperadmin();
    try {
        const validatedFilters = NotificationFilterSchema.parse(filters);

        const where: Prisma.NotificationWhereInput = {};
        if (validatedFilters.userId) where.userId = validatedFilters.userId;
        if (validatedFilters.type) where.type = validatedFilters.type;
        if (validatedFilters.status) where.status = validatedFilters.status;

        const [notifications, total] = await Promise.all([
            prisma.notification.findMany({
                where,
                orderBy: { createdAt: "desc" },
                take: validatedFilters.limit,
                skip: validatedFilters.offset,
                include: {
                    user: true,
                },
            }),
            prisma.notification.count({ where }),
        ]);

        return {
            success: true,
            notifications,
            total,
            limit: validatedFilters.limit,
            offset: validatedFilters.offset,
        };
    } catch (error) {
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Error al filtrar notificaciones",
        };
    }
}

// ========================================
// UPDATE - Actualizar notificación
// ========================================
export async function updateNotification(data: NotificationUpdate) {
    // Administracion de la cola de notificaciones: solo superadmin. Sin esto la
    // action queda expuesta como endpoint POST publico.
    await assertSuperadmin();
    try {
        const validatedData = NotificationUpdateSchema.parse(data);

        const notification = await prisma.notification.update({
            where: { id: validatedData.id },
            data: {
                ...(validatedData.title && { title: validatedData.title }),
                ...(validatedData.body && { body: validatedData.body }),
                ...(validatedData.scheduledAt !== undefined && {
                    scheduledAt: validatedData.scheduledAt,
                }),
                ...(validatedData.status && { status: validatedData.status }),
                ...(validatedData.sentAt !== undefined && {
                    sentAt: validatedData.sentAt,
                }),
            },
            include: {
                user: true,
            },
        });

        return {
            success: true,
            notification,
        };
    } catch (error) {
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Error al actualizar la notificación",
        };
    }
}

// ========================================
// UPDATE - Marcar como enviada
// ========================================
export async function markNotificationAsSent(id: string) {
    // Administracion de la cola de notificaciones: solo superadmin. Sin esto la
    // action queda expuesta como endpoint POST publico.
    await assertSuperadmin();
    try {
        const notification = await prisma.notification.update({
            where: { id },
            data: {
                status: NotificationStatus.SENT,
                sentAt: new Date(),
            },
            include: {
                user: true,
            },
        });

        return {
            success: true,
            notification,
        };
    } catch (error) {
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Error al marcar notificación como enviada",
        };
    }
}

// ========================================
// UPDATE - Marcar como fallida
// ========================================
export async function markNotificationAsFailed(id: string) {
    // Administracion de la cola de notificaciones: solo superadmin. Sin esto la
    // action queda expuesta como endpoint POST publico.
    await assertSuperadmin();
    try {
        const notification = await prisma.notification.update({
            where: { id },
            data: {
                status: NotificationStatus.FAILED,
            },
            include: {
                user: true,
            },
        });

        return {
            success: true,
            notification,
        };
    } catch (error) {
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Error al marcar notificación como fallida",
        };
    }
}

// ========================================
// DELETE - Eliminar notificación
// ========================================
export async function deleteNotification(id: string) {
    // Administracion de la cola de notificaciones: solo superadmin. Sin esto la
    // action queda expuesta como endpoint POST publico.
    await assertSuperadmin();
    try {
        await prisma.notification.delete({
            where: { id },
        });

        return {
            success: true,
            message: "Notificación eliminada exitosamente",
        };
    } catch (error) {
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Error al eliminar la notificación",
        };
    }
}

// ========================================
// DELETE - Limpiar notificaciones antiguas
// ========================================
export async function cleanOldNotifications(daysOld: number = 30) {
    // Administracion de la cola de notificaciones: solo superadmin. Sin esto la
    // action queda expuesta como endpoint POST publico.
    await assertSuperadmin();
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const result = await prisma.notification.deleteMany({
            where: {
                AND: [
                    { createdAt: { lt: cutoffDate } },
                    { status: NotificationStatus.SENT },
                ],
            },
        });

        return {
            success: true,
            deletedCount: result.count,
            message: `${result.count} notificaciones eliminadas`,
        };
    } catch (error) {
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Error al limpiar notificaciones antiguas",
        };
    }
}

// ========================================
// READ - Obtener notificaciones pendientes
// ========================================
export async function getPendingNotifications() {
    // Administracion de la cola de notificaciones: solo superadmin. Sin esto la
    // action queda expuesta como endpoint POST publico.
    await assertSuperadmin();
    try {
        const notifications = await prisma.notification.findMany({
            where: {
                status: NotificationStatus.PENDING,
                OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }],
            },
            orderBy: { createdAt: "asc" },
            include: {
                user: true,
            },
        });

        return {
            success: true,
            notifications,
            count: notifications.length,
        };
    } catch (error) {
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Error al obtener notificaciones pendientes",
        };
    }
}

// ========================================
// CREATE - Crear notificación en masa
// ========================================
// ========================================
// UTILITY - Notificar nuevos torneos por categoría
// ========================================
export async function notifyNewTournament(
    torneoId: number,
    torneoNombre: string,
    categoria: string,
) {
    // Administracion de la cola de notificaciones: solo superadmin. Sin esto la
    // action queda expuesta como endpoint POST publico.
    await assertSuperadmin();
    try {
        if (!categoria) {
            return {
                success: false,
                error: "La categoría del torneo es requerida",
            };
        }

        const gate = await assertNotificacionesHabilitadas(torneoId);
        if (!gate.enabled) return gate.response;

        // 1. Buscar todos los usuarios con esa categoría
        const usuarios = await prisma.user.findMany({
            where: {
                categoria: categoria,
                deletedAt: null,
            },
            select: {
                id: true,
                name: true,
                lastname: true,
            },
        });

        if (usuarios.length === 0) {
            return {
                success: true,
                notificationsCreated: 0,
                message: "No hay jugadores en esa categoría",
            };
        }

        // 2. Buscar qué usuarios tienen pushTokens
        const usuariosConTokens = await prisma.pushToken.findMany({
            where: {
                userId: {
                    in: usuarios.map((u) => u.id),
                },
            },
            select: {
                userId: true,
            },
            distinct: ["userId"],
        });

        const userIdsConTokens = usuariosConTokens
            .map((t) => t.userId)
            .filter((id): id is number => typeof id === "number");

        if (userIdsConTokens.length === 0) {
            return {
                success: true,
                notificationsCreated: 0,
                message:
                    "Ningún jugador de esa categoría tiene tokens push registrados",
            };
        }

        // 3. Respetar las preferencias del jugador, igual que notifyMatchSchedule
        const preferencias = await prisma.user.findMany({
            where: { id: { in: userIdsConTokens } },
            select: { id: true, notificationPreferences: true },
        });

        const habilitados = preferencias
            .filter((usuario) => {
                const prefs = usuario.notificationPreferences as Record<
                    string,
                    boolean
                > | null;

                return prefs?.[NotificationType.NEW_TOURNAMENT] !== false;
            })
            .map((usuario) => usuario.id);

        if (habilitados.length === 0) {
            return {
                success: true,
                notificationsCreated: 0,
                message:
                    "Ningún jugador de esa categoría tiene habilitadas estas notificaciones",
            };
        }

        // 4. Crear notificaciones para cada usuario con token
        const notificationsToCreate = habilitados.map((userId) => ({
            userId,
            type: NotificationType.NEW_TOURNAMENT,
            title: "🏆 Nuevo Torneo Disponible",
            body: `Se ha creado un nuevo torneo: ${torneoNombre} de categoría ${categoria}. ¡Inscríbete ahora!`,
            metadata: {
                torneoId,
                torneoNombre,
                categoria,
            },
        }));

        const result = await createBulkNotifications(notificationsToCreate);

        if (result.success) {
            return {
                success: true,
                notificationsCreated: result.created,
                message: `Se enviaron ${result.created} notificaciones a jugadores de categoría ${categoria}`,
            };
        }

        return result;
    } catch (error) {
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Error al notificar sobre el nuevo torneo",
        };
    }
}

// ========================================
// UTILITY - Notificar partidos a jugadores
// ========================================
export async function notifyMatchSchedule(
    pareja1Id: number | null,
    pareja2Id: number | null,
    horario: Date | string | null,
    cancha: string | null,
    torneo: { nombre: string; id: number } | null,
) {
    // Administracion de la cola de notificaciones: solo superadmin. Sin esto la
    // action queda expuesta como endpoint POST publico.
    await assertSuperadmin();
    try {
        if (!horario) {
            return {
                success: true,
                notificationsCreated: 0,
                message: "No hay horario definido para el partido",
            };
        }

        if (torneo) {
            const gate = await assertNotificacionesHabilitadas(torneo.id);
            if (!gate.enabled) return gate.response;
        }

        const horarioDate =
            typeof horario === "string" ? new Date(horario) : horario;

        // Obtener los jugadores de ambas parejas
        const parejaIds = [pareja1Id, pareja2Id].filter(
            (id): id is number => typeof id === "number",
        );

        if (parejaIds.length === 0) {
            return {
                success: true,
                notificationsCreated: 0,
                message: "No hay parejas asignadas al partido",
            };
        }

        // Buscar todas las parejas y sus jugadores. Ojo: en el modelo Pareja
        // las FK son player1Id/player2Id (jugador1/jugador2 son las relaciones).
        const parejas = await prisma.pareja.findMany({
            where: {
                id: { in: parejaIds },
            },
            select: {
                player1Id: true,
                player2Id: true,
            },
        });

        const jugadorIds = parejas.flatMap((p) => [p.player1Id, p.player2Id]);

        if (jugadorIds.length === 0) {
            return {
                success: true,
                notificationsCreated: 0,
                message: "No hay jugadores en las parejas",
            };
        }

        // Buscar usuarios que tengan pushTokens y preferencias habilitadas
        const usuarios = await prisma.user.findMany({
            where: {
                id: { in: jugadorIds },
                deletedAt: null,
                pushTokens: {
                    some: {},
                },
            },
            select: {
                id: true,
                name: true,
                notificationPreferences: true,
            },
        });

        if (usuarios.length === 0) {
            return {
                success: true,
                notificationsCreated: 0,
                message: "Ningún jugador tiene tokens push registrados",
            };
        }

        // Crear notificaciones de recordatorio del partido
        const notificationsToCreate: NotificationCreate[] = [];

        usuarios.forEach((usuario) => {
            const prefs =
                (usuario.notificationPreferences as Record<string, boolean>) || {};

            // Notificación del día del partido
            if (prefs[NotificationType.MATCH_REMINDER] !== false) {
                notificationsToCreate.push({
                    userId: usuario.id,
                    type: NotificationType.MATCH_REMINDER,
                    title: "📅 Recordatorio: Tienes un partido hoy",
                    body: `Tu partido en ${cancha || "cancha por confirmar"} ${torneo ? `del torneo ${torneo.nombre}` : ""}`,
                    scheduledAt: horarioDate,
                    metadata: {
                        horario: horarioDate.toISOString(),
                        cancha,
                        torneoId: torneo?.id,
                    },
                });
            }

            // Notificación 1 hora antes del partido
            if (prefs[NotificationType.MATCH_1H_REMINDER] !== false) {
                const oneHourBefore = new Date(horarioDate);
                oneHourBefore.setHours(oneHourBefore.getHours() - 1);

                notificationsToCreate.push({
                    userId: usuario.id,
                    type: NotificationType.MATCH_1H_REMINDER,
                    title: "⏰ Tu partido comienza en 1 hora",
                    body: `${cancha || "Cancha por confirmar"} - ${torneo ? torneo.nombre : ""}`,
                    scheduledAt: oneHourBefore,
                    metadata: {
                        horario: horarioDate.toISOString(),
                        cancha,
                        torneoId: torneo?.id,
                    },
                });
            }
        });

        if (notificationsToCreate.length === 0) {
            return {
                success: true,
                notificationsCreated: 0,
                message: "Ningún usuario tiene las preferencias habilitadas",
            };
        }

        const result = await createBulkNotifications(notificationsToCreate);

        if (result.success) {
            return {
                success: true,
                notificationsCreated: result.created,
                message: `Se crearon ${result.created} notificaciones para el partido`,
            };
        }

        return result;
    } catch (error) {
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Error al crear notificaciones del partido",
        };
    }
}