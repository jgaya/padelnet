import { notFound } from "next/navigation";

import Dashboard from "@/components/dashboard/Dashboard";
import { getAlcanceComplejos } from "@/lib/authz";
import { getDatosDashboard } from "@/lib/dashboard";

/**
 * Panel del superadmin: todo el sitio, sin filtrar por complejo.
 *
 * Antes esta ruta era un redirect a /superadmin/usuarios. El guard de
 * app/superadmin/layout.tsx ya exige esSuperadmin(), asi que aca no va otro.
 */
export default async function SuperadminDashboardPage() {
  const alcance = await getAlcanceComplejos();
  if (!alcance || alcance.tipo !== "todos") {
    notFound();
  }

  const datos = await getDatosDashboard(alcance);

  return (
    <Dashboard
      titulo="Panel general"
      subtitulo="Todos los complejos de la plataforma."
      datos={datos}
      migas={[{ label: "Inicio", href: "/" }, { label: "Panel general" }]}
    />
  );
}
