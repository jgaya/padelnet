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
    ];
  },
};

export default nextConfig;
