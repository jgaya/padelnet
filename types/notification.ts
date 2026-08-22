import { z } from "zod";

// Tipos de notificaciones permitidos
export enum NotificationType {
    MATCH_REMINDER = "MATCH_REMINDER",
    MATCH_1H_REMINDER = "MATCH_1H_REMINDER",
    MATCH_CHANGED = "MATCH_CHANGED",
    TOURNAMENT_START = "TOURNAMENT_START",
    TOURNAMENT_UPDATE = "TOURNAMENT_UPDATE",
    NEW_TOURNAMENT = "NEW_TOURNAMENT",
    RESULT_UPDATE = "RESULT_UPDATE",
}

// Estados de notificación. Los valores deben coincidir con el enum
// NotificationStatus de Prisma, que los guarda en mayusculas.
export enum NotificationStatus {
    PENDING = "PENDING",
    SENT = "SENT",
    FAILED = "FAILED",
}

// Schema Zod para crear notificación
export const NotificationCreateSchema = z.object({
    userId: z.number().int().positive(),
    type: z.nativeEnum(NotificationType),
    title: z.string().min(1, "El título es requerido").max(200),
    body: z.string().min(1, "El cuerpo es requerido").max(1000),
    scheduledAt: z.date().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});

// Schema Zod para actualizar notificación
export const NotificationUpdateSchema = z.object({
    id: z.string(),
    title: z.string().min(1).max(200).optional(),
    body: z.string().min(1).max(1000).optional(),
    scheduledAt: z.date().nullable().optional(),
    status: z.nativeEnum(NotificationStatus).optional(),
    sentAt: z.date().nullable().optional(),
});

// Schema Zod para filtrar notificaciones
export const NotificationFilterSchema = z.object({
    userId: z.number().int().positive().optional(),
    type: z.nativeEnum(NotificationType).optional(),
    status: z.nativeEnum(NotificationStatus).optional(),
    limit: z.number().int().positive().default(50).optional(),
    offset: z.number().int().nonnegative().default(0).optional(),
});

// Types inferidos de Zod
export type NotificationCreate = z.infer<typeof NotificationCreateSchema>;
export type NotificationUpdate = z.infer<typeof NotificationUpdateSchema>;
export type NotificationFilter = z.infer<typeof NotificationFilterSchema>;

export type Notification = {
    id: string;
    userId: number;
    type: NotificationType;
    title: string;
    body: string;
    scheduledAt: Date | null;
    sentAt: Date | null;
    status: NotificationStatus;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
};