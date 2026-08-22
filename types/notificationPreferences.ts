import { z } from "zod";
import { NotificationType } from "@/types/notification";


// Schema para preferencias individuales de notificaciones
export const NotificationPreferenceSchema = z.object({
    [NotificationType.NEW_TOURNAMENT]: z.boolean(),
    [NotificationType.MATCH_REMINDER]: z.boolean(),
    [NotificationType.MATCH_1H_REMINDER]: z.boolean(),
    [NotificationType.MATCH_CHANGED]: z.boolean(),
    [NotificationType.TOURNAMENT_START]: z.boolean(),
    [NotificationType.TOURNAMENT_UPDATE]: z.boolean(),
    [NotificationType.RESULT_UPDATE]: z.boolean(),
});


// Schema para actualizar preferencias
export const UpdateNotificationPreferencesSchema = z.object({
    userId: z.number().int().positive(),
    preferences: NotificationPreferenceSchema.partial().optional(),
    enableAll: z.boolean().optional(),
    disableAll: z.boolean().optional(),
});


// Type inferido
export type NotificationPreferences = z.infer<
    typeof NotificationPreferenceSchema
>;
export type UpdateNotificationPreferencesData = z.infer<
    typeof UpdateNotificationPreferencesSchema
>;


// Preferencias por defecto
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
    [NotificationType.MATCH_REMINDER]: true,
    [NotificationType.MATCH_1H_REMINDER]: true,
    [NotificationType.MATCH_CHANGED]: true,
    [NotificationType.TOURNAMENT_START]: true,
    [NotificationType.TOURNAMENT_UPDATE]: true,
    [NotificationType.NEW_TOURNAMENT]: true,
    [NotificationType.RESULT_UPDATE]: true,
};


// Mapeo de tipos a labels
export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
    [NotificationType.MATCH_REMINDER]: "Recordatorios día de Partido",
    [NotificationType.MATCH_1H_REMINDER]:
        "Recordatorios 1 hora antes del Partido",
    [NotificationType.MATCH_CHANGED]: "Cambios en Partidos",
    [NotificationType.TOURNAMENT_START]: "Inicio de Torneos",
    [NotificationType.TOURNAMENT_UPDATE]: "Actualizaciones de Torneos",
    [NotificationType.NEW_TOURNAMENT]: "Nuevos Torneos de tu Categoría",
    [NotificationType.RESULT_UPDATE]: "Actualizaciones de Resultados",
};


// Mapeo de tipos a descripciones
export const NOTIFICATION_TYPE_DESCRIPTIONS: Record<NotificationType, string> =
{
    [NotificationType.MATCH_REMINDER]:
        "Recordatorios cuando tienes un partido programado",
    [NotificationType.MATCH_1H_REMINDER]:
        "Recordatorio una hora antes de tu partido",
    [NotificationType.MATCH_CHANGED]:
        "Notificación cuando se modifica un partido",
    [NotificationType.TOURNAMENT_START]: "Aviso cuando comienza un torneo",
    [NotificationType.TOURNAMENT_UPDATE]:
        "Actualizaciones de torneos donde participas",
    [NotificationType.NEW_TOURNAMENT]:
        "Nuevos torneos disponibles en tu categoría",
    [NotificationType.RESULT_UPDATE]: "Cambios en resultados y rankings",
};