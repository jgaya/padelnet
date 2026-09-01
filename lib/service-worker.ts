/**
 * Registro del service worker, en un solo lugar.
 *
 * Lo usan dos: ServiceWorkerRegistrar (que lo dispara al cargar la app) y
 * getFcmToken (que necesita la registration para pasarsela a Firebase). Por eso
 * la promesa se cachea en el modulo: los dos tienen que terminar hablando del
 * MISMO worker, o se vuelve al problema de dos registrations peleando el scope.
 *
 * Sin "server-only": corre en el navegador.
 */

/** El worker viejo, que este reemplaza. Ver public/sw.js. */
const WORKER_VIEJO = "firebase-messaging-sw.js";

let registroPromesa: Promise<ServiceWorkerRegistration | null> | null = null;

function soportado() {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator;
}

/**
 * Desregistra el firebase-messaging-sw.js que dejaron las versiones anteriores.
 *
 * Hace falta aunque el archivo ya no exista en el repo: el navegador conserva
 * el worker instalado hasta que falle una comprobacion de actualizacion, y
 * mientras tanto sigue peleando el scope con el nuevo. Borrarlo a mano deja el
 * cambio determinista en vez de depender de cuando el navegador se de cuenta.
 */
async function limpiarWorkerViejo() {
  try {
    const registros = await navigator.serviceWorker.getRegistrations();

    await Promise.all(
      registros
        .filter((registro) => {
          const script =
            registro.active?.scriptURL ??
            registro.waiting?.scriptURL ??
            registro.installing?.scriptURL ??
            "";

          return script.endsWith(WORKER_VIEJO);
        })
        .map((registro) => registro.unregister()),
    );
  } catch (error) {
    // Que falle la limpieza no puede impedir que se registre el nuevo.
    console.error("No se pudo limpiar el service worker viejo", error);
  }
}

/**
 * Registra /sw.js una sola vez por carga de pagina y devuelve su registration.
 *
 * Devuelve null si el navegador no soporta service workers o si el registro
 * falla: quien llame tiene que poder seguir sin worker. La app funciona igual,
 * pierde la pantalla de offline y las push en segundo plano.
 */
export function registrarServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (registroPromesa) {
    return registroPromesa;
  }

  registroPromesa = (async () => {
    if (!soportado()) {
      return null;
    }

    // En desarrollo el worker molesta mas de lo que ayuda: sirve estaticos
    // viejos entre recargas y confunde al depurar. Para probarlo de verdad:
    // npm run build && npm start.
    if (process.env.NODE_ENV !== "production") {
      await limpiarWorkerViejo();
      return null;
    }

    await limpiarWorkerViejo();

    try {
      return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    } catch (error) {
      console.error("No se pudo registrar el service worker", error);
      return null;
    }
  })();

  return registroPromesa;
}
