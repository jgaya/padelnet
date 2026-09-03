"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@/lib/generated/prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { enviarConfirmacionDeRegistro } from "@/actions/email";
import { createSession, decrypt, deleteSession } from "@/lib/session";
import { normalizarProvincia } from "@/lib/ubicaciones";
import { verificarRecaptcha } from "@/lib/recaptcha";
import { ACCION_LOGIN } from "@/lib/recaptcha-acciones";
import { fechaNacimientoEnRango } from "@/lib/fecha-nacimiento";

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
  provincia?: string;
  localidad?: string;
  genero?: "M" | "F" | "X";
};

export type RegisterResult = {
  success: boolean;
  error?: string;
};

function parseBirthDate(value: string) {
  if (!fechaNacimientoEnRango(value)) {
    return null;
  }

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
    const captchaResult = await verificarRecaptcha(
      input.recaptchaToken,
      ACCION_LOGIN,
    );
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
      return { success: false, error: "Usuario o contraseña incorrectos" };
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return { success: false, error: "Usuario o contraseña incorrectos" };
    }

    // No se calcula ningun rol global: el rol dentro de cada complejo se
    // resuelve contra la DB en cada request (lib/authz.ts). Lo unico que se
    // cachea es si administra algun complejo, y solo para pintar el menu.
    const membershipAdmin = await prisma.complejoMembership.findFirst({
      where: {
        userId: user.id,
        isActive: true,
        role: "ADMIN",
        complejo: {
          deletedAt: null,
          isActive: true,
        },
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

    return { success: true };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: "No se pudo iniciar sesion" };
  }
}

export async function registerUser(
  input: RegisterInput,
): Promise<RegisterResult> {
  const name = input.name.trim();
  const lastname = input.lastname.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const dni = input.dni.trim();
  const categoria = input.categoria.trim();
  // La provincia se normaliza contra las 24 de lib/ubicaciones: si llega algo
  // que no esta en la lista, se guarda null en lugar de basura.
  const provincia = normalizarProvincia(input.provincia);
  const localidad = input.localidad?.trim() || null;
  const birthDate = parseBirthDate(input.birthDate.trim());

  if (
    !name ||
    !lastname ||
    !email ||
    !password ||
    !dni ||
    !categoria ||
    !birthDate
  ) {
    return { success: false, error: "Faltan campos obligatorios" };
  }

  if (password.length < 6) {
    return {
      success: false,
      error: "La contraseña debe tener al menos 6 caracteres",
    };
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
        error:
          "Este email corresponde a una cuenta eliminada. Contacte soporte.",
      };
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const creado = await prisma.user.create({
      data: {
        name,
        lastname,
        email,
        passwordHash,
        dni,
        birthDate,
        genero: input.genero ?? "X",
        categoria,
        provincia,
        localidad,
        platformRole: "USER",
        isActive: true,
      },
      select: { id: true },
    });

    // El mail de confirmacion no puede voltear el alta: si falla, la cuenta ya
    // existe y el usuario puede pedir el reenvio desde /confirmar-email.
    await enviarConfirmacionDeRegistro(creado.id);

    return { success: true };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
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
