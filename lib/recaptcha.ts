import "server-only";

/**
 * Verificacion de reCAPTCHA v3.
 *
 * Existe porque los formularios publicos que disparan un mail son el blanco
 * clasico de los bots: sin esto, "Sumar mi complejo" se convierte en un caño
 * para llenar de spam la casilla de los administradores.
 *
 * `actions/auth.ts` tiene su propia copia de esta logica, escrita antes y con
 * la accion "login" fija. Cuando haya que tocar el login conviene que pase por
 * aca; no se migro junto con esto para no meter mano en el circuito de
 * autenticacion por un formulario de contacto.
 */

export type ResultadoRecaptcha = { ok: true } | { ok: false; error: string };

/** Debajo de esto Google considera que probablemente sea un bot. */
const SCORE_MINIMO = 0.5;

export async function verificarRecaptcha(
  token: string | undefined,
  accionEsperada: string,
): Promise<ResultadoRecaptcha> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;

  // Sin secreto configurado no se bloquea nada: es el mismo criterio que el
  // login, y permite trabajar en dev sin claves de Google.
  if (!secret) {
    return { ok: true };
  }

  if (!token) {
    return { ok: false, error: "reCAPTCHA requerido" };
  }

  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
      cache: "no-store",
    });

    const data: { success?: boolean; action?: string; score?: number } =
      await res.json();

    // La accion se compara a proposito: un token sacado de otro formulario del
    // mismo sitio es valido para Google pero no sirve para este.
    if (
      !data.success ||
      data.action !== accionEsperada ||
      (typeof data.score === "number" && data.score < SCORE_MINIMO)
    ) {
      console.warn("[recaptcha] verificacion fallida", data);
      return { ok: false, error: "Validacion de seguridad fallida" };
    }

    return { ok: true };
  } catch (error) {
    console.error("[recaptcha] no se pudo verificar", error);
    return { ok: false, error: "No se pudo validar reCAPTCHA" };
  }
}
