"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

/**
 * Banner que invita a instalar la app.
 *
 * Son dos mundos distintos y por eso el componente tiene dos modos:
 *
 * - **Android y escritorio**: el navegador avisa con `beforeinstallprompt`
 *   cuando considera que la app es instalable. Se guarda ese evento y se le
 *   pide el prompt nativo cuando el usuario acepta.
 * - **iOS**: ese evento no existe y no hay forma de disparar la instalacion por
 *   codigo. Lo unico posible es explicar el camino manual (Compartir → Agregar
 *   a inicio). Sin esto, en iPhone nadie instala nunca; y como Safari solo
 *   entrega notificaciones web a apps instaladas, sin esto tampoco hay push.
 */

/** El evento no esta en lib.dom.d.ts porque no es estandar todavia. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const STORAGE_KEY = "padelnet-install-dismissed";

/** Cuanto se calla el banner despues de que lo cierran. */
const DIAS_SILENCIO = 30;

/**
 * Que corresponde mostrar, decidido con lo que dice el navegador.
 *
 * - `oculto`: ya esta instalada, o la cerraron hace poco.
 * - `ios`: hay que explicar el camino manual.
 * - `esperar`: se puede instalar por codigo, falta que el navegador avise.
 */
type ModoBanner = "oculto" | "ios" | "esperar";

function fueDescartadoHacePoco() {
  try {
    const guardado = window.localStorage.getItem(STORAGE_KEY);
    if (!guardado) return false;

    const cuando = Number(guardado);
    if (!Number.isFinite(cuando)) return false;

    return Date.now() - cuando < DIAS_SILENCIO * 24 * 60 * 60 * 1000;
  } catch {
    // El almacenamiento puede estar bloqueado. Sin memoria del descarte, pero
    // mejor mostrar el banner que romper.
    return false;
  }
}

function recordarDescarte() {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    // Igual que arriba: se pierde entre sesiones y no pasa nada.
  }
}

/** Ya esta instalada: corriendo como app y no como pestaña. */
function yaInstalada() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari en iOS no soporta display-mode y usa esto.
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

function esIOS() {
  const ua = window.navigator.userAgent;

  // El iPad moderno se declara Macintosh, asi que se lo detecta por el touch.
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  );
}

/**
 * Esto no es estado de React: es una lectura del navegador (user agent,
 * display-mode, localStorage) que no cambia durante la vida de la pagina. Se
 * modela como store externo por el mismo motivo que el tema en lib/tema.ts, y
 * ademas evita el `setState` sincronico dentro de un `useEffect`.
 */
function leerModo(): ModoBanner {
  if (yaInstalada() || fueDescartadoHacePoco()) return "oculto";
  return esIOS() ? "ios" : "esperar";
}

/** Nada a lo que suscribirse: el valor no cambia solo. */
function noSuscribir() {
  return () => {};
}

/** En el servidor no hay navegador, asi que no se dibuja nada. */
function modoEnServidor(): ModoBanner {
  return "oculto";
}

export default function InstallPrompt() {
  const modo = useSyncExternalStore(noSuscribir, leerModo, modoEnServidor);

  const [evento, setEvento] = useState<BeforeInstallPromptEvent | null>(null);
  const [cerrado, setCerrado] = useState(false);

  useEffect(() => {
    if (modo !== "esperar") return;

    const alPoderInstalar = (e: Event) => {
      // Frenar el mini-infobar de Chrome para mostrar el banner propio, que
      // explica de que se trata en vez de decir solo "Instalar".
      e.preventDefault();
      setEvento(e as BeforeInstallPromptEvent);
    };

    // Si la instalan desde el menu del navegador, sacar el banner.
    const alInstalar = () => setCerrado(true);

    window.addEventListener("beforeinstallprompt", alPoderInstalar);
    window.addEventListener("appinstalled", alInstalar);

    return () => {
      window.removeEventListener("beforeinstallprompt", alPoderInstalar);
      window.removeEventListener("appinstalled", alInstalar);
    };
  }, [modo]);

  const cerrar = useCallback(() => {
    recordarDescarte();
    setCerrado(true);
  }, []);

  const instalar = useCallback(async () => {
    if (!evento) return;

    await evento.prompt();
    await evento.userChoice;

    // El evento se consume: no se puede volver a llamar a prompt() con el
    // mismo. Se descarta pase lo que pase, y si dijo que no el navegador lo
    // volvera a ofrecer mas adelante por su cuenta.
    setEvento(null);
  }, [evento]);

  const visible =
    !cerrado && (modo === "ios" || (modo === "esperar" && evento !== null));

  if (!visible) {
    return null;
  }

  const enIOS = modo === "ios";

  return (
    <div
      role="dialog"
      aria-label="Instalar PadelNet"
      className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:bottom-4 sm:left-auto sm:right-4 sm:max-w-sm sm:p-0"
    >
      <div className="rounded-xl border border-content/10 bg-surface-raised p-4 shadow-lg">
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- el icono es
              un estatico de tamaño fijo; next/image aca solo agrega peso. */}
          <img
            src="/icons/icon-192.png"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-lg"
          />

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-content">
              Instala PadelNet
            </p>

            {enIOS ? (
              <p className="mt-1 text-sm text-content/70">
                Toca <span className="font-semibold">Compartir</span> y despues{" "}
                <span className="font-semibold">Agregar a inicio</span>. Sin
                esto, el iPhone no te deja recibir los avisos de tus partidos.
              </p>
            ) : (
              <p className="mt-1 text-sm text-content/70">
                Accedé mas rapido desde la pantalla de inicio y recibí los
                avisos de tus partidos.
              </p>
            )}

            <div className="mt-3 flex gap-2">
              {!enIOS && (
                <button
                  type="button"
                  onClick={instalar}
                  className="rounded-lg bg-padel-green px-3 py-1.5 text-sm font-semibold text-white hover:brightness-95"
                >
                  Instalar
                </button>
              )}

              <button
                type="button"
                onClick={cerrar}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-content/70 hover:bg-content/5"
              >
                Ahora no
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
