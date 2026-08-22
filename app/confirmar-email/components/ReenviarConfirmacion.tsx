"use client";

import { useState } from "react";

import { reenviarConfirmacion } from "@/actions/email";
import type { ConfirmarEmailResult } from "@/actions/email";

type Motivo = Extract<ConfirmarEmailResult, { success: false }>["motivo"];

const MENSAJES: Record<Motivo, { titulo: string; detalle: string }> = {
  SIN_TOKEN: {
    titulo: "Falta el link de confirmacion",
    detalle:
      "Abri el link desde el mail que te mandamos. Si no lo encontras, pedinos uno nuevo.",
  },
  INVALIDO: {
    titulo: "Este link ya no sirve",
    detalle:
      "Puede que ya lo hayas usado o que hayas pedido uno mas nuevo. Pedi otro y usa el ultimo que te llegue.",
  },
  VENCIDO: {
    titulo: "El link vencio",
    detalle: "Los links duran 24 horas. Pedi uno nuevo y confirmalo enseguida.",
  },
  ERROR: {
    titulo: "No pudimos confirmar tu email",
    detalle: "Hubo un problema de nuestro lado. Proba de nuevo en un momento.",
  },
};

export default function ReenviarConfirmacion({ motivo }: { motivo: Motivo }) {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlDev, setUrlDev] = useState<string | null>(null);

  const mensaje = MENSAJES[motivo];

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setEnviando(true);
    setError(null);

    try {
      const result = await reenviarConfirmacion(email);

      if (!result.success) {
        setError(result.error ?? "No se pudo reenviar el mail");
        return;
      }

      setListo(true);
      setUrlDev(result.url ?? null);
    } catch {
      setError("No se pudo reenviar el mail");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-lg px-4 py-8 sm:px-6">
      <div className="overflow-hidden rounded-3xl border border-deep-black/10 bg-white shadow-sm">
        <div className="border-b border-deep-black/10 bg-gradient-to-r from-energy-orange/15 via-white to-padel-green/15 px-6 py-6">
          <h1 className="text-2xl font-semibold text-deep-black">
            {mensaje.titulo}
          </h1>
          <p className="mt-2 text-sm text-deep-black/70">{mensaje.detalle}</p>
        </div>

        <div className="px-6 py-6">
          {listo ? (
            <>
              <p className="rounded-xl border border-padel-green/25 bg-padel-green/10 px-4 py-3 text-sm text-padel-green">
                Si esa direccion tiene una cuenta sin confirmar, te mandamos un
                mail nuevo. Revisa tambien el correo no deseado.
              </p>

              {urlDev ? (
                <div className="mt-4 rounded-xl border border-deep-black/15 bg-surface-soft px-4 py-3">
                  <p className="text-xs font-semibold text-deep-black/70">
                    El envio de mails no esta configurado en este entorno. Link
                    de confirmacion:
                  </p>
                  <a
                    href={urlDev}
                    className="mt-1 block break-all text-xs text-padel-green underline"
                  >
                    {urlDev}
                  </a>
                </div>
              ) : null}
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block text-sm font-medium text-deep-black/80">
                Tu email
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="vos@ejemplo.com"
                  className="mt-1 w-full rounded-xl border border-deep-black/15 px-3 py-2 text-sm"
                />
              </label>

              {error ? (
                <p className="rounded-xl border border-energy-orange/25 bg-energy-orange/10 px-4 py-2 text-sm text-energy-orange">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={enviando}
                className="w-full rounded-full bg-padel-green px-5 py-2.5 text-sm font-semibold text-deep-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {enviando ? "Enviando..." : "Enviarme un link nuevo"}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
