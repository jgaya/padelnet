import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getMessaging, isSupported, type Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function isFirebaseConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) return null;
  return getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
}

/**
 * Unica via para obtener messaging. Antes el modulo llamaba a getMessaging() en
 * el top level con solo un guard de `window`: eso tira excepcion en navegadores
 * sin soporte (Safari viejo, iOS fuera de PWA) y rompia cualquier pagina que
 * importara este archivo.
 */
export async function getMessagingInstance(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;

  const app = getFirebaseApp();
  if (!app) return null;

  if (!(await isSupported())) return null;

  return getMessaging(app);
}
