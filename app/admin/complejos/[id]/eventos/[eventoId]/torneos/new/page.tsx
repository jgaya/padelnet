import { notFound } from "next/navigation";
import { getEventoById } from "@/actions/eventos";
import TorneoForm from "@/app/admin/complejos/[id]/eventos/[eventoId]/torneos/components/TorneoForm";

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

  return <TorneoForm complejoId={complejoId} eventoId={parsedEventoId} />;
}
