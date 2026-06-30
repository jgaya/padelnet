import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/app/components/site-header";
import { SnackbarProvider } from "@/context/SnackbarContext";

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
    <html lang="es">
      <body
        className={`${inter.variable} ${montserrat.variable} font-sans antialiased`}
      >
        <SnackbarProvider>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <footer className="border-t border-deep-black/10 bg-white">
              <div className="mx-auto w-full max-w-6xl px-4 py-5 text-center text-sm text-deep-black/70 sm:px-6">
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
