"use client";

import { useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { FormActions, FormContainer, FormInput } from "@/app/components/FormBase";
import UbicacionFields from "@/app/components/UbicacionFields";
import { useSnackbar } from "@/context/SnackbarContext";
import { ACCION_SOLICITUD_COMPLEJO } from "@/lib/recaptcha-acciones";
import { enviarSolicitudComplejo } from "@/actions/solicitud-complejo";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (
        siteKey: string,
        options: { action: string },
      ) => Promise<string>;
    };
  }
}

const FormSchema = z.object({
  nombre: z.string().trim().min(2, "Deci tu nombre"),
  apellido: z.string().trim().min(2, "Deci tu apellido"),
  email: z.string().trim().min(1, "El email es obligatorio").email("Email invalido"),
  telefono: z.string().trim().min(6, "Dejanos un telefono de contacto"),
  complejo: z.string().trim().min(2, "Como se llama el complejo"),
  provincia: z.string().trim().min(1, "Elegi la provincia"),
  localidad: z.string().trim().min(1, "Elegi la localidad"),
  mensaje: z.string().trim().max(1000).optional(),
});

type FormData = z.infer<typeof FormSchema>;

const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

export default function SolicitudComplejoForm() {
  const showSnackbar = useSnackbar();
  const [enviando, setEnviando] = useState(false);
  const [enviada, setEnviada] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      nombre: "",
      apellido: "",
      email: "",
      telefono: "",
      complejo: "",
      provincia: "",
      localidad: "",
      mensaje: "",
    },
  });

  async function obtenerTokenRecaptcha() {
    // Sin site key el formulario funciona igual: la action tampoco valida
    // cuando falta el secreto. Es lo que permite probar en dev sin claves.
    if (!recaptchaSiteKey || typeof window === "undefined") return undefined;
    if (!window.grecaptcha) return undefined;

    return new Promise<string | undefined>((resolve) => {
      window.grecaptcha?.ready(async () => {
        try {
          resolve(
            await window.grecaptcha?.execute(recaptchaSiteKey, {
              action: ACCION_SOLICITUD_COMPLEJO,
            }),
          );
        } catch (error) {
          console.error("reCAPTCHA execute error:", error);
          resolve(undefined);
        }
      });
    });
  }

  const onSubmit = async (data: FormData) => {
    setEnviando(true);

    try {
      const recaptchaToken = await obtenerTokenRecaptcha();
      const res = await enviarSolicitudComplejo({ ...data, recaptchaToken });

      if (!res.success) {
        showSnackbar(res.error, "error");
        return;
      }

      setEnviada(true);
    } catch (error) {
      console.error("Solicitud de complejo:", error);
      showSnackbar("No se pudo enviar la solicitud. Intenta de nuevo.", "error");
    } finally {
      setEnviando(false);
    }
  };

  if (enviada) {
    return (
      <div className="rounded-3xl border border-padel-green/30 bg-padel-green/10 p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-content">
          Listo, recibimos tu solicitud
        </h2>
        <p className="mt-2 text-sm text-content/80">
          Un administrador de PadelNet se va a poner en contacto con vos por mail
          o por telefono para coordinar los siguientes pasos. Gracias por
          querer sumarte.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex rounded-full bg-padel-green px-5 py-2.5 text-sm font-semibold text-on-brand transition hover:brightness-95"
        >
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <>
      {recaptchaSiteKey ? (
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=${recaptchaSiteKey}`}
          strategy="afterInteractive"
        />
      ) : null}

      <FormContainer title="Contanos de tu complejo" backURL="/">
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput
              label="Nombre"
              register={register("nombre")}
              error={errors.nombre}
              required
            />
            <FormInput
              label="Apellido"
              register={register("apellido")}
              error={errors.apellido}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput
              label="Email"
              type="email"
              register={register("email")}
              error={errors.email}
              required
            />
            <FormInput
              label="Telefono"
              type="tel"
              register={register("telefono")}
              error={errors.telefono}
              required
            />
          </div>

          <FormInput
            label="Nombre del complejo"
            register={register("complejo")}
            error={errors.complejo}
            required
          />

          <UbicacionFields
            provincia={watch("provincia") ?? ""}
            localidad={watch("localidad") ?? ""}
            onChange={({ provincia, localidad }) => {
              setValue("provincia", provincia, { shouldValidate: true });
              setValue("localidad", localidad, { shouldValidate: true });
            }}
            errorProvincia={errors.provincia}
            errorLocalidad={errors.localidad}
          />

          <div className="mb-4">
            <label className="padel-form-label" htmlFor="mensaje">
              Algo mas que quieras contarnos (opcional)
            </label>
            <textarea
              id="mensaje"
              className="padel-form-input"
              rows={4}
              maxLength={1000}
              placeholder="Cuantas canchas tienen, si ya organizan torneos, horarios..."
              {...register("mensaje")}
            />
          </div>

          <FormActions
            submitText="Enviar solicitud"
            cancelPath="/"
            isLoading={enviando}
          />
        </form>
      </FormContainer>
    </>
  );
}
