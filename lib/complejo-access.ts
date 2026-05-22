import "server-only";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export type ComplejoManagerAccess = {
  userId: number;
  complejoId: number;
  isSuperadmin: boolean;
};

export async function ensureComplejoManagerAccess(
  complejoId: number,
): Promise<ComplejoManagerAccess> {
  if (!Number.isInteger(complejoId) || complejoId <= 0) {
    throw new Error("Complejo invalido");
  }

  const session = await getSession();
  if (!session) {
    throw new Error("No autorizado");
  }

  const complejo = await prisma.complejo.findFirst({
    where: {
      id: complejoId,
      deletedAt: null,
      isActive: true,
    },
    select: { id: true },
  });

  if (!complejo) {
    throw new Error("Complejo no encontrado");
  }

  if (session.type === "superadmin") {
    return {
      userId: session.userId,
      complejoId,
      isSuperadmin: true,
    };
  }

  if (session.type !== "admin") {
    throw new Error("No autorizado");
  }

  const membership = await prisma.complejoMembership.findFirst({
    where: {
      userId: session.userId,
      complejoId,
      isActive: true,
      role: { in: ["OWNER", "ADMIN"] },
    },
    select: { id: true },
  });

  if (!membership) {
    throw new Error("No autorizado");
  }

  return {
    userId: session.userId,
    complejoId,
    isSuperadmin: false,
  };
}

export async function canManageComplejo(complejoId: number): Promise<boolean> {
  try {
    await ensureComplejoManagerAccess(complejoId);
    return true;
  } catch {
    return false;
  }
}
