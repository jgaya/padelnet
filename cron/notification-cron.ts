import "server-only";

import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";

const BATCH_SIZE = 100;

export type ProcessPendingResult = {
  processed: number;
  sent: number;
  failed: number;
};

/**
 * Envia las notificaciones pendientes cuya fecha programada ya paso.
 * Se dispara desde /api/cron/notifications: antes esto vivia en un node-cron
 * arrancado desde el layout, que no sobrevive en serverless y se duplicaba en
 * cada worker y en cada hot reload.
 */
export async function processPendingNotifications(): Promise<ProcessPendingResult> {
  const notifications = await prisma.notification.findMany({
    where: {
      status: "PENDING",
      scheduledAt: {
        lte: new Date(),
      },
    },
    take: BATCH_SIZE,
  });

  let sent = 0;
  let failed = 0;

  for (const notif of notifications) {
    try {
      await sendPushToUser({
        id: notif.id,
        userId: notif.userId,
        title: notif.title,
        body: notif.body,
        type: notif.type,
      });

      await prisma.notification.update({
        where: { id: notif.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
        },
      });
      sent += 1;
    } catch (error) {
      console.error("Push error", error);

      await prisma.notification.update({
        where: { id: notif.id },
        data: {
          status: "FAILED",
        },
      });
      failed += 1;
    }
  }

  return { processed: notifications.length, sent, failed };
}
