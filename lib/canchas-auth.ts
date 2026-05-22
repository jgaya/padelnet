import "server-only";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export type CanchaAccessScope = {
  userId: number;
  isSuperadmin: boolean;
  allowedComplejoIds: number[];
};

export async function getCanchaAccessScope(): Promise<CanchaAccessScope> {
  const session = await getSession();

  if (!session) {
    throw new Error("No autorizado");
  }

  if (session.type === "superadmin") {
    return {
      userId: session.userId,
      isSuperadmin: true,
      allowedComplejoIds: [],
    };
  }

  if (session.type !== "admin") {
    throw new Error("No autorizado");
  }

  const memberships = await prisma.complejoMembership.findMany({
    where: {
      userId: session.userId,
      isActive: true,
      role: { in: ["OWNER", "ADMIN"] },
      complejo: {
        deletedAt: null,
        isActive: true,
      },
    },
    select: { complejoId: true },
  });

  const allowedComplejoIds = Array.from(
    new Set(memberships.map((membership) => membership.complejoId)),
  );

  if (allowedComplejoIds.length === 0) {
    throw new Error("No autorizado");
  }

  return {
    userId: session.userId,
    isSuperadmin: false,
    allowedComplejoIds,
  };
}

export async function canAccessCanchas(): Promise<boolean> {
  try {
    await getCanchaAccessScope();
    return true;
  } catch {
    return false;
  }
}
