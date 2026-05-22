import { notFound } from "next/navigation";
import EventoForm from "@/app/complejos/[id]/eventos/components/EventoForm";

export default async function NewEventoPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { params } = props;
  const { id } = await params;

  const complejoId = Number(id);
  if (!Number.isInteger(complejoId) || complejoId <= 0) {
    notFound();
  }

  return <EventoForm complejoId={complejoId} />;
}
