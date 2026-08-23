import { notFound } from "next/navigation";

import Dashboard from "@/components/dashboard/Dashboard";
import { getAlcanceComplejos } from "@/lib/authz";
import { getDatosDashboard } from "@/lib/dashboard";

/**
 * Panel del admin: los mismos numeros, pero solo de los complejos que
 * administra. Un superadmin que entre por aca ve todo, que es lo que
 * corresponde segun como quedo definido el acceso.
 *
 * El guard de app/admin/layout.tsx ya exige administrar algun complejo.
 */
export default async function AdminDashboardPage() {
  const alcance = await getAlcanceComplejos();
  if (!alcance) {
    notFound();
  }

  const datos = await getDatosDashboard(alcance);

  const subtitulo =
    alcance.tipo === "todos"
      ? "Todos los complejos de la plataforma."
      : `Datos de ${alcance.complejoIds.length} complejo${alcance.complejoIds.length === 1 ? "" : "s"} que administras.`;

  return (
    <Dashboard
      titulo="Panel"
      subtitulo={subtitulo}
      datos={datos}
      migas={[{ label: "Inicio", href: "/" }, { label: "Panel" }]}
    />
  );
}
