"use client";

import { useState } from "react";
import Link from "next/link";

import { solicitarRecuperacion } from "@/actions/email";

export default function RecuperarPage() {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlDev, setUrlDev] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setEnviando(true);
    setError(null);

    try {
      const result = await solicitarRecuperacion(email);

      if (!result.success) {
        setError(result.error ?? "No se pudo enviar el mail");
        return;
      }

      setListo(true);
      setUrlDev(result.url ?? null);
    } catch {
      setError("No se pudo enviar el mail");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-lg px-4 py-8 sm:px-6">
      <div className="overflow-hidden rounded-3xl border border-deep-black/10 bg-white shadow-sm">
        <div className="border-b border-deep-black/10 bg-gradient-to-r from-padel-green/15 via-white to-energy-orange/15 px-6 py-6">
          <h1 className="text-2xl font-semibold text-deep-black">
            Recuperar contrasena
          </h1>
          <p className="mt-2 text-sm text-deep-black/70">
            Ingresa tu email y te mandamos un link para elegir una nueva.
          </p>
        </div>

        <div className="px-6 py-6">
          {listo ? (
            <>
              {/* A proposito no se dice si la direccion existe: contestar
                  distinto permitiria averiguar quien esta registrado. */}
              <p className="rounded-xl border border-padel-green/25 bg-padel-green/10 px-4 py-3 text-sm text-padel-green">
                Si esa direccion tiene una cuenta, te mandamos un mail con el
                link. Revisa tambien el correo no deseado.
              </p>

              {urlDev ? (
                <div className="mt-4 rounded-xl border border-deep-black/15 bg-surface-soft px-4 py-3">
                  <p className="text-xs font-semibold text-deep-black/70">
                    El envio de mails no esta configurado en este entorno. Link
                    de recuperacion:
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
                Email
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
                {enviando ? "Enviando..." : "Enviarme el link"}
              </button>
            </form>
          )}

          <div className="mt-4 text-sm">
            <Link
              href="/login"
              className="font-semibold text-deep-black/70 transition hover:text-padel-green"
            >
              Volver a iniciar sesion
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
