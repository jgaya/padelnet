import "server-only";

/**
 * Verificacion de reCAPTCHA Enterprise.
 *
 * Existe porque los formularios publicos que disparan un mail son el blanco
 * clasico de los bots: sin esto, "Sumar mi complejo" se convierte en un caño
 * para llenar de spam la casilla de los administradores.
 *
 * Tanto el login como el formulario de solicitud usan esta misma validacion
 * para que el protocolo y las reglas de seguridad sean consistentes.
 */

export type ResultadoRecaptcha = { ok: true } | { ok: false; error: string };

/** Debajo de esto Google considera que probablemente sea un bot. */
const SCORE_MINIMO = 0.5;

type AssessmentResponse = {
  tokenProperties?: {
    valid?: boolean;
    invalidReason?: string;
    action?: string;
  };
  riskAnalysis?: {
    score?: number;
  };
};

export async function verificarRecaptcha(
  token: string | undefined,
  accionEsperada: string,
): Promise<ResultadoRecaptcha> {
  const apiKey = process.env.RECAPTCHA_API_KEY;
  const projectId = process.env.RECAPTCHA_PROJECT_ID;

  // Sin credenciales configuradas no se bloquea nada: es el mismo criterio que el
  // login, y permite trabajar en dev sin claves de Google.
  if (!apiKey || !projectId) {
    return { ok: true };
  }

  if (!token) {
    return { ok: false, error: "reCAPTCHA requerido" };
  }

  try {
    const res = await fetch(
      `https://recaptchaenterprise.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/assessments?key=${encodeURIComponent(apiKey)}`,
      {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: {
          token,
          siteKey: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
          expectedAction: accionEsperada,
        },
      }),
      cache: "no-store",
      },
    );

    const data: AssessmentResponse = await res.json();
    const tokenProperties = data.tokenProperties;
    const score = data.riskAnalysis?.score;

    // La accion se compara a proposito: un token sacado de otro formulario del
    // mismo sitio es valido para Google pero no sirve para este.
    if (
      !res.ok ||
      !tokenProperties?.valid ||
      tokenProperties.action !== accionEsperada ||
      (typeof score === "number" && score < SCORE_MINIMO)
    ) {
      console.warn("[recaptcha] verificacion fallida", {
        tokenProperties,
        riskAnalysis: data.riskAnalysis,
      });
      return { ok: false, error: "Validacion de seguridad fallida" };
    }

    return { ok: true };
  } catch (error) {
    console.error("[recaptcha] no se pudo verificar", error);
    return { ok: false, error: "No se pudo validar reCAPTCHA" };
  }
}
