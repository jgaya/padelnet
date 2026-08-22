import "server-only";
import { cookies } from "next/headers";
import { JWTPayload, SignJWT, jwtVerify } from "jose";
import type { PlatformRole } from "@/lib/roles";

const secretKey =
  process.env.SESSION_SECRET || "your-secret-key-change-this-in-production";
const encodedKey = new TextEncoder().encode(secretKey);

/**
 * Lo que viaja en la cookie de sesion.
 *
 * A proposito NO hay un rol global unico: un usuario puede administrar un
 * complejo y ser jugador en otro. El rol dentro de un complejo se resuelve
 * siempre contra la DB con lib/authz.ts (`getRolEnComplejo` /
 * `requireComplejoRole`), nunca desde aca.
 */
export interface SessionPayload {
  userId: number;
  email: string;
  name: string;
  lastname: string;
  categoria: string;
  genero: string;
  image: string;
  dni?: string;
  /** USER = jugador. Lo unico global que existe. */
  platformRole: PlatformRole;
  /**
   * Atajo para decidir si se pinta el menu de gestion. **No autoriza nada**:
   * puede quedar desactualizado hasta que expire el token, y lo peor que pasa
   * es que se vea un item de menu que despues da 404.
   */
  esAdminDeComplejo: boolean;
  expiresAt: Date;
}

/** Datos que hacen falta para emitir una sesion. */
export type NuevaSesion = Omit<SessionPayload, "expiresAt">;

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);
}

/**
 * Las sesiones emitidas antes de unificar los roles traen `type` y no
 * `platformRole`. Se las trata como invalidas para que el usuario vuelva a
 * entrar, en vez de quedar con una sesion a medias.
 */
function esPayloadVigente(payload: unknown): payload is SessionPayload {
  if (!payload || typeof payload !== "object") return false;
  const candidato = payload as Partial<SessionPayload>;
  return (
    typeof candidato.userId === "number" &&
    (candidato.platformRole === "USER" ||
      candidato.platformRole === "SUPERADMIN")
  );
}

export async function decrypt(session: string | undefined = "") {
  try {
    if (!session) return null;
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ["HS256"],
    });

    if (!esPayloadVigente(payload)) return null;

    return payload as unknown as SessionPayload;
  } catch (error) {
    console.log(`Failed to verify session: ${error}`);
    return null;
  }
}

export async function createSession(datos: NuevaSesion) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await encrypt({ ...datos, expiresAt });

  const cookieStore = await cookies();
  cookieStore.set("session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;

  if (!session) return null;

  return await decrypt(session);
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}

export async function updateSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const payload = await decrypt(session);

  if (!session || !payload) {
    return null;
  }

  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  cookieStore.set("session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expires,
    sameSite: "lax",
    path: "/",
  });
}
