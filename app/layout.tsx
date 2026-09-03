import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/app/components/site-header";
import { SnackbarProvider } from "@/context/SnackbarContext";
import { SCRIPT_TEMA } from "@/lib/tema";
import PushNotificationsListener from "@/app/components/PushNotificationsListener";
import ServiceWorkerRegistrar from "@/app/components/ServiceWorkerRegistrar";
import InstallPrompt from "@/app/components/InstallPrompt";
import { GlobalLoader } from "@/components/GlobalLoader";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: "900",
});

export const metadata: Metadata = {
  title: "PadelNet",
  description: "Comunidad de padel: partidos, torneos y ranking.",
  // Lo genera app/manifest.ts y se sirve en /manifest.webmanifest.
  manifest: "/manifest.webmanifest",
  icons: {
    // iOS ignora el manifest para el icono de la pantalla de inicio y lee este.
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "PadelNet",
    // La barra de estado queda translucida y el contenido pasa por abajo, que
    // es lo que hace que se vea como app y no como pagina.
    statusBarStyle: "black-translucent",
  },
  // Sin `themeColor` aca a proposito: el <meta name="theme-color"> lo escribe
  // SCRIPT_TEMA, porque tiene que seguir la eleccion del usuario (que son tres
  // valores) y no al sistema operativo. Ver COLOR_BARRA en lib/tema.ts.
};

/**
 * `viewport-fit=cover` es lo que deja que el fondo llegue hasta los bordes en
 * los telefonos con notch cuando la app corre instalada.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // `suppressHydrationWarning` cubre justo los atributos que le agrega el
    // script de abajo al `<html>`. Es de un solo nivel: no se propaga a los hijos.
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Aplica el tema antes del primer paint: sin esto, recargar en oscuro
            muestra un flash blanco. */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body
        className={`${inter.variable} ${montserrat.variable} font-sans antialiased`}
      >
        <SnackbarProvider>
          <GlobalLoader />
          <PushNotificationsListener />
          <ServiceWorkerRegistrar />
          <InstallPrompt />
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <footer className="border-t border-content/10 bg-surface">
              <div className="mx-auto w-full max-w-6xl px-4 py-5 text-center text-sm text-content/70 sm:px-6">
                PadelNet (c) {new Date().getFullYear()} - Comunidad oficial de
                padel.
              </div>
            </footer>
          </div>
        </SnackbarProvider>
      </body>
    </html>
  );
}
