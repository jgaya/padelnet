"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import {
    NotificationPreferenceSchema,
    UpdateNotificationPreferencesSchema,
    DEFAULT_NOTIFICATION_PREFERENCES,
    type NotificationPreferences,
    type UpdateNotificationPreferencesData,
} from "@/types/notificationPreferences";

/**
 * Arma un set completo de preferencias con el mismo valor. Las claves salen de
 * DEFAULT_NOTIFICATION_PREFERENCES en vez de estar escritas a mano, asi no se
 * desincroniza cuando se agregue o se comente un tipo de notificacion.
 */
/**
 * Usuario sobre el que operan estas acciones: siempre el de la sesion.
 *
 * Antes el userId llegaba por parametro y no se validaba nada, asi que cualquiera
 * podia leer y modificar las preferencias de cualquier otro. Los parametros
 * userId se sacaron de la firma para que no haya forma de volver a introducirlo.
 */
async function requireUserId() {
    const session = await getSession();
    if (!session) throw new Error("No autorizado");
    return session.userId;
}

function allPreferences(value: boolean): NotificationPreferences {
    return Object.fromEntries(
        Object.keys(DEFAULT_NOTIFICATION_PREFERENCES).map((key) => [key, value]),
    ) as NotificationPreferences;
}

// ========================================
// READ - Obtener preferencias de un usuario
// ========================================
export async function getUserNotificationPreferences() {
    try {
        const userId = await requireUserId();

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                notificationPreferences: true,
            },
        });

        if (!user) {
            return {
                success: false,
                error: "Usuario no encontrado",
            };
        }

        const preferences =
            user.notificationPreferences as NotificationPreferences | null;

        return {
            success: true,
            preferences: preferences || DEFAULT_NOTIFICATION_PREFERENCES,
        };
    } catch (error) {
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Error al obtener preferencias de notificaciones",
        };
    }
}

// ========================================
// UPDATE - Actualizar preferencias de notificaciones
// ========================================
export async function updateUserNotificationPreferences(
    data: Omit<UpdateNotificationPreferencesData, "userId">,
) {
    try {
        const userId = await requireUserId();
        // El userId lo pone la sesion: si viniera en `data` se ignora.
        const validatedData = UpdateNotificationPreferencesSchema.parse({
            ...data,
            userId,
        });

        // Obtener preferencias actuales
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { notificationPreferences: true },
        });

        if (!user) {
            return {
                success: false,
                error: "Usuario no encontrado",
            };
        }

        const currentPreferences =
            (user.notificationPreferences as NotificationPreferences) ||
            DEFAULT_NOTIFICATION_PREFERENCES;

        let newPreferences: NotificationPreferences;

        // Si enableAll = true, habilitar todas
        if (validatedData.enableAll) {
            newPreferences = allPreferences(true);
        }
        // Si disableAll = true, deshabilitar todas
        else if (validatedData.disableAll) {
            newPreferences = allPreferences(false);
        }
        // Si viene preferences, hacer merge con las actuales
        else if (validatedData.preferences) {
            newPreferences = {
                ...currentPreferences,
                ...validatedData.preferences,
            };
        } else {
            return {
                success: false,
                error: "Debe proporcionar preferencias o enableAll/disableAll",
            };
        }

        // Validar que las nuevas preferencias cumplan el schema
        const validatedPreferences =
            NotificationPreferenceSchema.parse(newPreferences);

        // Actualizar en la BD
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                notificationPreferences: validatedPreferences,
            },
            select: {
                id: true,
                name: true,
                email: true,
                notificationPreferences: true,
            },
        });

        return {
            success: true,
            preferences:
                updatedUser.notificationPreferences as NotificationPreferences,
            message: "Preferencias de notificaciones actualizadas exitosamente",
        };
    } catch (error) {
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Error al actualizar preferencias de notificaciones",
        };
    }
}

// ========================================
// UPDATE - Actualizar una preferencia específica
// ========================================
export async function toggleNotificationPreference(
    preferenceKey: keyof NotificationPreferences,
) {
    try {
        const userId = await requireUserId();

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { notificationPreferences: true },
        });

        if (!user) {
            return {
                success: false,
                error: "Usuario no encontrado",
            };
        }

        const currentPreferences =
            (user.notificationPreferences as NotificationPreferences) ||
            DEFAULT_NOTIFICATION_PREFERENCES;

        const newPreferences = {
            ...currentPreferences,
            [preferenceKey]: !currentPreferences[preferenceKey],
        };

        const validatedPreferences =
            NotificationPreferenceSchema.parse(newPreferences);

        await prisma.user.update({
            where: { id: userId },
            data: {
                notificationPreferences: validatedPreferences,
            },
        });

        return {
            success: true,
            preferences: validatedPreferences,
            message: `Preferencia ${preferenceKey} actualizada`,
        };
    } catch (error) {
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Error al actualizar la preferencia",
        };
    }
}

// ========================================
// UPDATE - Resetear a valores por defecto
// ========================================
export async function resetNotificationPreferences() {
    try {
        const userId = await requireUserId();

        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return {
                success: false,
                error: "Usuario no encontrado",
            };
        }

        await prisma.user.update({
            where: { id: userId },
            data: {
                notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
            },
        });

        return {
            success: true,
            preferences: DEFAULT_NOTIFICATION_PREFERENCES,
            message: "Preferencias reseteadas a valores por defecto",
        };
    } catch (error) {
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Error al resetear preferencias",
        };
    }
}