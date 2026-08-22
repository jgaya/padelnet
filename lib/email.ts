import "server-only";

import crypto from "crypto";
import { Resend } from "resend";

/**
 * Envio de mails transaccionales.
 *
 * `resend` ya estaba en package.json pero no lo usaba nadie. Si falta la
 * configuracion no se rompe nada: se escribe el link en el log del server y se
 * sigue. Eso permite probar el circuito completo en dev sin cuenta de Resend, y
 * en produccion —con las variables puestas— manda el mail de verdad.
 *
 * Variables: RESEND_API_KEY, EMAIL_FROM, BASE_URL.
 */

export type EnvioResult = {
  enviado: boolean;
  /** Se devuelve para poder mostrarlo en dev cuando no hay Resend configurado. */
  url: string;
  motivo?: string;
};

/** Token opaco de un solo uso. 32 bytes en hex: no se puede adivinar. */
export function generarToken() {
  return crypto.randomBytes(32).toString("hex");
}

/** Vencimiento por defecto de un token de verificacion: 24 horas. */
export function vencimientoToken() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

function baseUrl() {
  return process.env.BASE_URL?.replace(/\/+$/, "") || "http://localhost:3000";
}

export function urlConfirmacion(token: string) {
  return `${baseUrl()}/confirmar-email?token=${encodeURIComponent(token)}`;
}

export function urlRecuperacion(token: string) {
  return `${baseUrl()}/recuperar/nueva?token=${encodeURIComponent(token)}`;
}

function plantillaConfirmacion(nombre: string, url: string) {
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; color: #14181f;">
      <h1 style="font-size: 20px;">Hola ${nombre}, confirma tu email</h1>
      <p style="font-size: 15px; line-height: 1.5;">
        Ya casi estas. Confirma tu direccion para poder inscribirte a los torneos
        y recibir los avisos de tus partidos.
      </p>
      <p style="margin: 28px 0;">
        <a href="${url}"
           style="background: #00c853; color: #14181f; text-decoration: none;
                  padding: 12px 22px; border-radius: 999px; font-weight: 600;">
          Confirmar mi email
        </a>
      </p>
      <p style="font-size: 13px; color: #5b6472;">
        El link vence en 24 horas. Si no creaste esta cuenta, ignora este mensaje.
      </p>
      <p style="font-size: 12px; color: #8c95a3; word-break: break-all;">${url}</p>
    </div>
  `;
}

export async function enviarMailConfirmacion(params: {
  email: string;
  nombre: string;
  token: string;
}): Promise<EnvioResult> {
  const url = urlConfirmacion(params.token);
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    // Sin configurar: no se corta la operacion, se deja el link a mano.
    console.info(
      `[email] RESEND_API_KEY/EMAIL_FROM sin configurar. Link de confirmacion para ${params.email}: ${url}`,
    );
    return { enviado: false, url, motivo: "Envio de mails no configurado" };
  }

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to: params.email,
      subject: "Confirma tu email - PadelNet",
      html: plantillaConfirmacion(params.nombre, url),
    });

    return { enviado: true, url };
  } catch (error) {
    // Que no se pueda mandar el mail no puede voltear el registro: la cuenta ya
    // existe y el usuario puede pedir el reenvio.
    console.error("[email] no se pudo enviar la confirmacion", error);
    return {
      enviado: false,
      url,
      motivo: error instanceof Error ? error.message : "Error al enviar el mail",
    };
  }
}

function plantillaRecuperacion(nombre: string, url: string) {
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; color: #14181f;">
      <h1 style="font-size: 20px;">Hola ${nombre}, recupera tu contrasena</h1>
      <p style="font-size: 15px; line-height: 1.5;">
        Pediste cambiar tu contrasena. Entra al link y elegi una nueva.
      </p>
      <p style="margin: 28px 0;">
        <a href="${url}"
           style="background: #00c853; color: #14181f; text-decoration: none;
                  padding: 12px 22px; border-radius: 999px; font-weight: 600;">
          Cambiar mi contrasena
        </a>
      </p>
      <p style="font-size: 13px; color: #5b6472;">
        El link vence en 24 horas y se puede usar una sola vez.
        <strong>Si no lo pediste vos, ignora este mensaje</strong>: tu contrasena
        actual sigue funcionando.
      </p>
      <p style="font-size: 12px; color: #8c95a3; word-break: break-all;">${url}</p>
    </div>
  `;
}

export async function enviarMailRecuperacion(params: {
  email: string;
  nombre: string;
  token: string;
}): Promise<EnvioResult> {
  const url = urlRecuperacion(params.token);
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.info(
      `[email] RESEND_API_KEY/EMAIL_FROM sin configurar. Link de recuperacion para ${params.email}: ${url}`,
    );
    return { enviado: false, url, motivo: "Envio de mails no configurado" };
  }

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to: params.email,
      subject: "Recupera tu contrasena - PadelNet",
      html: plantillaRecuperacion(params.nombre, url),
    });

    return { enviado: true, url };
  } catch (error) {
    console.error("[email] no se pudo enviar la recuperacion", error);
    return {
      enviado: false,
      url,
      motivo: error instanceof Error ? error.message : "Error al enviar el mail",
    };
  }
}
