"use server";

import { assertSuperadmin } from "@/lib/authz";
import { firebaseAdmin } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const TOKEN_NOT_REGISTERED = "messaging/registration-token-not-registered";

type SendPushInput = {
  userId: number;
  title: string;
  body: string;
};

/** Extrae el codigo de error de firebase-admin sin asumir la forma del error. */
function firebaseErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;

  const candidate = error as {
    code?: unknown;
    errorInfo?: { code?: unknown };
  };

  if (typeof candidate.code === "string") return candidate.code;
  if (typeof candidate.errorInfo?.code === "string") {
    return candidate.errorInfo.code;
  }

  return null;
}

/**
 * Registra el token de push del dispositivo contra el usuario logueado.
 *
 * El userId sale de la sesion y no del parametro: antes cualquiera podia
 * asociar SU token al id de otro usuario y quedarse recibiendo las
 * notificaciones de esa persona.
 */
export async function saveToken(token: string) {
  try {
    if (!token) {
      return { success: false, message: "Missing token" };
    }

    const session = await getSession();
    if (!session) {
      return { success: false, message: "No autorizado" };
    }

    const userId = session.userId;

    await prisma.pushToken.upsert({
      where: { token },
      update: {
        userId,
        platform: "WEB",
      },
      create: {
        token,
        userId,
        platform: "WEB",
      },
    });
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "No se pudo guardar el token",
    };
  }

  return { success: true };
}

/**
 * Envio manual de un push. Solo superadmin: expuesta sin guard permitiria
 * mandarle cualquier mensaje a cualquier usuario.
 *
 * El envio real de la cola no pasa por aca, va por lib/push.ts desde
 * cron/notification-cron.ts.
 */
export async function sendPush({ userId, title, body }: SendPushInput) {
  try {
    await assertSuperadmin();

    const tokens = await prisma.pushToken.findMany({
      where: { userId },
    });

    for (const pushToken of tokens) {
      try {
        await firebaseAdmin.send({
          token: pushToken.token,
          notification: { title, body },
        });
      } catch (error) {
        if (firebaseErrorCode(error) === TOKEN_NOT_REGISTERED) {
          // El token ya no sirve: lo sacamos para no reintentarlo siempre.
          await prisma.pushToken.delete({
            where: { token: pushToken.token },
          });
        }
      }
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "No se pudo enviar el push",
    };
  }
}
