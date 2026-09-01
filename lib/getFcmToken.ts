import { getToken } from "firebase/messaging";

import { getMessagingInstance } from "./firebase";
import { registrarServiceWorker } from "./service-worker";

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

  // Sin este parametro, Firebase registra /firebase-messaging-sw.js por su
  // cuenta y quedan dos service workers peleando el scope raiz con /sw.js: gana
  // uno de los dos y las push dejan de llegar de forma intermitente. Pasandole
  // la registration, Firebase usa el worker que ya tenemos. Ver public/sw.js.
  const registration = await registrarServiceWorker();

  // `getToken` esta deprecado desde firebase 12 a favor de `register` +
  // `onRegistered`, que reciben las mismas opciones. Migrar cambia como se
  // obtienen y se refrescan los tokens, asi que va aparte de esto y hay que
  // probarlo contra el pipeline de push real.
  return getToken(messaging, {
    vapidKey,
    ...(registration ? { serviceWorkerRegistration: registration } : {}),
  });
}
