"use client";

import { useEffect, useState } from "react";

import { saveToken } from "@/actions/firebase";
import { getFcmToken } from "@/lib/getFcmToken";

type Status = "default" | "granted" | "denied" | "unsupported";

type EnableNotificationsProps = {
  /** Id del usuario logueado. Sin el no se puede asociar el token FCM. */
  userId?: number | null;
  showState?: boolean;
};

export default function EnableNotifications({
  userId = null,
  showState = false,
}: EnableNotificationsProps) {
  const [status, setStatus] = useState<Status>("default");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setStatus("unsupported");
      return;
    }

    setStatus(Notification.permission as Status);
  }, []);

  async function requestPermission() {
    if (!userId) return;

    setSaving(true);
    try {
      const permission = await Notification.requestPermission();
      setStatus(permission as Status);

      if (permission !== "granted") return;

      const token = await getFcmToken();
      if (token) {
        await saveToken(token);
      }
    } finally {
      setSaving(false);
    }
  }

  if (status === "unsupported") return null;

  if (status === "granted") {
    return showState ? (
      <span className="inline-flex rounded-full bg-padel-green/15 px-3 py-1 text-xs font-semibold text-content">
        Notificaciones activadas
      </span>
    ) : null;
  }

  if (status === "denied") {
    return showState ? (
      <span className="inline-flex rounded-full bg-energy-orange/15 px-3 py-1 text-xs font-semibold text-energy-orange">
        Bloqueadas en el navegador
      </span>
    ) : null;
  }

  // status === "default": todavia no se pidio el permiso.
  if (!userId) return null;

  return (
    <button
      type="button"
      onClick={requestPermission}
      disabled={saving}
      className="inline-flex rounded-full bg-padel-green px-4 py-2 text-sm font-semibold text-on-brand transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {saving ? "Activando..." : "Activar notificaciones"}
    </button>
  );
}

export function getNotificationStatus(): Status {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window)) return "unsupported";

  return Notification.permission as Status;
}
