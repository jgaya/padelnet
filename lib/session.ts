import "server-only";
import { cookies } from "next/headers";
import { JWTPayload, SignJWT, jwtVerify } from "jose";
import { UserRole } from "@/lib/roles";

const secretKey =
  process.env.SESSION_SECRET || "your-secret-key-change-this-in-production";
const encodedKey = new TextEncoder().encode(secretKey);

export interface SessionPayload {
  userId: number;
  email: string;
  type: UserRole;
  name: string;
  lastname: string;
  categoria: string;
  expiresAt: Date;
  genero: string;
  image: string;
  dni?: string;
}

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);
}

export async function decrypt(session: string | undefined = "") {
  try {
    if (!session) return null;
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch (error) {
    console.log(`Failed to verify session: ${error}`);
    return null;
  }
}

export async function createSession(
  userId: number,
  email: string,
  type: UserRole,
  name: string,
  lastname: string,
  categoria: string,
  genero: string,
  image: string,
  dni?: string,
) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session = await encrypt({
    userId,
    email,
    type,
    name,
    lastname,
    categoria,
    dni,
    expiresAt,
    genero,
    image,
  });

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
