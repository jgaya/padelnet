import Breadcrumbs from "@/components/Breadcrumbs";
import TitleBar from "@/components/TitleBar";
import { datosReporteHorarios } from "@/actions/reportes";

import SelectorEvento from "../components/SelectorEvento";
import ReporteHorariosView from "./components/ReporteHorarios";

/**
 * Horarios de partidos de un evento: la planilla de mesa de control.
 *
 * Es por evento y no por torneo porque lo que se imprime y se cuelga es la
 * grilla de canchas de la fecha, que cruza todos los torneos que juegan ese
 * fin de semana.
 *
 * El guard de acceso ya lo puso app/admin/layout.tsx; que el evento pedido sea
 * de un complejo que este usuario administra lo verifica
 * `datosReporteHorarios`, que devuelve null si no.
 */
export default async function ReporteHorariosPage({
  searchParams,
}: {
  searchParams: Promise<{ eventoId?: string }>;
}) {
  const { eventoId } = await searchParams;
  const id = Number(eventoId);

  const reporte =
    Number.isInteger(id) && id > 0 ? await datosReporteHorarios(id) : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <Breadcrumbs
        migas={[
          { label: "Panel", href: "/admin" },
          { label: "Reportes", href: "/admin/reportes" },
          { label: "Horarios" },
        ]}
      />

      <TitleBar title="Horarios de partidos" />

      <div className="mb-6">
        <SelectorEvento
          seleccionado={
            reporte
              ? { id: reporte.evento.id, etiqueta: reporte.evento.nombre }
              : null
          }
        />
      </div>

      {reporte ? (
        <ReporteHorariosView reporte={reporte} />
      ) : (
        <p className="rounded-2xl border border-content/10 bg-surface py-14 text-center text-sm text-content/60">
          {eventoId
            ? "No encontramos ese evento entre los complejos que administras."
            : "Elegi un evento para ver los horarios de sus partidos."}
        </p>
      )}
    </div>
  );
}
