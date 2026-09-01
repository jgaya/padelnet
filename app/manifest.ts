import type { MetadataRoute } from "next";

/**
 * Manifest de la PWA.
 *
 * Va por la Metadata API de Next y no por un public/manifest.json a mano para
 * que sea del mismo tipo que el `metadata` de app/layout.tsx: se tipa, y Next
 * inyecta solo el <link rel="manifest"> en el head.
 *
 * Se sirve en /manifest.webmanifest.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PadelNet - Comunidad de padel",
    // El que se ve abajo del icono en la pantalla de inicio. Corto o el sistema
    // lo recorta con puntos suspensivos.
    short_name: "PadelNet",
    description:
      "Turnos, torneos y ranking de tu club de padel.",
    start_url: "/",
    // Desde donde se considera "adentro de la app": todo el sitio.
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "es-AR",
    dir: "ltr",
    categories: ["sports"],
    // El fondo del splash mientras carga. Es --background del tema claro
    // (app/globals.css); el manifest no puede tener dos valores, asi que va el
    // claro y el theme-color dinamico lo resuelve lib/tema.ts.
    background_color: "#f5f7f7",
    theme_color: "#00c853",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // Separadas de las "any" a proposito: Android recorta las maskable con la
      // forma del launcher, y estas traen el wordmark achicado para que entre
      // en la zona segura. Ver public/icons/icono-maskable.svg.
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
