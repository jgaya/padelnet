import { notFound } from "next/navigation";
import { getEventoById } from "@/actions/eventos";
import EventoForm from "@/app/admin/complejos/[id]/eventos/components/EventoForm";

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (num: number) => String(num).padStart(2, "0");

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default async function EditEventoPage(props: {
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
    <EventoForm
      complejoId={complejoId}
      initialData={{
        nombre: evento.nombre,
        descripcion: evento.descripcion || "",
        posterUrl: evento.posterUrl || "",
        tipo: evento.tipo,
        inicio: toDateTimeLocal(evento.inicio),
        fin: toDateTimeLocal(evento.fin),
        isOpen: evento.isOpen,
        isVisible: evento.isVisible,
        isFinished: evento.isFinished,
      }}
      isEdit={parsedEventoId}
    />
  );
}
