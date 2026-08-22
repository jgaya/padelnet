import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { administraAlgunComplejo } from "@/lib/authz";

/**
 * Puerta de entrada a todo /admin.
 *
 * Alcanza con administrar algun complejo: sobre cual se puede actuar lo decide
 * cada pantalla con requireComplejoRole. Antes el guard vivia solo en
 * app/admin/complejos/layout.tsx, asi que /admin/eventos y /admin/torneos se
 * renderizaban para cualquiera (vacias, porque las actions si cortaban, pero
 * la pantalla igual cargaba).
 *
 * force-dynamic porque estas pantallas leen la sesion y filtran por querystring
 * (useSearchParams): prerenderizarlas en el build no aporta nada y ademas falla
 * con "should be wrapped in a suspense boundary".
 */
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!(await administraAlgunComplejo())) {
    notFound();
  }

  return <>{children}</>;
}
