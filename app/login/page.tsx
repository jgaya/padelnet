"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  FormCheckbox,
  FormInput,
  FormPassword,
} from "@/app/components/FormBase";
import { login } from "@/actions/auth";
import GoogleButton from "@/app/components/GoogleButton";
import { LoginSchema, type LoginFormData } from "@/types/forms";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (
        siteKey: string,
        options: { action: string },
      ) => Promise<string>;
    };
  }
}

const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });

  const getRecaptchaToken = async () => {
    if (!recaptchaSiteKey) {
      throw new Error("Falta NEXT_PUBLIC_RECAPTCHA_SITE_KEY");
    }

    if (typeof window === "undefined" || !window.grecaptcha) {
      throw new Error("reCAPTCHA no esta cargado");
    }

    return new Promise<string>((resolve, reject) => {
      window.grecaptcha?.ready(async () => {
        try {
          const token = await window.grecaptcha?.execute(recaptchaSiteKey, {
            action: "login",
          });

          if (!token) {
            reject(new Error("No se obtuvo token de reCAPTCHA"));
            return;
          }

          resolve(token);
        } catch (error) {
          reject(error);
        }
      });
    });
  };

  const onSubmit = async (values: LoginFormData) => {
    setIsLoading(true);
    setServerError(null);

    try {
      const recaptchaToken = await getRecaptchaToken();

      const result = await login({
        email: values.email,
        password: values.password,
        recaptchaToken,
      });

      if (!result.success) {
        setServerError(result.error ?? "No se pudo iniciar sesion");
        return;
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Login submit error:", error);
      setServerError("Ocurrio un error al iniciar sesion");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {recaptchaSiteKey ? (
        <Script
          src={`https://www.google.com/recaptcha/enterprise.js?render=${recaptchaSiteKey}`}
        />
      ) : null}

      <section className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
        <div className="grid gap-5 md:grid-cols-2">
          <article className="overflow-hidden rounded-3xl bg-ink p-5 text-on-ink shadow-[var(--shadow-lg)] sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-padel-green">
              Acceso PadelNet
            </p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
              Inicia sesion y activa tu juego.
            </h1>
            <p className="mt-3 text-sm text-on-ink/80 sm:text-base">
              Gestiona partidos, ranking y torneos desde una sola cuenta.
            </p>

            <ul className="mt-6 space-y-2 text-sm text-on-ink/80">
              <li>Emparejamiento por nivel y disponibilidad</li>
              <li>Alertas de nuevos partidos cercanos</li>
              <li>Historial de resultados y estadisticas</li>
            </ul>
          </article>

          <article className="rounded-3xl border border-content/10 bg-surface p-5 shadow-sm sm:p-8">
            <h2 className="text-2xl font-semibold text-content">Login</h2>
            <p className="mt-2 text-sm text-content/70">
              Ingresa tus credenciales para continuar.
            </p>

            <form
              className="auth-login-form mt-6"
              noValidate
              onSubmit={handleSubmit(onSubmit)}
            >
              {serverError ? (
                <div className="mb-3 rounded-xl border border-energy-orange/25 bg-energy-orange/10 px-3 py-2 text-sm text-energy-orange">
                  {serverError}
                </div>
              ) : null}

              <FormInput
                label="Email"
                type="email"
                placeholder="tu-email@padelnet.com"
                register={register("email")}
                error={errors.email}
                required
              />

              <FormPassword
                label="Contrasena"
                placeholder="Ingresa tu contrasena"
                register={register("password")}
                error={errors.password}
                required
              />

              <FormCheckbox
                label="Recordarme en este dispositivo"
                register={register("remember")}
                error={errors.remember}
              />

              <button
                type="submit"
                disabled={isLoading}
                className="mt-3 w-full rounded-full bg-padel-green px-4 py-3 text-sm font-semibold text-on-brand transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Ingresando..." : "Iniciar sesion"}
              </button>
            </form>

            <div className="my-4 flex items-center gap-3">
              <span className="h-px flex-1 bg-content/10" />
              <span className="text-xs font-semibold uppercase tracking-wider text-content/50">
                o
              </span>
              <span className="h-px flex-1 bg-content/10" />
            </div>

            <GoogleButton />

            <div className="mt-3 text-sm">
              <Link
                href="/recuperar"
                className="font-semibold text-content/70 transition hover:text-padel-green"
              >
                Olvidaste tu contrasena?
              </Link>
            </div>

            <div className="mt-3 flex items-center justify-between text-sm">
              <Link
                href="/"
                className="font-semibold text-content/70 transition hover:text-padel-green"
              >
                Volver al inicio
              </Link>
              <Link
                href="/registrarse"
                className="font-semibold text-energy-orange transition hover:opacity-80"
              >
                Crear cuenta
              </Link>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
