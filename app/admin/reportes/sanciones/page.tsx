import Breadcrumbs from "@/components/Breadcrumbs";
import TitleBar from "@/components/TitleBar";
import { datosReporteSanciones } from "@/actions/reportes";

import SelectorComplejo from "../components/SelectorComplejo";
import ReporteSancionesView from "./components/ReporteSanciones";

export default async function ReporteSancionesPage({
  searchParams,
}: {
  searchParams: Promise<{ complejoId?: string }>;
}) {
  const { complejoId } = await searchParams;
  const id = Number(complejoId);

  const reporte =
    Number.isInteger(id) && id > 0 ? await datosReporteSanciones(id) : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <Breadcrumbs
        migas={[
          { label: "Panel", href: "/admin" },
          { label: "Reportes", href: "/admin/reportes" },
          { label: "Sanciones" },
        ]}
      />

      <TitleBar title="Sanciones disciplinarias" />

      <div className="mb-6">
        <SelectorComplejo
          seleccionado={
            reporte
              ? { id: reporte.complejo.id, etiqueta: reporte.complejo.nombre }
              : null
          }
        />
      </div>

      {reporte ? (
        <ReporteSancionesView reporte={reporte} />
      ) : (
        <p className="rounded-2xl border border-content/10 bg-surface py-14 text-center text-sm text-content/60">
          {complejoId
            ? "No encontramos ese complejo entre los que administras."
            : "Elegi un complejo para ver sus sanciones."}
        </p>
      )}
    </div>
  );
}
