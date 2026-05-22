import { notFound } from "next/navigation";
import { getEventoById } from "@/actions/eventos";
import TorneosPageClient from "@/app/admin/complejos/[id]/eventos/[eventoId]/torneos/components/TorneosPageClient";

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

  return (
    <TorneosPageClient
      complejoId={complejoId}
      eventoId={parsedEventoId}
      eventoNombre={evento.nombre}
    />
  );
}
