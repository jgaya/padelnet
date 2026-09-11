import { notFound } from "next/navigation";

import { getEstadoAvanceTorneo } from "@/actions/torneos-partidos";
import Breadcrumbs from "@/components/Breadcrumbs";
import { migasGestion } from "@/lib/breadcrumbs-gestion";

import AvanceTorneoPanel from "../../components/AvanceTorneoPanel";
import ResultadosPageClient from "./ResultadosPageClient";

export default async function ResultadosPage(props: {
  params: Promise<{ id: string; eventoId: string; torneoId: string }>;
}) {
  const { id, eventoId, torneoId } = await props.params;

  const complejoId = Number(id);
  const parsedEventoId = Number(eventoId);
  const parsedTorneoId = Number(torneoId);

  if (
    !Number.isInteger(complejoId) ||
    complejoId <= 0 ||
    !Number.isInteger(parsedEventoId) ||
    parsedEventoId <= 0 ||
    !Number.isInteger(parsedTorneoId) ||
    parsedTorneoId <= 0
  ) {
    notFound();
  }

  const avance = await getEstadoAvanceTorneo(
    complejoId,
    parsedEventoId,
    parsedTorneoId,
  );

  const migas = await migasGestion({
    complejoId,
    eventoId: parsedEventoId,
    torneoId: parsedTorneoId,
    seccion: "Resultados",
  });

  return (
    <>
      <Breadcrumbs migas={migas} />
      <div className="container p-4 pb-0">
        <AvanceTorneoPanel
          complejoId={complejoId}
          eventoId={parsedEventoId}
          torneoId={parsedTorneoId}
          basePath="/admin/complejos"
          estado={avance}
        />
      </div>
      <ResultadosPageClient />
    </>
  );
}
