import { notFound } from "next/navigation";
import { getEventoById } from "@/actions/eventos";
import TorneoForm from "@/app/admin/complejos/[id]/eventos/[eventoId]/torneos/components/TorneoForm";

import Breadcrumbs from "@/components/Breadcrumbs";
import { migasGestion } from "@/lib/breadcrumbs-gestion";
import { toDateTimeLocal } from "@/lib/fechas";

export default async function NewTorneoPage(props: {
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
    seccion: "Nuevo torneo",
  });

  return (
    <>
      <Breadcrumbs migas={migas} />
      <TorneoForm
        complejoId={complejoId}
        eventoId={parsedEventoId}
        // Un torneo arranca y termina por defecto junto con su evento; el admin
        // puede correr las fechas desde el form si el torneo tiene otra ventana.
        initialData={{
          inicio: toDateTimeLocal(evento.inicio),
          fin: toDateTimeLocal(evento.fin),
        }}
      />
    </>
  );
}
