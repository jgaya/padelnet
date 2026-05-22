import { notFound } from "next/navigation";
import { getTorneoById } from "@/actions/torneos";
import TorneoForm from "@/app/admin/complejos/[id]/eventos/[eventoId]/torneos/components/TorneoForm";

function toDateTimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

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

export default async function EditTorneoPage(props: {
  params: Promise<{ id: string; eventoId: string; torneoId: string }>;
}) {
  const { params } = props;
  const { id, eventoId, torneoId } = await params;

  const complejoId = Number(id);
  const parsedEventoId = Number(eventoId);
  const parsedTorneoId = Number(torneoId);

  if (!Number.isInteger(complejoId) || complejoId <= 0) {
    notFound();
  }

  if (!Number.isInteger(parsedEventoId) || parsedEventoId <= 0) {
    notFound();
  }

  if (!Number.isInteger(parsedTorneoId) || parsedTorneoId <= 0) {
    notFound();
  }

  const torneo = await getTorneoById(
    complejoId,
    parsedEventoId,
    parsedTorneoId,
  ).catch(() => null);

  if (!torneo) {
    notFound();
  }

  return (
    <TorneoForm
      complejoId={complejoId}
      eventoId={parsedEventoId}
      initialData={{
        nombre: torneo.nombre,
        comentario: torneo.comentario || "",
        imagenUrl: torneo.imagenUrl || "",
        valorInsc: torneo.valorInsc || "",
        sexo: torneo.sexo,
        categoriaRegla: torneo.categoriaRegla,
        categoriaN: torneo.categoriaN ? String(torneo.categoriaN) : "",
        capacidad: String(torneo.capacidad),
        jugxZona: String(torneo.jugxZona ?? 3),
        status: torneo.status,
        publicado: torneo.publicado,
        zonaCerrada: torneo.zonaCerrada,
        inicio: toDateTimeLocal(torneo.inicio),
        fin: toDateTimeLocal(torneo.fin),
      }}
      isEdit={parsedTorneoId}
    />
  );
}
