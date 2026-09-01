"use client";

import { useEffect } from "react";

import { registrarServiceWorker } from "@/lib/service-worker";

/**
 * Registra /sw.js al cargar la app.
 *
 * Va montado en app/layout.tsx, al lado de PushNotificationsListener. No dibuja
 * nada: existe solo para que el registro ocurra una vez por carga.
 *
 * El registro NO espera a que el usuario acepte notificaciones, a diferencia de
 * lo que hacia Firebase: el worker tambien sirve la pantalla de offline y es lo
 * que hace que la app se pueda instalar.
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    // No bloquear el primer render con esto: el worker no aporta nada a la
    // primera carga y compite por ancho de banda con lo que se esta pintando.
    const id = window.setTimeout(() => {
      void registrarServiceWorker();
    }, 1000);

    return () => window.clearTimeout(id);
  }, []);

  return null;
}
