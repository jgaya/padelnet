"use client";

import { useEffect } from "react";
import { onMessage } from "firebase/messaging";
import { getMessagingInstance } from "@/lib/firebase";

export default function PushNotificationsListener() {
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function init() {
      const messaging = await getMessagingInstance();
      if (!messaging) return;

      unsubscribe = onMessage(messaging, (payload) => {
        console.log("📩 Foreground push", payload);

        if (payload.notification) {
          new Notification(payload.notification.title ?? "Notificación", {
            body: payload.notification.body,
            icon: "/icon.png",
          });
        }
      });
    }

    init();

    return () => {
      unsubscribe?.();
    };
  }, []);

  return null;
}
