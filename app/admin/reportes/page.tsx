import Link from "next/link";
import {
  CalendarDaysIcon,
  NoSymbolIcon,
  UsersIcon,
} from "@heroicons/react/24/solid";

import Breadcrumbs from "@/components/Breadcrumbs";
import TitleBar from "@/components/TitleBar";

/**
 * Indice de reportes de gestion.
 *
 * Hoy hay uno solo, pero el indice existe desde el principio: la alternativa
 * era linkear el menu directo al reporte de inscriptos y despues tener que
 * mover la ruta cuando aparezca el segundo.
 */
const REPORTES = [
  {
    href: "/admin/reportes/inscriptos",
    titulo: "Inscriptos de un torneo",
    descripcion:
      "Parejas titulares y suplentes de un torneo, para imprimir o pasar a planilla. Se exporta a PDF y a CSV.",
    icono: UsersIcon,
  },
  {
    href: "/admin/reportes/horarios",
    titulo: "Horarios de partidos",
    descripcion:
      "Grilla de canchas de un evento, dia por dia, con lugar para anotar el resultado y las firmas. Se exporta a PDF y a CSV.",
    icono: CalendarDaysIcon,
  },
  {
    href: "/admin/reportes/sanciones",
    titulo: "Sanciones disciplinarias",
    descripcion:
      "Sanciones vigentes e historicas de un complejo, con el periodo y los considerandos. Se exporta a PDF y a CSV.",
    icono: NoSymbolIcon,
  },
];

export default function ReportesPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <Breadcrumbs
        migas={[{ label: "Panel", href: "/admin" }, { label: "Reportes" }]}
      />

      <TitleBar title="Reportes" />

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTES.map((reporte) => (
          <li key={reporte.href}>
            <Link
              href={reporte.href}
              className="flex h-full flex-col gap-2 rounded-2xl border border-content/10 bg-surface p-5 transition hover:border-padel-green/40 hover:shadow-[var(--shadow-md)]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-padel-green/15 text-padel-green">
                <reporte.icono className="h-5 w-5" />
              </span>
              <span className="font-semibold text-content">
                {reporte.titulo}
              </span>
              <span className="text-sm text-content/70">
                {reporte.descripcion}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
