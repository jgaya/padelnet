import "server-only";

import { getSession } from "@/lib/session";
import type { UserRole } from "@/lib/roles";

export async function getSessionRole(): Promise<UserRole | null> {
  const session = await getSession();
  return session?.type ?? null;
}
