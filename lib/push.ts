import { prisma } from "@/lib/prisma";
import { firebaseAdmin } from "@/lib/firebase-admin";

const TOKEN_NOT_REGISTERED = "messaging/registration-token-not-registered";

// Ojo con el nombre: llamarlo "Notification" pisaba el tipo del DOM.
type PushNotificationInput = {
  id: string;
  userId: number;
  title: string;
  body: string;
  type: string;
};

export async function sendPushToUser(notification: PushNotificationInput) {
  const tokens = await prisma.pushToken.findMany({
    where: {
      userId: notification.userId,
    },
  });

  if (!tokens.length) return;

  const res = await firebaseAdmin.sendEachForMulticast({
    tokens: tokens.map((t) => t.token),
    notification: {
      title: notification.title,
      body: notification.body,
    },
    data: {
      type: notification.type,
      notificationId: notification.id,
    },
  });

  // for...of y no forEach(async): con forEach los await no se esperaban y la
  // limpieza de tokens muertos quedaba corriendo despues de retornar.
  for (const [index, response] of res.responses.entries()) {
    if (response.success) continue;

    if (response.error?.code === TOKEN_NOT_REGISTERED) {
      await prisma.pushToken.delete({
        where: { token: tokens[index].token },
      });
    }
  }
}
