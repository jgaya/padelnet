"use server";

import { isComplejoFeatureEnabled } from "@/actions/complejo-features";
import { createBulkNotifications } from "@/lib/notificaciones";
import { prisma } from "@/lib/prisma";
import {
  cumpleCategoria,
  cumpleSexo,
  parseCategoriaNumber,
} from "@/lib/torneo-elegibilidad";
import { NotificationType, type NotificationCreate } from "@/types/notification";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
} from "@/types/notificationPreferences";

export type NotifyResult = {
  success: boolean;
  notificationsCreated: number;
  message?: string;
};

const SIN_NOTIFICACIONES: NotifyResult = {
  success: true,
  notificationsCreated: 0,
  message: "El complejo no tiene habilitadas las notificaciones",
};

type PreferenceKey = keyof NotificationPreferences;

function isPreferenceKey(type: NotificationType): type is PreferenceKey &
  NotificationType {
  return type in DEFAULT_NOTIFICATION_PREFERENCES;
}

function formatDateTime(value: Date | null) {
  if (!value) return "horario a confirmar";

  return value.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function buildCanchaLabel(
  cancha: { numero: number; name: string | null } | null,
) {
  if (!cancha) return "cancha a confirmar";
  return `Cancha ${cancha.numero}${cancha.name ? ` - ${cancha.name}` : ""}`;
}

/**
 * Resuelve el complejo del torneo y consulta el gate de funcionalidades.
 * Devuelve null si el torneo no existe o si el complejo no tiene habilitadas
 * las notificaciones.
 */
async function getTorneoHabilitado(torneoId: number) {
  const torneo = await prisma.torneo.findUnique({
    where: { id: torneoId },
    select: {
      id: true,
      nombre: true,
      inicio: true,
      evento: { select: { complejoId: true } },
    },
  });

  if (!torneo) return null;

  const habilitado = await isComplejoFeatureEnabled(
    torneo.evento.complejoId,
    "NOTIFICACIONES",
  );

  return habilitado ? torneo : null;
}

/**
 * De una lista de jugadores deja solo los que pueden y quieren recibir ese tipo
 * de notificacion: tienen push token registrado y no lo desactivaron en sus
 * preferencias. Sin preferencias guardadas rige el default del catalogo.
 */
async function filtrarDestinatarios(
  userIds: number[],
  type: NotificationType,
): Promise<number[]> {
  const unicos = Array.from(new Set(userIds)).filter((id) =>
    Number.isInteger(id),
  );
  if (unicos.length === 0) return [];

  const conToken = await prisma.pushToken.findMany({
    where: { userId: { in: unicos } },
    select: { userId: true },
    distinct: ["userId"],
  });

  const idsConToken = conToken
    .map((token) => token.userId)
    .filter((id): id is number => typeof id === "number");

  if (idsConToken.length === 0) return [];

  const usuarios = await prisma.user.findMany({
    where: { id: { in: idsConToken }, deletedAt: null, isActive: true },
    select: { id: true, notificationPreferences: true },
  });

  const defaultEnabled = isPreferenceKey(type)
    ? DEFAULT_NOTIFICATION_PREFERENCES[type]
    : true;

  return usuarios
    .filter((usuario) => {
      const prefs = usuario.notificationPreferences as Record<
        string,
        boolean
      > | null;

      if (!prefs || typeof prefs[type] !== "boolean") return defaultEnabled;
      return prefs[type];
    })
    .map((usuario) => usuario.id);
}

/** Jugadores inscriptos en el torneo (ambos integrantes de cada pareja). */
async function getJugadoresDelTorneo(torneoId: number): Promise<number[]> {
  const parejas = await prisma.pareja.findMany({
    where: { torneoId, deletedAt: null },
    select: { player1Id: true, player2Id: true },
  });

  return parejas.flatMap((pareja) => [pareja.player1Id, pareja.player2Id]);
}

async function persistir(
  notifications: NotificationCreate[],
): Promise<NotifyResult> {
  if (notifications.length === 0) {
    return { success: true, notificationsCreated: 0 };
  }

  const result = await createBulkNotifications(notifications);

  if (!result.success) {
    return {
      success: false,
      notificationsCreated: 0,
      message: result.error,
    };
  }

  return { success: true, notificationsCreated: result.created ?? 0 };
}

/**
 * Envuelve cada disparador: una notificacion que falla nunca debe voltear la
 * operacion de negocio que la origino (guardar un torneo, una grilla, etc.).
 */
async function safe(
  label: string,
  fn: () => Promise<NotifyResult>,
): Promise<NotifyResult> {
  try {
    return await fn();
  } catch (error) {
    console.error(`[notificaciones] ${label}`, error);
    return {
      success: false,
      notificationsCreated: 0,
      message: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

// ========================================
// Torneo publicado -> NEW_TOURNAMENT
// ========================================
export async function notifyTorneoPublicado(
  torneoId: number,
): Promise<NotifyResult> {
  return safe("torneoPublicado", async () => {
    const torneo = await getTorneoHabilitado(torneoId);
    if (!torneo) return SIN_NOTIFICACIONES;

    const detalle = await prisma.torneo.findUnique({
      where: { id: torneoId },
      select: {
        nombre: true,
        sexo: true,
        categoriaRegla: true,
        categoriaN: true,
        evento: {
          select: { complejo: { select: { name: true } } },
        },
      },
    });

    if (!detalle) return { success: true, notificationsCreated: 0 };

    // Audiencia: jugadores de la plataforma que cumplen las reglas de sexo y
    // categoria del torneo (decision de producto: no se restringe al club).
    // Ojo: no se compara contra categoriaCode, que es el codigo de la regla
    // ("=7") y nunca coincide con la categoria del jugador ("7", "7ma").
    const usuarios = await prisma.user.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, categoria: true, genero: true },
    });

    const elegibles = usuarios
      .filter(
        (usuario) =>
          cumpleSexo(detalle.sexo, usuario.genero) &&
          cumpleCategoria(
            detalle.categoriaRegla,
            detalle.categoriaN,
            parseCategoriaNumber(usuario.categoria),
          ),
      )
      .map((usuario) => usuario.id);

    const destinatarios = await filtrarDestinatarios(
      elegibles,
      NotificationType.NEW_TOURNAMENT,
    );

    return persistir(
      destinatarios.map((userId) => ({
        userId,
        type: NotificationType.NEW_TOURNAMENT,
        title: "Nuevo torneo disponible",
        body: `${detalle.nombre} en ${detalle.evento.complejo.name}. Ya podes inscribirte.`,
        metadata: { torneoId },
      })),
    );
  });
}

// ========================================
// Torneo en curso -> TOURNAMENT_START
// ========================================
export async function notifyTorneoIniciado(
  torneoId: number,
): Promise<NotifyResult> {
  return safe("torneoIniciado", async () => {
    const torneo = await getTorneoHabilitado(torneoId);
    if (!torneo) return SIN_NOTIFICACIONES;

    const destinatarios = await filtrarDestinatarios(
      await getJugadoresDelTorneo(torneoId),
      NotificationType.TOURNAMENT_START,
    );

    return persistir(
      destinatarios.map((userId) => ({
        userId,
        type: NotificationType.TOURNAMENT_START,
        title: "Comienza el torneo",
        body: `${torneo.nombre} ya esta en curso. Revisa tus partidos.`,
        metadata: { torneoId },
      })),
    );
  });
}

// ========================================
// Torneo editado -> TOURNAMENT_UPDATE
// ========================================
export async function notifyTorneoActualizado(
  torneoId: number,
  cambios: string[],
): Promise<NotifyResult> {
  return safe("torneoActualizado", async () => {
    if (cambios.length === 0) {
      return { success: true, notificationsCreated: 0 };
    }

    const torneo = await getTorneoHabilitado(torneoId);
    if (!torneo) return SIN_NOTIFICACIONES;

    const destinatarios = await filtrarDestinatarios(
      await getJugadoresDelTorneo(torneoId),
      NotificationType.TOURNAMENT_UPDATE,
    );

    return persistir(
      destinatarios.map((userId) => ({
        userId,
        type: NotificationType.TOURNAMENT_UPDATE,
        title: "Cambios en tu torneo",
        body: `${torneo.nombre}: ${cambios.join(", ")}.`,
        metadata: { torneoId, cambios },
      })),
    );
  });
}

// ========================================
// Grilla guardada -> MATCH_REMINDER + MATCH_1H_REMINDER
// ========================================
export async function notifyPartidosProgramados(
  torneoId: number,
): Promise<NotifyResult> {
  return safe("partidosProgramados", async () => {
    const torneo = await getTorneoHabilitado(torneoId);
    if (!torneo) return SIN_NOTIFICACIONES;

    // La grilla se regenera entera, asi que los recordatorios pendientes de
    // este torneo quedaron apuntando a horarios viejos. Los ya enviados no se
    // tocan.
    await prisma.notification.deleteMany({
      where: {
        status: "PENDING",
        type: {
          in: [
            NotificationType.MATCH_REMINDER,
            NotificationType.MATCH_1H_REMINDER,
          ],
        },
        metadata: { path: "$.torneoId", equals: torneoId },
      },
    });

    const partidos = await prisma.partido.findMany({
      where: {
        torneoId,
        deletedAt: null,
        scheduledAt: { not: null },
        status: { not: "CANCELLED" },
      },
      select: {
        id: true,
        scheduledAt: true,
        cancha: { select: { numero: true, name: true } },
        pareja1: { select: { player1Id: true, player2Id: true } },
        pareja2: { select: { player1Id: true, player2Id: true } },
      },
    });

    const notifications: NotificationCreate[] = [];

    for (const partido of partidos) {
      const scheduledAt = partido.scheduledAt;
      if (!scheduledAt) continue;

      const jugadores = [
        partido.pareja1?.player1Id,
        partido.pareja1?.player2Id,
        partido.pareja2?.player1Id,
        partido.pareja2?.player2Id,
      ].filter((id): id is number => typeof id === "number");

      if (jugadores.length === 0) continue;

      const cancha = buildCanchaLabel(partido.cancha);
      const metadata = {
        torneoId,
        partidoId: partido.id,
        horario: scheduledAt.toISOString(),
      };

      const unaHoraAntes = new Date(scheduledAt);
      unaHoraAntes.setHours(unaHoraAntes.getHours() - 1);

      const [paraDia, para1h] = await Promise.all([
        filtrarDestinatarios(jugadores, NotificationType.MATCH_REMINDER),
        filtrarDestinatarios(jugadores, NotificationType.MATCH_1H_REMINDER),
      ]);

      for (const userId of paraDia) {
        notifications.push({
          userId,
          type: NotificationType.MATCH_REMINDER,
          title: "Tenes un partido hoy",
          body: `${torneo.nombre} - ${cancha} a las ${formatDateTime(scheduledAt)}.`,
          scheduledAt,
          metadata,
        });
      }

      for (const userId of para1h) {
        notifications.push({
          userId,
          type: NotificationType.MATCH_1H_REMINDER,
          title: "Tu partido empieza en 1 hora",
          body: `${torneo.nombre} - ${cancha}.`,
          scheduledAt: unaHoraAntes,
          metadata,
        });
      }
    }

    return persistir(notifications);
  });
}

export type PartidoCambio = {
  partidoId: number;
  jugadores: number[];
  detalle: string;
};

// ========================================
// Horario o cancha modificados -> MATCH_CHANGED
// ========================================
export async function notifyPartidosCambiados(
  torneoId: number,
  cambios: PartidoCambio[],
): Promise<NotifyResult> {
  return safe("partidosCambiados", async () => {
    if (cambios.length === 0) {
      return { success: true, notificationsCreated: 0 };
    }

    const torneo = await getTorneoHabilitado(torneoId);
    if (!torneo) return SIN_NOTIFICACIONES;

    const notifications: NotificationCreate[] = [];

    for (const cambio of cambios) {
      const destinatarios = await filtrarDestinatarios(
        cambio.jugadores,
        NotificationType.MATCH_CHANGED,
      );

      for (const userId of destinatarios) {
        notifications.push({
          userId,
          type: NotificationType.MATCH_CHANGED,
          title: "Cambio en tu partido",
          body: `${torneo.nombre}: ${cambio.detalle}.`,
          metadata: { torneoId, partidoId: cambio.partidoId },
        });
      }
    }

    return persistir(notifications);
  });
}

// ========================================
// Resultado cargado -> RESULT_UPDATE
// ========================================
export async function notifyResultadoCargado(
  partidoId: number,
): Promise<NotifyResult> {
  return safe("resultadoCargado", async () => {
    const partido = await prisma.partido.findUnique({
      where: { id: partidoId },
      select: {
        id: true,
        torneoId: true,
        ganadorId: true,
        pareja1: { select: { id: true, player1Id: true, player2Id: true } },
        pareja2: { select: { id: true, player1Id: true, player2Id: true } },
        sets: {
          select: { numero: true, gamesPareja1: true, gamesPareja2: true },
          orderBy: { numero: "asc" },
        },
      },
    });

    if (!partido) return { success: true, notificationsCreated: 0 };

    const torneo = await getTorneoHabilitado(partido.torneoId);
    if (!torneo) return SIN_NOTIFICACIONES;

    const jugadores = [
      partido.pareja1?.player1Id,
      partido.pareja1?.player2Id,
      partido.pareja2?.player1Id,
      partido.pareja2?.player2Id,
    ].filter((id): id is number => typeof id === "number");

    const destinatarios = await filtrarDestinatarios(
      jugadores,
      NotificationType.RESULT_UPDATE,
    );

    const marcador =
      partido.sets.length > 0
        ? partido.sets
            .map((set) => `${set.gamesPareja1}-${set.gamesPareja2}`)
            .join(" / ")
        : "sin sets cargados";

    return persistir(
      destinatarios.map((userId) => ({
        userId,
        type: NotificationType.RESULT_UPDATE,
        title: "Resultado cargado",
        body: `${torneo.nombre}: ${marcador}.`,
        metadata: { torneoId: partido.torneoId, partidoId: partido.id },
      })),
    );
  });
}

/**
 * Avisa que la inscripcion de la pareja se dio de baja.
 *
 * `canceladaPorNombre` es el jugador que la dio de baja; null cuando la baja la
 * hizo el complejo desde el panel, que es un mensaje distinto.
 *
 * Se llama despues de commitear la baja, no dentro de la transaccion: que falle
 * el push no puede voltearla. `safe` ademas se traga cualquier error.
 */
export async function notifyInscripcionCancelada(
  torneoId: number,
  destinatarioId: number,
  canceladaPorNombre: string | null,
): Promise<NotifyResult> {
  return safe("inscripcionCancelada", async () => {
    const torneo = await getTorneoHabilitado(torneoId);
    if (!torneo) return SIN_NOTIFICACIONES;

    const destinatarios = await filtrarDestinatarios(
      [destinatarioId],
      NotificationType.TOURNAMENT_UPDATE,
    );

    const body = canceladaPorNombre
      ? `${canceladaPorNombre} dio de baja la inscripcion de la pareja en ${torneo.nombre}. Si queres jugar, anotate de nuevo con otro companero.`
      : `El complejo dio de baja tu inscripcion en ${torneo.nombre}. Consultales si necesitas mas informacion.`;

    return persistir(
      destinatarios.map((userId) => ({
        userId,
        type: NotificationType.TOURNAMENT_UPDATE,
        title: "Se dio de baja tu inscripcion",
        body,
        metadata: { torneoId },
      })),
    );
  });
}
