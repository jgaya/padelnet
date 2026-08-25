import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/app/components/site-header";
import { SnackbarProvider } from "@/context/SnackbarContext";
import { SCRIPT_TEMA } from "@/lib/tema";
import PushNotificationsListener from "@/app/components/PushNotificationsListener";

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
            <PushNotificationsListener />
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
