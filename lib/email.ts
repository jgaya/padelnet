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
      <h1 style="font-size: 20px;">Hola ${nombre}, recupera tu contraseña</h1>
      <p style="font-size: 15px; line-height: 1.5;">
        Pediste cambiar tu contraseña. Entra al link y elegi una nueva.
      </p>
      <p style="margin: 28px 0;">
        <a href="${url}"
           style="background: #00c853; color: #14181f; text-decoration: none;
                  padding: 12px 22px; border-radius: 999px; font-weight: 600;">
          Cambiar mi contraseña
        </a>
      </p>
      <p style="font-size: 13px; color: #5b6472;">
        El link vence en 24 horas y se puede usar una sola vez.
        <strong>Si no lo pediste vos, ignora este mensaje</strong>: tu contraseña
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
      subject: "Recupera tu contraseña - PadelNet",
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

// ========================================
// Solicitud de un club para sumarse
// ========================================

export type SolicitudComplejo = {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  complejo: string;
  provincia: string;
  localidad: string;
  mensaje: string;
};

function escaparHtml(valor: string) {
  return valor
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function plantillaSolicitudComplejo(datos: SolicitudComplejo) {
  // Todo lo que viene del formulario es texto que escribio un desconocido y
  // termina dentro de un HTML: hay que escaparlo o el mail queda inyectable.
  const fila = (etiqueta: string, valor: string) => `
    <tr>
      <td style="padding: 6px 12px 6px 0; color: #5b6472; font-size: 13px; vertical-align: top;">${etiqueta}</td>
      <td style="padding: 6px 0; font-size: 14px; color: #14181f;">${escaparHtml(valor) || "-"}</td>
    </tr>`;

  return `
    <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #14181f;">
      <h1 style="font-size: 20px;">Un club quiere sumarse a PadelNet</h1>
      <p style="font-size: 15px; line-height: 1.5;">
        Llego una solicitud desde el formulario publico. Los datos que dejaron:
      </p>
      <table style="border-collapse: collapse; margin: 20px 0;">
        ${fila("Complejo", datos.complejo)}
        ${fila("Contacto", `${datos.nombre} ${datos.apellido}`)}
        ${fila("Email", datos.email)}
        ${fila("Telefono", datos.telefono)}
        ${fila("Ubicacion", [datos.localidad, datos.provincia].filter(Boolean).join(", "))}
        ${fila("Mensaje", datos.mensaje)}
      </table>
      <p style="font-size: 13px; color: #5b6472;">
        Le dijimos que un administrador se va a poner en contacto.
      </p>
    </div>
  `;
}

/**
 * Avisa a los administradores que un club quiere sumarse.
 *
 * El destino sale de EMAIL_SOLICITUDES. Si falta —o falta Resend— la solicitud
 * se escribe completa en el log del server en vez de perderse, y al visitante
 * igual se le confirma: no tiene nada que hacer con nuestro problema de
 * configuracion. Es el mismo criterio que el resto de este modulo.
 */
export async function enviarMailSolicitudComplejo(
  datos: SolicitudComplejo,
): Promise<EnvioResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const to = process.env.EMAIL_SOLICITUDES;
  const url = `${baseUrl()}/sumar-complejo`;

  if (!apiKey || !from || !to) {
    console.info(
      "[email] solicitud de complejo sin poder enviarse (falta RESEND_API_KEY, EMAIL_FROM o EMAIL_SOLICITUDES). Datos:",
      JSON.stringify(datos),
    );
    return { enviado: false, url, motivo: "Envio de mails no configurado" };
  }

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to,
      // Con el nombre del club en el asunto se puede buscar en la casilla sin
      // abrir cada mail.
      subject: `Nuevo club interesado: ${datos.complejo}`,
      html: plantillaSolicitudComplejo(datos),
      // Para responderle directo desde el cliente de mail.
      replyTo: datos.email,
    });

    return { enviado: true, url };
  } catch (error) {
    console.error(
      "[email] no se pudo enviar la solicitud de complejo. Datos:",
      JSON.stringify(datos),
      error,
    );
    return {
      enviado: false,
      url,
      motivo: error instanceof Error ? error.message : "Error al enviar el mail",
    };
  }
}
