import { notFound } from "next/navigation";
import EventoForm from "@/app/admin/complejos/[id]/eventos/components/EventoForm";

export default async function SuperadminNewEventoPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { params } = props;
  const { id } = await params;

  const complejoId = Number(id);
  if (!Number.isInteger(complejoId) || complejoId <= 0) {
    notFound();
  }

  return (
    <EventoForm
      complejoId={complejoId}
      backURL={`/superadmin/complejos/${complejoId}/eventos`}
    />
  );
}
