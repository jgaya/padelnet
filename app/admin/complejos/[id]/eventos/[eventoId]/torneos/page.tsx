import { notFound } from "next/navigation";
import { getEventoById } from "@/actions/eventos";
import TorneosPageClient from "@/app/admin/complejos/[id]/eventos/[eventoId]/torneos/components/TorneosPageClient";

import Breadcrumbs from "@/components/Breadcrumbs";
import { migasGestion } from "@/lib/breadcrumbs-gestion";

export default async function TorneosPage(props: {
  params: Promise<{ id: string; eventoId: string }>;
}) {
  const { params } = props;
  const { id, eventoId } = await params;

  const complejoId = Number(id);
  const parsedEventoId = Number(eventoId);

  if (!Number.isInteger(complejoId) || complejoId <= 0) {
    notFound();
  }

  if (!Number.isInteger(parsedEventoId) || parsedEventoId <= 0) {
    notFound();
  }

  const evento = await getEventoById(complejoId, parsedEventoId).catch(
    () => null,
  );
  if (!evento) {
    notFound();
  }

  const migas = await migasGestion({
    complejoId,
    eventoId: parsedEventoId,
    seccion: "Torneos",
  });

  return (
    <>
      <Breadcrumbs migas={migas} />
      <TorneosPageClient
        complejoId={complejoId}
        eventoId={parsedEventoId}
        eventoNombre={evento.nombre}
      />
    </>
  );
}
