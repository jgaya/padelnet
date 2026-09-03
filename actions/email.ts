"use server";

import bcrypt from "bcryptjs";

import {
  enviarMailConfirmacion,
  enviarMailRecuperacion,
  generarToken,
  vencimientoToken,
} from "@/lib/email";
import { enTransaccion, prisma } from "@/lib/prisma";

export type ConfirmarEmailResult =
  | { success: true; yaEstaba: boolean }
  | { success: false; motivo: "SIN_TOKEN" | "INVALIDO" | "VENCIDO" | "ERROR" };

export type ReenviarConfirmacionResult = {
  success: boolean;
  /** Solo en dev, cuando no hay Resend configurado: el link para copiar. */
  url?: string;
  error?: string;
};

/**
 * Emite un token de un solo uso.
 *
 * Se invalidan los previos del mismo proposito: si alguien pide el link tres
 * veces, solo el ultimo tiene que servir.
 */
async function emitirToken(
  userId: number,
  purpose: "VERIFICACION" | "RESET_PASSWORD",
) {
  const token = generarToken();

  await prisma.$transaction([
    // Solo se invalidan los del mismo proposito: pedir un reset no tiene por que
    // tumbar un link de verificacion que la persona todavia no uso.
    prisma.emailVerification.updateMany({
      where: { userId, purpose, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.emailVerification.create({
      data: { userId, token, purpose, expiresAt: vencimientoToken() },
    }),
  ]);

  return token;
}

async function emitirTokenYEnviar(user: {
  id: number;
  email: string;
  name: string;
}) {
  const token = await emitirToken(user.id, "VERIFICACION");

  return enviarMailConfirmacion({
    email: user.email,
    nombre: user.name,
    token,
  });
}

/** Se llama desde el registro. Un fallo de mail no puede voltear el alta. */
export async function enviarConfirmacionDeRegistro(userId: number) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, emailVerified: true },
    });

    if (!user || user.emailVerified) return { success: true };

    await emitirTokenYEnviar(user);
    return { success: true };
  } catch (error) {
    console.error("enviarConfirmacionDeRegistro error:", error);
    return { success: false };
  }
}

/**
 * Confirma el email a partir del token del link.
 *
 * Se distingue "no existe" de "vencido" para poder ofrecerle al usuario el
 * reenvio con un mensaje que tenga sentido.
 */
