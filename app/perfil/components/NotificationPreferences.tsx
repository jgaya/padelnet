"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  getUserNotificationPreferences,
  updateUserNotificationPreferences,
  resetNotificationPreferences,
} from "@/actions/notificationPreferences";
import EnableNotifications from "@/app/components/PermisionPush";
import { useSnackbar } from "@/context/SnackbarContext";
import type { PerfilData } from "@/actions/perfil";
import {
  NotificationPreferenceSchema,
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_TYPE_DESCRIPTIONS,
  type NotificationPreferences,
} from "@/types/notificationPreferences";

interface NotificationPreferencesProps {
  user: PerfilData;
}

type PreferenceKey = Extract<keyof NotificationPreferences, string>;

// Solo los tipos que estan activos en el schema: los demas siguen comentados
// en types/notificationPreferences.ts hasta que se implementen.
const PREFERENCE_KEYS = Object.keys(
  DEFAULT_NOTIFICATION_PREFERENCES,
) as PreferenceKey[];

export default function NotificationPreferences({
  user,
}: NotificationPreferencesProps) {
  const showSnackbar = useSnackbar();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, reset } = useForm<NotificationPreferences>({
    resolver: zodResolver(NotificationPreferenceSchema),
    defaultValues: DEFAULT_NOTIFICATION_PREFERENCES,
    mode: "onBlur",
  });

  useEffect(() => {
    const loadPreferences = async () => {
      const result = await getUserNotificationPreferences();
      if (result.success && result.preferences) {
        reset(result.preferences);
      }
    };

    void loadPreferences();
  }, [user.id, reset]);

  const onSubmit = async (data: NotificationPreferences) => {
    setIsLoading(true);
    try {
      const res = await updateUserNotificationPreferences({
        preferences: data,
      });

      if (res.success && res.preferences) {
        reset(res.preferences);
        showSnackbar(res.message ?? "Preferencias guardadas", "success");
      } else {
        showSnackbar(res.error ?? "Error al guardar preferencias", "error");
      }
    } catch (error) {
      showSnackbar(
        error instanceof Error
          ? error.message
          : "Error al guardar las preferencias",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const runBulkAction = async (
    action: "enableAll" | "disableAll" | "reset",
    successMessage: string,
  ) => {
    setIsLoading(true);
    try {
      const res =
        action === "reset"
          ? await resetNotificationPreferences()
          : await updateUserNotificationPreferences({
              [action]: true,
            });

      if (res.success && res.preferences) {
        reset(res.preferences);
        showSnackbar(successMessage, "success");
      } else {
        showSnackbar(res.error ?? "No se pudo actualizar", "error");
      }
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudo actualizar",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-deep-black/10 bg-white shadow-sm">
      <div className="border-b border-deep-black/10 px-5 py-4 sm:px-7">
        <h2 className="text-lg font-semibold text-deep-black">
          Notificaciones
        </h2>
        <p className="mt-1 text-sm text-deep-black/70">
          Elegi que avisos queres recibir en este navegador.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="px-5 py-5 sm:px-7">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface-soft px-4 py-3">
          <span className="text-sm font-semibold text-deep-black">
            Permiso del navegador:
          </span>
          <EnableNotifications userId={user.id} showState />
        </div>

        <div className="mt-5 space-y-3">
          {PREFERENCE_KEYS.map((key) => (
            <label
              key={key}
              className="flex cursor-pointer items-start gap-3 rounded-2xl border border-deep-black/10 bg-white px-4 py-3 transition hover:bg-surface-soft/60"
            >
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0 accent-padel-green"
                {...register(key)}
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-deep-black">
                  {NOTIFICATION_TYPE_LABELS[key]}
                </span>
                <span className="mt-0.5 block text-xs text-deep-black/70">
                  {NOTIFICATION_TYPE_DESCRIPTIONS[key]}
                </span>
              </span>
            </label>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() =>
              runBulkAction("enableAll", "Todas las notificaciones habilitadas")
            }
            disabled={isLoading}
            className="inline-flex rounded-full border border-deep-black/20 bg-white px-4 py-2 text-sm font-semibold text-deep-black transition hover:bg-surface-soft disabled:opacity-60"
          >
            Habilitar todas
          </button>
          <button
            type="button"
            onClick={() =>
              runBulkAction(
                "disableAll",
                "Todas las notificaciones deshabilitadas",
              )
            }
            disabled={isLoading}
            className="inline-flex rounded-full border border-deep-black/20 bg-white px-4 py-2 text-sm font-semibold text-deep-black transition hover:bg-surface-soft disabled:opacity-60"
          >
            Deshabilitar todas
          </button>
          <button
            type="button"
            onClick={() => runBulkAction("reset", "Preferencias restauradas")}
            disabled={isLoading}
            className="inline-flex rounded-full border border-deep-black/20 bg-white px-4 py-2 text-sm font-semibold text-deep-black transition hover:bg-surface-soft disabled:opacity-60"
          >
            Restaurar predeterminadas
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex rounded-full bg-padel-green px-4 py-2 text-sm font-semibold text-deep-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Guardando..." : "Guardar preferencias"}
          </button>
        </div>
      </form>
    </div>
  );
}
