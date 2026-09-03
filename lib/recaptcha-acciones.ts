/**
 * Nombres de las acciones de reCAPTCHA Enterprise.
 *
 * En un modulo aparte de lib/recaptcha.ts porque los necesitan los dos lados:
 * el cliente para pedir el token y el servidor para verificar que el token sea
 * de este formulario y no de otro. `lib/recaptcha.ts` lleva `server-only`, y
 * un modulo `"use server"` solo puede exportar funciones async, asi que la
 * constante no puede vivir en ninguno de los dos.
 */

export const ACCION_SOLICITUD_COMPLEJO = "SOLICITUD_COMPLEJO";
export const ACCION_LOGIN = "LOGIN";
