import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // El popup de Google necesita seguir hablando con la ventana que lo
          // abrio: hace postMessage y consulta window.closed. Con COOP en
          // same-origin el navegador corta ese vinculo y aparece el aviso
          // "Cross-Origin-Opener-Policy policy would block the window.closed
          // call". Esto lo declara explicito en vez de depender del default.
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          // COEP estricto vuelve a aislar la ventana y anula lo de arriba.
          { key: "Cross-Origin-Embedder-Policy", value: "unsafe-none" },
        ],
      },
      {
        // El service worker no se puede cachear: el navegador lo revisa para
        // saber si hay una version nueva, y si le sirven una copia guardada el
        // worker viejo queda vivo indefinidamente. Con el service worker eso no
        // es una pagina desactualizada, es codigo desactualizado controlando
        // todas las respuestas.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          // Habilita el scope raiz aunque el archivo se mueva de carpeta.
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        // Mismo motivo, mas suave: si cambian los iconos o el nombre, que no
        // haya que esperar a que expire el cache del navegador.
        source: "/manifest.webmanifest",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
    ];
  },
};

export default nextConfig;
