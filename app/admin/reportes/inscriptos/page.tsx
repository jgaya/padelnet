import Breadcrumbs from "@/components/Breadcrumbs";
import TitleBar from "@/components/TitleBar";
import { datosReporteInscriptos } from "@/actions/reportes";

import SelectorTorneo from "../components/SelectorTorneo";
import ReporteInscriptosView from "./components/ReporteInscriptos";

/**
 * Reporte de inscriptos de un torneo.
 *
 * El torneo viaja en la querystring, asi el reporte se puede compartir por link
 * y se resuelve del lado del servidor. Sin `torneoId` se muestra solo el
 * buscador.
 *
 * El guard de acceso ya lo puso app/admin/layout.tsx; que el torneo pedido sea
 * de un complejo que este usuario administra lo verifica
 * `datosReporteInscriptos`, que devuelve null si no.
 */
export default async function ReporteInscriptosPage({
  searchParams,
}: {
  searchParams: Promise<{ torneoId?: string }>;
}) {
  const { torneoId } = await searchParams;
  const id = Number(torneoId);

  const reporte =
    Number.isInteger(id) && id > 0 ? await datosReporteInscriptos(id) : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <Breadcrumbs
        migas={[
          { label: "Panel", href: "/admin" },
          { label: "Reportes", href: "/admin/reportes" },
          { label: "Inscriptos" },
        ]}
      />

      <TitleBar title="Inscriptos de un torneo" />

      <div className="mb-6">
        <SelectorTorneo
          seleccionado={
            reporte
              ? {
                  id: reporte.torneo.id,
                  etiqueta: `${reporte.torneo.nombre} — ${reporte.torneo.categoriaCode}`,
                }
              : null
          }
        />
      </div>

      {reporte ? (
        <ReporteInscriptosView reporte={reporte} />
      ) : (
        <p className="rounded-2xl border border-content/10 bg-surface py-14 text-center text-sm text-content/60">
          {torneoId
            ? "No encontramos ese torneo entre los complejos que administras."
            : "Elegi un torneo para ver el listado de inscriptos."}
        </p>
      )}
    </div>
  );
}