export async function confirmarEmail(
  token: string,
): Promise<ConfirmarEmailResult> {
  const limpio = token?.trim();
  if (!limpio) {
    return { success: false, motivo: "SIN_TOKEN" };
  }

  try {
    const registro = await prisma.emailVerification.findUnique({
      where: { token: limpio },
      select: {
        id: true,
        userId: true,
        purpose: true,
        expiresAt: true,
        usedAt: true,
        user: { select: { emailVerified: true } },
      },
    });

    // Un token de reset de contraseña no sirve para confirmar el mail.
    if (!registro || registro.purpose !== "VERIFICACION") {
      return { success: false, motivo: "INVALIDO" };
    }

    // Reabrir el link despues de confirmar no es un error: se avisa que ya
    // estaba hecho en vez de mostrar "token invalido".
    if (registro.user.emailVerified) {
      return { success: true, yaEstaba: true };
    }

    if (registro.usedAt) {
      return { success: false, motivo: "INVALIDO" };
    }

    if (registro.expiresAt <= new Date()) {
      return { success: false, motivo: "VENCIDO" };
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: registro.userId },
        data: { emailVerified: true },
      }),
      prisma.emailVerification.update({
        where: { id: registro.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { success: true, yaEstaba: false };
  } catch (error) {
    console.error("confirmarEmail error:", error);
    return { success: false, motivo: "ERROR" };
  }
}

/**
 * Reenvia el mail de confirmacion.
 *
 * Siempre responde que si, exista o no la cuenta: si contestara distinto se
 * podria usar para averiguar que direcciones estan registradas.
 */
export async function reenviarConfirmacion(
  email: string,
): Promise<ReenviarConfirmacionResult> {
  const limpio = email?.trim().toLowerCase();
  if (!limpio) {
    return { success: false, error: "Ingresa tu email" };
  }

  try {
    const user = await prisma.user.findFirst({
      where: { email: limpio, deletedAt: null },
      select: { id: true, email: true, name: true, emailVerified: true },
    });

    if (!user || user.emailVerified) {
      return { success: true };
    }

    const envio = await emitirTokenYEnviar(user);

    // El link solo se devuelve cuando no hay envio configurado (dev): asi el
    // circuito se puede probar sin cuenta de Resend.
    return envio.enviado ? { success: true } : { success: true, url: envio.url };
  } catch (error) {
    console.error("reenviarConfirmacion error:", error);
    return { success: false, error: "No se pudo reenviar el mail" };
  }
}

// ---------------------------------------------------------------------------
// Recuperacion de contraseña
// ---------------------------------------------------------------------------

export type SolicitarRecuperacionResult = {
  success: boolean;
  /** Solo en dev, cuando no hay Resend configurado: el link para copiar. */
  url?: string;
  error?: string;
};

export type RestablecerPasswordResult =
  | { success: true }
  | {
      success: false;
      motivo: "SIN_TOKEN" | "INVALIDO" | "VENCIDO" | "PASSWORD_CORTA" | "ERROR";
    };

/**
 * Manda el link para elegir una contraseña nueva.
 *
 * Responde que si exista o no la cuenta: contestar distinto permitiria averiguar
 * que direcciones estan registradas.
 */
export async function solicitarRecuperacion(
  email: string,
): Promise<SolicitarRecuperacionResult> {
  const limpio = email?.trim().toLowerCase();
  if (!limpio) {
    return { success: false, error: "Ingresa tu email" };
  }

  try {
    const user = await prisma.user.findFirst({
      where: { email: limpio, deletedAt: null, isActive: true },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return { success: true };
    }

    const token = await emitirToken(user.id, "RESET_PASSWORD");
    const envio = await enviarMailRecuperacion({
      email: user.email,
      nombre: user.name,
      token,
    });

    return envio.enviado ? { success: true } : { success: true, url: envio.url };
  } catch (error) {
    console.error("solicitarRecuperacion error:", error);
    return { success: false, error: "No se pudo enviar el mail" };
  }
}

/** Si el token sirve, sin consumirlo. Lo usa la pagina para decidir que mostrar. */
export async function verificarTokenRecuperacion(
  token: string,
): Promise<RestablecerPasswordResult> {
  const limpio = token?.trim();
  if (!limpio) return { success: false, motivo: "SIN_TOKEN" };

  const registro = await prisma.emailVerification.findUnique({
    where: { token: limpio },
    select: { purpose: true, usedAt: true, expiresAt: true },
  });

  if (!registro || registro.purpose !== "RESET_PASSWORD" || registro.usedAt) {
    return { success: false, motivo: "INVALIDO" };
  }

  if (registro.expiresAt <= new Date()) {
    return { success: false, motivo: "VENCIDO" };
  }

  return { success: true };
}

/**
 * Cambia la contraseña a partir del token del mail.
 *
 * El token se valida y se consume **en la misma operacion que el cambio**, y el
 * usuario sale del propio token: la pagina nunca ve ni manda un userId. Es la
 * diferencia con la version del organizador, donde el token se validaba al
 * cargar la pagina y despues se llamaba a un `updateUserPass({ id, password })`
 * sin token ni sesion, con lo que cualquiera podia cambiarle la contraseña a
 * cualquiera.
 */
export async function restablecerPassword(
  token: string,
  password: string,
): Promise<RestablecerPasswordResult> {
  const limpio = token?.trim();
  if (!limpio) return { success: false, motivo: "SIN_TOKEN" };

  if (!password || password.length < 6) {
    return { success: false, motivo: "PASSWORD_CORTA" };
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    return await enTransaccion(async (tx) => {
      const registro = await tx.emailVerification.findUnique({
        where: { token: limpio },
        select: {
          id: true,
          userId: true,
          purpose: true,
          usedAt: true,
          expiresAt: true,
        },
      });

      if (!registro || registro.purpose !== "RESET_PASSWORD" || registro.usedAt) {
        return { success: false as const, motivo: "INVALIDO" as const };
      }

      if (registro.expiresAt <= new Date()) {
        return { success: false as const, motivo: "VENCIDO" as const };
      }

      // El consumo va con filtro por usedAt: si dos pedidos entran a la vez,
      // solo uno cambia la contraseña.
      const { count } = await tx.emailVerification.updateMany({
        where: { id: registro.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      if (count === 0) {
        return { success: false as const, motivo: "INVALIDO" as const };
      }

      await tx.user.update({
        where: { id: registro.userId },
        data: {
          passwordHash,
          // Entro al link que le mandamos a esa direccion: es la misma prueba
          // que pide la verificacion, asi que no se la volvemos a pedir.
          emailVerified: true,
        },
      });

      return { success: true as const };
    });
  } catch (error) {
    console.error("restablecerPassword error:", error);
    return { success: false, motivo: "ERROR" };
  }
}
