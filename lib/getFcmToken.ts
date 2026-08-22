import { getToken } from "firebase/messaging";

import { getMessagingInstance } from "./firebase";

export async function getFcmToken() {
  const messaging = await getMessagingInstance();
  if (!messaging) return null;

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.error("Falta NEXT_PUBLIC_FIREBASE_VAPID_KEY");
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  return getToken(messaging, { vapidKey });
}
