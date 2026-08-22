import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { esSuperadmin } from "@/lib/authz";

/**
 * Estas pantallas leen la sesion y filtran por querystring (useSearchParams),
 * asi que no tiene sentido prerenderizarlas en el build: sin esto Next intenta
 * generarlas estaticas y falla con "should be wrapped in a suspense boundary".
 */
export const dynamic = "force-dynamic";

export default async function AdminComplejosLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!(await esSuperadmin())) {
    notFound();
  }

  return <>{children}</>;
}
