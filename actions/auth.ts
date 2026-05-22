"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, decrypt, deleteSession } from "@/lib/session";
import type { UserRole } from "@/lib/roles";

export type LoginInput = {
  email: string;
  password: string;
  recaptchaToken?: string;
};

export type LoginResult = {
  success: boolean;
  error?: string;
};

export type RegisterInput = {
  name: string;
  lastname: string;
  email: string;
  password: string;
  dni: string;
  birthDate: string;
  categoria: string;
  genero?: "M" | "F" | "X";
};

export type RegisterResult = {
  success: boolean;
  error?: string;
};

function mapPlatformRoleToUserRole(platformRole: string): UserRole {
  switch (platformRole) {
    case "SUPERADMIN":
      return "superadmin";
    case "SUPPORT":
      return "admin";
    case "USER":
    default:
      return "jugador";
  }
}

async function verifyRecaptchaToken(recaptchaToken?: string) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;

  // Si no existe secreto configurado, no bloqueamos el login.
  if (!secret) {
    return { ok: true };
  }

  if (!recaptchaToken) {
    return { ok: false, error: "reCAPTCHA requerido" };
  }

  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        secret,
        response: recaptchaToken,
      }),
      cache: "no-store",
    });

    const dataCaptcha: {
      success?: boolean;
      action?: string;
      score?: number;
    } = await res.json();

    if (
      !dataCaptcha.success ||
      dataCaptcha.action !== "login" ||
      (typeof dataCaptcha.score === "number" && dataCaptcha.score < 0.5)
    ) {
      console.warn("reCAPTCHA failed:", dataCaptcha);
      return { ok: false, error: "Validacion de seguridad fallida" };
    }

    return { ok: true };
  } catch (error) {
    console.error("reCAPTCHA verify error:", error);
    return { ok: false, error: "No se pudo validar reCAPTCHA" };
  }
}

function parseBirthDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export async function login(input: LoginInput): Promise<LoginResult> {
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  try {
    const captchaResult = await verifyRecaptchaToken(input.recaptchaToken);
    if (!captchaResult.ok) {
      return { success: false, error: captchaResult.error };
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        name: true,
        lastname: true,
        genero: true,
        categoria: true,
        avatarUrl: true,
        imageUrl: true,
        dni: true,
        platformRole: true,
        isActive: true,
        deletedAt: true,
      },
    });

    if (!user || !user.passwordHash || user.deletedAt || !user.isActive) {
      return { success: false, error: "Usuario o contrasena incorrectos" };
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return { success: false, error: "Usuario o contrasena incorrectos" };
    }

    const role = mapPlatformRoleToUserRole(user.platformRole);

    await createSession(
      user.id,
      user.email,
      role,
      user.name,
      user.lastname,
      user.categoria ?? "",
      user.genero,
      user.avatarUrl ?? user.imageUrl ?? "",
      user.dni ?? undefined,
    );

    return { success: true };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: "No se pudo iniciar sesion" };
  }
}

export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  const name = input.name.trim();
  const lastname = input.lastname.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const dni = input.dni.trim();
  const categoria = input.categoria.trim();
  const birthDate = parseBirthDate(input.birthDate.trim());

  if (!name || !lastname || !email || !password || !dni || !categoria || !birthDate) {
    return { success: false, error: "Faltan campos obligatorios" };
  }

  if (password.length < 6) {
    return { success: false, error: "La contrasena debe tener al menos 6 caracteres" };
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        deletedAt: true,
      },
    });

    if (existingUser && !existingUser.deletedAt) {
      return { success: false, error: "Ya existe un usuario con ese email" };
    }

    if (existingUser?.deletedAt) {
      return {
        success: false,
        error: "Este email corresponde a una cuenta eliminada. Contacte soporte.",
      };
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        name,
        lastname,
        email,
        passwordHash,
        dni,
        birthDate,
        genero: input.genero ?? "X",
        categoria,
        platformRole: "USER",
        isActive: true,
      },
      select: { id: true },
    });

    return { success: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const rawTarget = error.meta?.target as string[] | string | undefined;
      const fields = Array.isArray(rawTarget)
        ? rawTarget.join(", ")
        : typeof rawTarget === "string"
          ? rawTarget
          : "";

      if (fields.includes("dni")) {
        return { success: false, error: "Ya existe un usuario con ese DNI" };
      }

      return { success: false, error: "Ya existe un usuario con ese email" };
    }

    console.error("Register error:", error);
    return { success: false, error: "No se pudo crear la cuenta" };
  }
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}

export async function getSessionServer() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  const session = await decrypt(sessionCookie);
  return session ?? null;
}

export async function getCurrentUser() {
  const session = await getSessionServer();
  if (!session) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        lastname: true,
        email: true,
        avatarUrl: true,
        imageUrl: true,
        platformRole: true,
        genero: true,
        categoria: true,
        telefono: true,
        dni: true,
        isActive: true,
      },
    });
    return user;
  } catch (error) {
    console.error("Error fetching current user:", error);
    return null;
  }
}
