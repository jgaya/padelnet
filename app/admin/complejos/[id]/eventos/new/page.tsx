import { notFound } from "next/navigation";
import EventoForm from "@/app/admin/complejos/[id]/eventos/components/EventoForm";

import Breadcrumbs from "@/components/Breadcrumbs";
import { migasGestion } from "@/lib/breadcrumbs-gestion";

export default async function NewEventoPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { params } = props;
  const { id } = await params;

  const complejoId = Number(id);
  if (!Number.isInteger(complejoId) || complejoId <= 0) {
    notFound();
  }

  const migas = await migasGestion({ complejoId, seccion: "Nuevo evento" });

  return (
    <>
      <Breadcrumbs migas={migas} />
      <EventoForm
        complejoId={complejoId}
        backURL={`/admin/complejos/${complejoId}/eventos`}
      />
    </>
  );
}
