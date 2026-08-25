"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { restablecerPassword } from "@/actions/email";
import { useSnackbar } from "@/context/SnackbarContext";
import {
  NuevaPasswordFormSchema,
  type NuevaPasswordFormData,
} from "@/types/forms";

const MOTIVOS: Record<string, string> = {
  SIN_TOKEN: "Falta el token: abri el link desde el mail.",
  INVALIDO:
    "Este link ya no sirve. Puede que ya lo hayas usado o que hayas pedido uno mas nuevo.",
  VENCIDO: "El link vencio. Pedi uno nuevo desde recuperar contrasena.",
  PASSWORD_CORTA: "La contrasena debe tener al menos 6 caracteres.",
  ERROR: "Hubo un problema de nuestro lado. Proba de nuevo en un momento.",
};

export default function NuevaPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const showSnackbar = useSnackbar();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NuevaPasswordFormData>({
    resolver: zodResolver(NuevaPasswordFormSchema),
  });

  const onSubmit = async (data: NuevaPasswordFormData) => {
    setError(null);

    // El token viaja con el cambio: se valida y se consume del lado del server,
    // en la misma operacion. La pagina nunca maneja un userId.
    const result = await restablecerPassword(token, data.password);

    if (!result.success) {
      setError(MOTIVOS[result.motivo] ?? MOTIVOS.ERROR);
      return;
    }

    showSnackbar("Contrasena cambiada. Ya podes ingresar", "success");
    router.push("/login");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <label className="block text-sm font-medium text-content/80">
        Nueva contrasena
        <input
          type="password"
          autoComplete="new-password"
          {...register("password")}
          className="mt-1 w-full rounded-xl border border-content/15 px-3 py-2 text-sm"
        />
        {errors.password ? (
          <span className="mt-1 block text-xs text-energy-orange">
            {errors.password.message}
          </span>
        ) : null}
      </label>

      <label className="block text-sm font-medium text-content/80">
        Repetir la contrasena
        <input
          type="password"
          autoComplete="new-password"
          {...register("password2")}
          className="mt-1 w-full rounded-xl border border-content/15 px-3 py-2 text-sm"
        />
        {errors.password2 ? (
          <span className="mt-1 block text-xs text-energy-orange">
            {errors.password2.message}
          </span>
        ) : null}
      </label>

      {error ? (
        <p className="rounded-xl border border-energy-orange/25 bg-energy-orange/10 px-4 py-2 text-sm text-energy-orange">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-full bg-padel-green px-5 py-2.5 text-sm font-semibold text-on-brand transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Cambiando..." : "Cambiar contrasena"}
      </button>
    </form>
  );
}
