import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getSessionRole } from "@/lib/authz";
import { hasRole } from "@/lib/roles";

export default async function UsuariosLayout({
  children,
}: {
  children: ReactNode;
}) {
  const role = await getSessionRole();

  if (!hasRole(role, ["superadmin"])) {
    notFound();
  }

  return <>{children}</>;
}
