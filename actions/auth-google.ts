"use server";

import { prisma } from "@/lib/prisma";
import { verificarIdToken } from "@/lib/firebase-admin";
import { createSession } from "@/lib/session";
import {
  decidirVinculacion,
  nombreDesdeClaims,
  perfilCompleto,
  type ClaimsGoogle,
} from "@/lib/google-cuenta";

export type LoginGoogleResult =
  | { success: true; perfilCompleto: boolean }
  | { success: false; error: string };

/** Lo que se guarda en la sesion. Igual que en login(). */
const SELECT_SESION = {
  id: true,
  email: true,
  name: true,
  lastname: true,
  genero: true,
  categoria: true,
  avatarUrl: true,
  imageUrl: true,
  dni: true,
  birthDate: true,
  platformRole: true,
  isActive: true,
  deletedAt: true,
  emailVerified: true,
} as const;

/**
 * Ingreso y alta con Google.
 *
 * El popup lo hace el cliente con Firebase y manda el ID token; aca se verifica
 * y se emite **la sesion propia del sitio**, la misma que usa login(). Firebase
 * resuelve el baile de OAuth y nada mas: no es la fuente de verdad de la sesion.
 *
 * El mail viene verificado por Google, asi que estas cuentas se saltean el
 * circuito de confirmacion por correo (`enviarConfirmacionDeRegistro`).
 */
export async function loginConGoogle(
  idToken: string,
): Promise<LoginGoogleResult> {
  if (!idToken?.trim()) {
    return { success: false, error: "Falta el token de Google" };
  }

  let claims: ClaimsGoogle;

  try {
    const decoded = await verificarIdToken(idToken);

    claims = {
      uid: decoded.uid,
      email: decoded.email?.trim().toLowerCase(),
      emailVerificado: decoded.email_verified,
      nombreCompleto: typeof decoded.name === "string" ? decoded.name : undefined,
      nombre:
        typeof decoded.given_name === "string" ? decoded.given_name : undefined,
      apellido:
        typeof decoded.family_name === "string"
          ? decoded.family_name
          : undefined,
      foto: typeof decoded.picture === "string" ? decoded.picture : undefined,
    };
  } catch (error) {
    console.error("[google] verifyIdToken", error);
    return { success: false, error: "No se pudo validar tu cuenta de Google" };
  }

  try {
    // Primero por uid: el mail se puede cambiar en Google, el uid no.
    const porUid = await prisma.user.findUnique({
      where: { firebaseUid: claims.uid },
      select: SELECT_SESION,
    });

    const existente =
      porUid ??
      (claims.email
        ? await prisma.user.findUnique({
            where: { email: claims.email },
            select: SELECT_SESION,
          })
        : null);

    const decision = decidirVinculacion(existente, claims);

    if (decision.accion === "rechazar") {
      return { success: false, error: decision.error };
    }

    const { name, lastname } = nombreDesdeClaims(claims);

    const user =
      decision.accion === "crear"
        ? await prisma.user.create({
            data: {
              email: claims.email!,
              firebaseUid: claims.uid,
              name,
              lastname,
              // La foto de la cuenta de Google (claims.foto) NO se guarda: no
              // paso por moderacion y `imageUrl` significa "foto aprobada".
              // Quien entra con Google ve sus iniciales hasta que suba una en
              // /perfil y el superadmin la apruebe. Ver model ImagenPerfil.
              // Google ya probo el mail: no hace falta el circuito de
              // confirmacion.
              emailVerified: true,
              platformRole: "USER",
              isActive: true,
            },
            select: SELECT_SESION,
          })
        : await prisma.user.update({
            where: { id: existente!.id },
            data: {
              firebaseUid: claims.uid,
              emailVerified: true,
              // Idem el alta: la foto de Google no se copia. Vincular una
              // cuenta no le cambia el avatar a nadie.
              // Ver decidirVinculacion: la cuenta que nunca verifico el mail
              // pudo haberla creado otro con este mail.
              ...(decision.anularPassword ? { passwordHash: null } : {}),
            },
            select: SELECT_SESION,
          });

    const membershipAdmin = await prisma.complejoMembership.findFirst({
      where: {
        userId: user.id,
        isActive: true,
        role: "ADMIN",
        complejo: { deletedAt: null, isActive: true },
      },
      select: { id: true },
    });

    await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      lastname: user.lastname,
      categoria: user.categoria ?? "",
      genero: user.genero,
      image: user.avatarUrl ?? user.imageUrl ?? "",
      dni: user.dni ?? undefined,
      platformRole: user.platformRole,
      esAdminDeComplejo: Boolean(membershipAdmin),
    });

    return { success: true, perfilCompleto: perfilCompleto(user) };
  } catch (error) {
    console.error("[google] loginConGoogle", error);
    return { success: false, error: "No se pudo iniciar sesion con Google" };
  }
}
