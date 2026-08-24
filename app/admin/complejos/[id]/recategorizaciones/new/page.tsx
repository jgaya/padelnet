import { notFound } from "next/navigation";

import Breadcrumbs from "@/components/Breadcrumbs";
import { migasGestion } from "@/lib/breadcrumbs-gestion";
import RecategorizacionForm from "./components/RecategorizacionForm";

export const dynamic = "force-dynamic";

export default async function NewRecategorizacionPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const complejoId = Number(id);

  if (!Number.isInteger(complejoId) || complejoId <= 0) {
    notFound();
  }

  const migas = await migasGestion({
    complejoId,
    seccion: "Nueva recategorizacion",
  });

  return (
    <>
      <Breadcrumbs migas={migas} />
      <RecategorizacionForm complejoId={complejoId} />
    </>
  );
}
