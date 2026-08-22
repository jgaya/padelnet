import { notFound } from "next/navigation";

import Breadcrumbs from "@/components/Breadcrumbs";
import { migasGestion } from "@/lib/breadcrumbs-gestion";

import PartidosPageClient from "./PartidosPageClient";

export default async function PartidosPage(props: {
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

  const migas = await migasGestion({
    complejoId,
    eventoId: parsedEventoId,
    torneoId: parsedTorneoId,
    seccion: "Partidos",
  });

  return (
    <>
      <Breadcrumbs migas={migas} />
      <PartidosPageClient />
    </>
  );
}
