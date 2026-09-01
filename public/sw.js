/**
 * Service worker unico de PadelNet.
 *
 * Hace DOS cosas que antes estaban peleadas:
 *
 *   1. Las push de Firebase en segundo plano (lo que hacia
 *      firebase-messaging-sw.js, que este archivo reemplaza).
 *   2. El cache minimo que hace falta para que la app sea instalable y tenga
 *      una pantalla decente sin conexion.
 *
 * Por que uno solo y no dos: un scope lo controla un unico service worker.
 * Firebase registra /firebase-messaging-sw.js por su cuenta al pedir el token,
 * asi que un segundo worker en / le ganaba el scope a uno de los dos y las push
 * dejaban de llegar de forma intermitente. La registration de este archivo se
 * le pasa explicitamente a getToken() desde lib/getFcmToken.ts.
 *
 * Este archivo NO lo procesa Next: vive en public/ y se sirve tal cual. Nada de
 * imports ni de process.env.
 */

// Subir la version invalida todo el cache viejo en el proximo activate.
const VERSION = "v1";
const CACHE_ESTATICO = `padelnet-estatico-${VERSION}`;
const OFFLINE = "/offline.html";

/**
 * Lo minimo para que la pantalla sin conexion se vea bien sin red.
 * Deliberadamente corto: cada entrada aca es peso que se baja en la instalacion.
 */
const PRECARGA = [OFFLINE, "/icons/icon-192.png"];

/* --------------------------------------------------------------- push --- */

importScripts(
    "https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js",
);
importScripts(
    "https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js",
);

firebase.initializeApp({
    apiKey: "AIzaSyDaJ-SC1rw0ogZq1T0GmX7I7fSzm_KH54U",
    authDomain: "padelnet-f2b1f.firebaseapp.com",
    projectId: "padelnet-f2b1f",
    messagingSenderId: "705903188285",
    appId: "1:705903188285:web:ef1c1fa1a42ad8d3360d54",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    const notificacion = payload.notification || {};

    self.registration.showNotification(notificacion.title || "PadelNet", {
        body: notificacion.body,
        // Antes apuntaba a /icon.png, que no existia: las push salian con el
        // icono generico del navegador.
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        data: payload.data || {},
    });
});

/**
 * Tocar la notificacion abre la app. Si ya hay una ventana de PadelNet abierta
 * se enfoca esa en vez de abrir otra.
 */
self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    const destino = event.notification.data?.url || "/";

    event.waitUntil(
        self.clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then((ventanas) => {
                for (const ventana of ventanas) {
                    if ("focus" in ventana) {
                        ventana.navigate?.(destino);
                        return ventana.focus();
                    }
                }

                return self.clients.openWindow(destino);
            }),
    );
});

/* -------------------------------------------------------------- cache --- */

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(CACHE_ESTATICO)
            .then((cache) => cache.addAll(PRECARGA))
            // No esperar a que se cierren las pestañas viejas para tomar el
            // control: sin esto, un usuario con la app abierta se queda con el
            // worker anterior hasta que cierre todo.
            .then(() => self.skipWaiting()),
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((claves) =>
                Promise.all(
                    claves
                        .filter((clave) => clave !== CACHE_ESTATICO)
                        .map((clave) => caches.delete(clave)),
                ),
            )
            .then(() => self.clients.claim()),
    );
});

/**
 * Que se cachea y que no.
 *
 * La app es multi-club y con datos autenticados, asi que la regla es al reves
 * de lo habitual: **no se cachea nada salvo lo que esta explicitamente
 * permitido aca**. Un resultado de torneo viejo, o una pagina que quedo en
 * disco de la sesion anterior, valen mucho mas caro que el ahorro de latencia.
 */
self.addEventListener("fetch", (event) => {
    const { request } = event;

    // Nada que no sea GET: los POST de las server actions jamas se tocan.
    if (request.method !== "GET") return;

    const url = new URL(request.url);

    // Nada de otro origen (Google Fonts, Firebase, gstatic).
    if (url.origin !== self.location.origin) return;

    // Los estaticos de Next llevan hash en el nombre: si el nombre coincide, el
    // contenido es el mismo para siempre. Es lo unico que se sirve desde cache
    // sin preguntar a la red.
    if (url.pathname.startsWith("/_next/static/")) {
        event.respondWith(
            caches.match(request).then((cacheada) => {
                if (cacheada) return cacheada;

                return fetch(request).then((respuesta) => {
                    if (respuesta.ok) {
                        const copia = respuesta.clone();
                        caches
                            .open(CACHE_ESTATICO)
                            .then((cache) => cache.put(request, copia));
                    }

                    return respuesta;
                });
            }),
        );
        return;
    }

    // Los iconos de la PWA, que ya estan precargados.
    if (url.pathname.startsWith("/icons/")) {
        event.respondWith(
            caches.match(request).then((cacheada) => cacheada || fetch(request)),
        );
        return;
    }

    // Navegaciones: siempre a la red. Si no hay red, la pantalla de offline.
    // Nunca se cachea la respuesta: el HTML sale personalizado con la sesion.
    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request).catch(() => caches.match(OFFLINE)),
        );
        return;
    }

    // Todo lo demas (/api/, imagenes de perfil, datos) pasa de largo sin que el
    // worker se meta.
});
