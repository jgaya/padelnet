"use server";

import { z } from "zod";

import { enviarMailSolicitudComplejo } from "@/lib/email";
import { verificarRecaptcha } from "@/lib/recaptcha";
import { ACCION_SOLICITUD_COMPLEJO } from "@/lib/recaptcha-acciones";
import { normalizarProvincia } from "@/lib/ubicaciones";

/**
 * Solicitud de un club que quiere sumarse a PadelNet.
 *
 * Es la unica action publica sin sesion de todo el proyecto que manda un mail,
 * asi que lleva reCAPTCHA: un formulario de contacto abierto es el blanco
 * clasico de los bots.
 *
 * No se guarda en la base a proposito (todavia): lo pedido es el aviso por
 * mail. Si el volumen justifica un seguimiento —quien contesto, en que quedo—
 * la continuacion natural es un modelo `SolicitudComplejo` con estado, y el
 * mail pasa a ser el aviso de que hay una fila nueva.
 */

const SolicitudSchema = z.object({
  nombre: z.string().trim().min(2, "Deci tu nombre").max(80),
  apellido: z.string().trim().min(2, "Deci tu apellido").max(80),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "El email es obligatorio")
    .email("Ingresa un email valido")
    .max(160),
  telefono: z
    .string()
    .trim()
    .min(6, "Dejanos un telefono de contacto")
    .max(40),
  complejo: z.string().trim().min(2, "Como se llama el complejo").max(120),
  provincia: z.string().trim().min(1, "Elegi la provincia").max(80),
  localidad: z.string().trim().min(1, "Elegi la localidad").max(80),
  mensaje: z.string().trim().max(1000).optional(),
});

export type SolicitudComplejoInput = z.input<typeof SolicitudSchema> & {
  recaptchaToken?: string;
};

export type SolicitudComplejoResult =
  | { success: true }
  | { success: false; error: string };

export async function enviarSolicitudComplejo(
  input: SolicitudComplejoInput,
): Promise<SolicitudComplejoResult> {
  const captcha = await verificarRecaptcha(
    input.recaptchaToken,
    ACCION_SOLICITUD_COMPLEJO,
  );

  if (!captcha.ok) {
    return { success: false, error: captcha.error };
  }

  const parsed = SolicitudSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario",
    };
  }

  const datos = parsed.data;

  await enviarMailSolicitudComplejo({
    nombre: datos.nombre,
    apellido: datos.apellido,
    email: datos.email,
    telefono: datos.telefono,
    complejo: datos.complejo,
    // Se normaliza igual que en el perfil, para que la provincia quede escrita
    // con el nombre canonico de lib/ubicaciones.ts.
    provincia: normalizarProvincia(datos.provincia) ?? datos.provincia,
    localidad: datos.localidad,
    mensaje: datos.mensaje ?? "",
  });

  // Se responde exito aunque el mail no haya salido: la solicitud quedo en el
  // log del server y el visitante no tiene nada que hacer con un problema de
  // configuracion nuestro. Ver enviarMailSolicitudComplejo.
  return { success: true };
}
