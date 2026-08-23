/**
 * Politica de alta y vinculacion de cuentas de Google.
 *
 * Modulo puro a proposito: no toca prisma ni la sesion. Toda la logica que
 * decide "esta cuenta se crea, se vincula, o se rechaza" vive aca para poder
 * probarla sin un Google de verdad, que es la parte del flujo que no se puede
 * automatizar.
 */

/** Lo que interesa del ID token verificado por Firebase. */
export type ClaimsGoogle = {
  uid: string;
  email?: string;
  emailVerificado?: boolean;
  nombreCompleto?: string;
  nombre?: string;
  apellido?: string;
  foto?: string;
};

/** Lo minimo que hace falta saber de una cuenta que ya existe. */
export type CuentaExistente = {
  id: number;
  emailVerified: boolean;
  deletedAt: Date | null;
  isActive: boolean;
};

export type Vinculacion =
  | { accion: "crear" }
  | { accion: "vincular"; anularPassword: boolean }
  | { accion: "rechazar"; error: string };

/**
 * Nombre y apellido a partir de los claims.
 *
 * Google casi siempre manda given_name/family_name, pero no esta garantizado:
 * si vienen vacios se parte `name` por el primer espacio, y si tampoco hay
 * nombre se usa el local part del mail para no guardar un string vacio (la
 * columna es NOT NULL).
 */
export function nombreDesdeClaims(claims: ClaimsGoogle): {
  name: string;
  lastname: string;
} {
  const nombre = claims.nombre?.trim();
  const apellido = claims.apellido?.trim();

  if (nombre) {
    return { name: nombre, lastname: apellido || "-" };
  }

  const completo = claims.nombreCompleto?.trim();
  if (completo) {
    const [primero, ...resto] = completo.split(/\s+/);
    return { name: primero, lastname: resto.join(" ") || "-" };
  }

  const local = claims.email?.split("@")[0]?.trim();
  return { name: local || "Jugador", lastname: "-" };
}

/**
 * Que hacer cuando alguien entra con Google.
 *
 * El caso interesante es la cuenta existente **sin el mail verificado**: como
 * nunca se probo que ese mail fuera suyo, pudo haberla creado cualquiera con el
 * mail de otro. Google si prueba la titularidad, asi que se vincula, pero se
 * anula la contrasena previa para que quien la haya creado deje de entrar a una
 * cuenta que no es suya. El dueno se fija una nueva por /recuperar.
 */
export function decidirVinculacion(
  existente: CuentaExistente | null,
  claims: ClaimsGoogle,
): Vinculacion {
  if (!claims.email) {
    return {
      accion: "rechazar",
      error: "Tu cuenta de Google no tiene un email asociado",
    };
  }

  if (!claims.emailVerificado) {
    return {
      accion: "rechazar",
      error: "Google no confirmo tu email. Proba con otra cuenta.",
    };
  }

  if (!existente) {
    return { accion: "crear" };
  }

  if (existente.deletedAt) {
    return {
      accion: "rechazar",
      error: "Este email corresponde a una cuenta eliminada. Contacte soporte.",
    };
  }

  if (!existente.isActive) {
    return { accion: "rechazar", error: "Tu cuenta esta deshabilitada" };
  }

  return { accion: "vincular", anularPassword: !existente.emailVerified };
}

/** Los datos propios del sitio que Google no puede aportar. */
export type PerfilParaCompletar = {
  dni: string | null;
  birthDate: Date | null;
  categoria: string | null;
  genero: string;
};

/**
 * Si el usuario ya cargo lo que el sitio necesita.
 *
 * `genero` cuenta como faltante cuando es "X" (el default del schema): sin
 * genero definido el jugador no es elegible para ningun torneo, asi que a los
 * fines practicos el dato no esta.
 */
export function perfilCompleto(perfil: PerfilParaCompletar): boolean {
  return Boolean(
    perfil.dni?.trim() &&
      perfil.birthDate &&
      perfil.categoria?.trim() &&
      perfil.genero !== "X",
  );
}
