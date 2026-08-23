import "server-only";
import admin from "firebase-admin";

function initAdminApp() {
  if (admin.apps.length) return admin.app();

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin no esta configurado: faltan NEXT_PUBLIC_FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL o FIREBASE_PRIVATE_KEY",
    );
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
  });
}

/**
 * Lazy a proposito: antes el modulo llamaba a admin.messaging() al importarse,
 * asi que si faltaba una credencial explotaba toda ruta que lo importara,
 * aunque no fuera a mandar ningun push.
 */
export function getFirebaseMessaging() {
  return admin.messaging(initAdminApp());
}

/**
 * Verifica el ID token que devuelve el popup de Google en el cliente.
 *
 * Es lo que convierte "el navegador dice que es fulano" en algo confiable: la
 * firma la valida Firebase contra las claves publicas de Google, asi que un
 * token fabricado a mano no pasa.
 */
export function verificarIdToken(idToken: string) {
  return admin.auth(initAdminApp()).verifyIdToken(idToken);
}

export const firebaseAdmin = {
  send: (...args: Parameters<admin.messaging.Messaging["send"]>) =>
    getFirebaseMessaging().send(...args),
  sendEachForMulticast: (
    ...args: Parameters<admin.messaging.Messaging["sendEachForMulticast"]>
  ) => getFirebaseMessaging().sendEachForMulticast(...args),
};
